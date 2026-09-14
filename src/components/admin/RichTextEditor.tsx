"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Eraser,
} from "lucide-react";

/**
 * A plain compose box that happens to produce HTML.
 *
 * The composer previously showed the raw markup — `<p>Hi {{first_name}},</p>`
 * — which asked a salesperson to hand-write HTML in order to send an
 * email. This is the box their mail client gives them: type, select,
 * bold, done.
 *
 * Uncontrolled on purpose. A contentEditable whose innerHTML is written
 * back on every keystroke loses the caret on each render; the DOM owns
 * the content while the user types and React is told about it on input,
 * with the initial value set exactly once.
 */

interface Props {
  initialHtml: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

/** Commands that map to the toolbar, in order. */
const TOOLS = [
  { cmd: "bold", icon: Bold, label: "Bold" },
  { cmd: "italic", icon: Italic, label: "Italic" },
  { cmd: "underline", icon: Underline, label: "Underline" },
  { cmd: "insertUnorderedList", icon: List, label: "Bulleted list" },
  { cmd: "insertOrderedList", icon: ListOrdered, label: "Numbered list" },
] as const;

export default function RichTextEditor({
  initialHtml,
  onChange,
  placeholder,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(false);

  // The last cursor position inside the editor. Pressing a toolbar
  // button moves focus to that button and collapses the selection, so
  // the range has to be captured beforehand and restored — otherwise
  // "bold" applies to nothing, or to the wrong place.
  const savedRange = useRef<Range | null>(null);

  const rememberSelection = useCallback(() => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !ref.current) return;
    const range = selection.getRangeAt(0);
    if (ref.current.contains(range.commonAncestorContainer)) {
      savedRange.current = range.cloneRange();
    }
  }, []);

  const emit = useCallback(() => {
    const html = ref.current?.innerHTML ?? "";
    setEmpty(!ref.current?.textContent?.trim());
    onChange(html);
  }, [onChange]);

  // Initial content, written once. Re-running this on every change
  // would fight the browser for the caret.
  useEffect(() => {
    if (ref.current && !ref.current.innerHTML) {
      ref.current.innerHTML = initialHtml;
      setEmpty(!ref.current.textContent?.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function run(command: string) {
    ref.current?.focus();
    if (savedRange.current) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedRange.current);
    }
    document.execCommand(command, false);
    rememberSelection();
    emit();
  }

  function addLink() {
    const url = window.prompt("Link address", "https://");
    if (!url || !/^https?:\/\//i.test(url)) return;
    run("createLink");
    // createLink needs the URL as its argument; run() cannot pass one.
    document.execCommand("createLink", false, url);
    emit();
  }

  /**
   * Paste as plain text.
   *
   * Pasting from Word or a web page carries fonts, colours and nested
   * tables that bloat the message and read as machine-generated to spam
   * filters. The text is what was wanted; the styling never is.
   */
  function onPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    emit();
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-800 px-3 py-1.5">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.cmd}
              type="button"
              title={tool.label}
              // onMouseDown, not onClick: the default mousedown would
              // blur the editor and destroy the selection before the
              // command could apply to it.
              onMouseDown={(e) => {
                e.preventDefault();
                run(tool.cmd);
              }}
              className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
        <button
          type="button"
          title="Insert link"
          onMouseDown={(e) => {
            e.preventDefault();
            rememberSelection();
            addLink();
          }}
          className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          title="Clear formatting"
          onMouseDown={(e) => {
            e.preventDefault();
            run("removeFormat");
          }}
          className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-100"
        >
          <Eraser className="h-4 w-4" />
        </button>
      </div>

      <div className="relative">
        {empty && placeholder && (
          <span className="pointer-events-none absolute left-4 top-3 text-sm text-zinc-600">
            {placeholder}
          </span>
        )}
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Message body"
          onInput={() => {
            rememberSelection();
            emit();
          }}
          onKeyUp={rememberSelection}
          onMouseUp={rememberSelection}
          onBlur={rememberSelection}
          onPaste={onPaste}
          className="min-h-[320px] w-full px-4 py-3 text-sm leading-relaxed text-zinc-100 outline-none [&_a]:text-emerald-400 [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-2 [&_ul]:list-disc"
        />
      </div>
    </div>
  );
}
