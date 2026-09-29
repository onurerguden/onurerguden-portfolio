"""Build the uppercase display face used by giant section titles.

Source: @fontsource-variable/archivo (SIL OFL 1.1). The output pins the width
axis to 125, keeps weight 800-900 variable and only the glyphs uppercase titles
need, renamed so it can never be confused with the upstream family.

    python3 -m venv .venv && .venv/bin/pip install -r scripts/fonts/requirements.txt
    .venv/bin/python scripts/fonts/subset-display.py
"""

import json
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "node_modules/@fontsource-variable/archivo/files"
OUTPUT = ROOT / "public/fonts"
METRICS = ROOT / "src/lib/display-metrics.json"
FAMILY = "Portfolio Display"

# Titles are uppercased with text-transform, so lowercase glyphs are never used.
PUNCTUATION = " !\"#%&'()*+,-./:;?@_·’—–"
LATIN = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789" + PUNCTUATION + "ÇÖÜÂÎÛ"
# Turkish capitals outside Latin-1; loaded only when a title contains them.
LATIN_EXT = "İĞŞ"

FILES = {
    "latin": ("archivo-latin-wdth-normal.woff2", LATIN),
    "latin-ext": ("archivo-latin-ext-wdth-normal.woff2", LATIN_EXT),
}


def rename(font: TTFont) -> None:
    names = font["name"]
    for record in list(names.names):
        if record.nameID in (1, 4, 16):
            record.string = FAMILY
        elif record.nameID == 6:
            record.string = FAMILY.replace(" ", "")
        elif record.nameID == 3:
            record.string = f"{FAMILY};subset"


def build(source: str, text: str, target: Path) -> int:
    font = TTFont(SOURCE / source, recalcTimestamp=False)
    font = instancer.instantiateVariableFont(font, {"wdth": 125, "wght": (800, 900)})
    options = subset.Options()
    options.flavor = "woff2"
    options.layout_features = ["kern", "case", "lnum", "tnum"]
    options.name_IDs = ["*"]
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(text=text)
    subsetter.subset(font)
    rename(font)
    font.flavor = "woff2"
    # Keep the upstream timestamp so rebuilding produces byte-identical files.
    font.recalcTimestamp = False
    font.save(target)
    return target.stat().st_size


def advances(target: Path, text: str) -> dict[str, float]:
    """Advance widths in em at weight 900, used to fit titles without JS."""
    font = instancer.instantiateVariableFont(TTFont(target), {"wght": 900})
    units = font["head"].unitsPerEm
    cmap = font.getBestCmap()
    metrics = font["hmtx"]
    return {
        char: round(metrics[cmap[ord(char)]][0] / units, 4)
        for char in text
        if ord(char) in cmap
    }


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    total = 0
    widths: dict[str, float] = {}
    for name, (source, text) in FILES.items():
        target = OUTPUT / f"portfolio-display-{name}.woff2"
        size = build(source, text, target)
        widths.update(advances(target, text))
        total += size
        print(f"{target.relative_to(ROOT)}: {size:,} bytes")
    METRICS.write_text(
        json.dumps({"weight": 900, "advances": dict(sorted(widths.items()))},
                   ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{METRICS.relative_to(ROOT)}: {len(widths)} glyphs")
    if total > 30_000:
        raise SystemExit(f"Display subset is {total:,} bytes; budget is 30,000.")


if __name__ == "__main__":
    main()
