"""Build the handwriting face of the desk's final-view callout.

Source: @fontsource/caveat 600 (SIL OFL 1.1). Only the glyphs of the
callout's titles and of the headphones' note are kept, renamed so the
subset can never be confused with the upstream family. Caveat's latin file
already has the Turkish dotless i, so one file serves both languages.

    python3 -m venv .venv && .venv/bin/pip install -r scripts/fonts/requirements.txt
    .venv/bin/python scripts/fonts/subset-hand.py
    npm run assets:revisions   (src/lib/hand-font-assets.json)
"""

from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "node_modules/@fontsource/caveat/files"
OUTPUT = ROOT / "public/fonts/hand"
FAMILY = "Portfolio Hand"

# The callout's titles and the headphones' note
# (src/components/desk/desk-callouts.tsx), both cases.
TITLES = (
    "Try clicking the objects"
    + "Objelere tıklamayı dene"
    + "plays music"
    + "müzik çalar"
)
TEXT = "".join(sorted(set(TITLES + TITLES.upper() + TITLES.lower() + "!.…")))
SOURCE_FILE = "caveat-latin-600-normal.woff2"


def rename(font: TTFont) -> None:
    names = font["name"]
    for record in list(names.names):
        if record.nameID in (1, 4, 16):
            record.string = FAMILY
        elif record.nameID == 6:
            record.string = FAMILY.replace(" ", "")
        elif record.nameID == 3:
            record.string = f"{FAMILY};subset"


def build(text: str, target: Path) -> int:
    font = TTFont(SOURCE / SOURCE_FILE, recalcTimestamp=False)
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["kern"]
    options.hinting = False
    options.name_IDs = ["*"]
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    rename(font)
    font.flavor = "woff2"
    font.recalcTimestamp = False
    font.save(target)
    return target.stat().st_size


if __name__ == "__main__":
    target = OUTPUT / "portfolio-hand.woff2"
    print(f"{target.name}: {build(TEXT, target)} bytes")
