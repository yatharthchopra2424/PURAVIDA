# Product images that need fixing before launch

While wiring up product photography this session, I found that some of the
existing images in `public/product_images/` are AI-generated bottle mockups
with **garbled, misspelled, or nonsense label text** — the kind of thing a
buyer notices immediately when they zoom in, and the opposite of the
"authentic, premium" look you asked for.

I checked all 10 of the "-bottle" style images (the ones with a printed
label design, as opposed to plain powder/root photos, which don't have this
problem). Here's the full result:

## ❌ Confirmed broken — replace or regenerate

| File | What's wrong |
|---|---|
| `public/product_images/black-pepper-essential-oil-bottle.png` | Label reads "ESFEWIAL OIL" and "ESENTIAL OIL" (both misspelled), plus a nonsense line "NTINLEH JOLOY COOL" at the bottom |
| `public/product_images/black-pepper-oleoresin-bottle.png` | Brand mark reads "YNEUES" (not a word); the entire description paragraph on the label is complete gibberish, not real sentences |
| `public/product_images/eucalyptus-essential-oil-bottle.png` | Brand mark "RACAINN" (nonsense); label text "Euplly Essentlar" / "Exceniial Oil" |
| `public/product_images/capsicum-oleoresin-bottle.png` | Label reads "Eansre tlent Enkgai Olsarpatte / Bestitionerd tind tnaird, cis oil cremite" — nonsense |

## ✅ Checked and clean (no action needed)

`clove-essential-oil-bottle.png`, `ginger-essential-oil-bottle.png`,
`ginger-oleoresin-bottle.png`, `cinnamon-oleoresin-bottle.png`,
`turmeric-oleoresin-bottle.png`, `turmeric-essential-oil-bottle.png` —
all read correctly (e.g. "CLOVE / ESSENTIAL OIL", "GINGER ESSENTIAL OIL").

## What I didn't check

Only the 10 bottle-mockup files above have a printed label design, which is
what makes garbled text visible. The plain powder/root photos (e.g.
`ashwagandha-extract.jpg`, `bcaa-powder-white.png`) don't have this failure
mode — I spot-checked a couple and they were fine — but I didn't visually
inspect every one of the ~92 files in that folder. If you want, I can run a
full pass on the rest too.

## How to fix the 4 broken ones

Whatever tool generated these (looks like an AI image generator, given the
photorealistic bottle + garbled label — a known limitation of that kind of
model) needs to be re-run for just these 4, or replace them with real
product photography, or a manually-designed label (garbled text usually
means the label was AI-rendered as part of the image rather than composited
as real text afterward — regenerating with a *real* label graphic
overlaid in Photoshop/Figma instead of asking the model to render the text
itself would avoid this permanently).

Once you have replacements, drop them in `public/product_images/` under the
same filename and re-run:
```bash
npx tsx scripts/upload-product-images.ts
```
That re-uploads everything in the folder to Supabase Storage (same bucket,
same filenames) — no database changes needed since the `image_path` already
points at these filenames.
