/**
 * key-pool.ts — a rate-limit-aware scheduler for several API keys.
 *
 * Replaces fixed round-robin ("worker N always uses key N"). Every
 * request asks the pool for a key at the moment it is about to be sent,
 * and the pool hands out whichever key is best *right now*:
 *
 *   - Each key has a sliding 60-second window capped at `rpm` requests
 *     (NVIDIA allows 40/min per key). A request is only released when
 *     some key has room, so the limit is respected by construction
 *     instead of discovered by getting 429s.
 *   - The key with the most headroom wins, so load levels itself across
 *     keys and a fast key naturally takes more work than a slow one.
 *   - A key that returns 429 anyway goes on cooldown (escalating, reset
 *     by its next success) and the retry goes to a *different* key
 *     immediately rather than sleeping.
 *   - A key that returns 401/403 is dead for the rest of the run — it is
 *     dropped, reported once, and the others carry on.
 *   - Retries count against the window like any other request (the SDK's
 *     own hidden retries are switched off for this reason).
 */

import OpenAI from "openai";

interface KeyState {
  label: string;
  client: OpenAI;
  /** Start times (ms) of requests in the last 60 s. */
  window: number[];
  cooldownUntil: number;
  /** Earliest time the next request may go out — enforces even spacing. */
  nextSlot: number;
  strikes: number;
  dead: boolean;
  ok: number;
  rateLimited: number;
  failed: number;
}

export interface KeySlot {
  index: number;
  label: string;
  client: OpenAI;
}

const WINDOW_MS = 60_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class KeyPool {
  private keys: KeyState[];
  private limit: number;
  /** Gap between consecutive requests on one key: 60 s / limit. */
  private spacing: number;

  /**
   * @param rpm    the provider's per-key requests/minute limit
   * @param margin requests kept in reserve under that limit, because
   *               window edges are measured on the provider's clock
   */
  constructor(
    keys: { label: string; apiKey: string }[],
    baseURL: string,
    rpm = 40,
    margin = 2
  ) {
    this.limit = Math.max(1, rpm - margin);
    this.spacing = WINDOW_MS / this.limit;
    this.keys = keys.map((k) => ({
      label: k.label,
      // maxRetries: 0 — the SDK would otherwise retry a 429 by itself,
      // invisibly, outside the window this pool is counting.
      client: new OpenAI({ apiKey: k.apiKey, baseURL, maxRetries: 0 }),
      window: [],
      cooldownUntil: 0,
      nextSlot: 0,
      strikes: 0,
      dead: false,
      ok: 0,
      rateLimited: 0,
      failed: 0,
    }));
  }

  get size(): number {
    return this.keys.length;
  }

  get aliveCount(): number {
    return this.keys.filter((k) => !k.dead).length;
  }

  /** Maximum sustainable requests/minute across every live key. */
  get capacityPerMinute(): number {
    return this.aliveCount * this.limit;
  }

  private prune(k: KeyState, now: number) {
    while (k.window.length && now - k.window[0] >= WINDOW_MS) k.window.shift();
  }

  /**
   * Waits until a key has room, reserves a slot on it and returns it.
   * `avoid` is the set of keys this request already failed on; they are
   * skipped unless nothing else is alive.
   */
  async acquire(avoid: Set<number> = new Set()): Promise<KeySlot> {
    for (;;) {
      const now = Date.now();
      if (this.aliveCount === 0) {
        throw new Error("every API key has been rejected (401/403) — nothing left to send with");
      }

      const consider = (skipAvoided: boolean) => {
        let best = -1;
        let bestUsed = Infinity;
        this.keys.forEach((k, i) => {
          if (k.dead || k.cooldownUntil > now || k.nextSlot > now) return;
          if (skipAvoided && avoid.has(i)) return;
          this.prune(k, now);
          if (k.window.length >= this.limit) return;
          if (k.window.length < bestUsed) {
            best = i;
            bestUsed = k.window.length;
          }
        });
        return best;
      };

      let pick = consider(true);
      // Only fall back to a key this request already failed on when it
      // is the only one alive.
      if (pick === -1 && this.aliveCount <= avoid.size) pick = consider(false);

      if (pick !== -1) {
        const k = this.keys[pick];
        k.window.push(now);
        k.nextSlot = now + this.spacing;
        return { index: pick, label: k.label, client: k.client };
      }

      // Nothing free: sleep until the earliest moment something is.
      let wake = now + 1000;
      for (const k of this.keys) {
        if (k.dead) continue;
        const free = k.window.length >= this.limit ? k.window[0] + WINDOW_MS : now;
        wake = Math.min(wake, Math.max(free, k.cooldownUntil, k.nextSlot, now + 50));
      }
      await sleep(Math.max(50, Math.min(wake - now, 1000)));
    }
  }

  success(index: number) {
    const k = this.keys[index];
    k.ok++;
    k.strikes = 0;
  }

  /**
   * 429: brief cooldown (3 s, doubling to 30 s, cleared by the next
   * success). Kept short on purpose — NVIDIA sheds load on a congested
   * model with 429/503 no matter how well a key is paced, so a 429 is
   * usually "try again in a moment", not "this key is spent".
   */
  rateLimited(index: number) {
    const k = this.keys[index];
    k.rateLimited++;
    k.strikes++;
    k.cooldownUntil = Date.now() + Math.min(3_000 * 2 ** (k.strikes - 1), 30_000);
  }

  /** 401/403: the key is invalid or revoked. Returns true the first time. */
  dead(index: number): boolean {
    const k = this.keys[index];
    const first = !k.dead;
    k.dead = true;
    return first;
  }

  failure(index: number) {
    this.keys[index].failed++;
  }

  labelOf(index: number): string {
    return this.keys[index].label;
  }

  report(): string {
    return this.keys
      .map((k) => {
        const state = k.dead ? "DEAD" : k.cooldownUntil > Date.now() ? "cooling" : "active";
        return `${k.label}: ${k.ok} ok, ${k.rateLimited}× 429, ${k.failed} other — ${state}`;
      })
      .join("\n  ");
  }
}
