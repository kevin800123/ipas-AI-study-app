# -*- coding: utf-8 -*-
"""Strip PDF page header/footer bands that leaked into 初級 (beginner) questions.

Phase 1's coordinate-based 3-column extractor (the original extract_questions.py,
no longer present in this repo) did not drop the repeated page header/footer band
when a stem or option wrapped across a page boundary. The newer
scripts/extract_intermediate.py avoids this with its HEADER_PAT line filter; this
script is the equivalent post-processing pass for the already-extracted beginner
data, and is safe to re-run (idempotent).

The leaked band, reconstructed by column order, looks like:

    {page} {total}第頁，共頁年第四次AI應用規劃師-初級能力鑑定【公告試題】
    第{n}科：{科名}考試日期：114年11月01試題公告日期：114年11月20日日題目

It is injected either at the end of an option/stem or in the middle of one (the
real text resumes right after the trailing "日題目"). On the last page the band is
just the footer, optionally prefixed by the layout marker "《以下空白》":

    《以下空白》{page} {total}第頁，共頁

We operate on the raw file text so CRLF line endings and all other formatting are
preserved byte-for-byte; only the matched bands are removed. The band contains no
JSON-special characters, so editing the raw text is safe.

Run:  PYTHONUTF8=1 python scripts/clean_beginner_headers.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BEGINNER_DIR = ROOT / "src" / "data" / "beginner"

# "第頁，共頁" is a broken "第X頁，共Y頁" template (the page numbers were pulled to the
# front as "{page} {total}"); it never appears in real exam text, so it is a safe
# anchor. The optional header tail runs up to its "...11月20日日題目" terminator.
BAND = re.compile(
    r"(?:《以下空白》)?"        # 'below intentionally blank' marker (last page only)
    r"\d{1,2}[ 　]+\d{1,2}"  # current-page + total-page numbers
    r"第頁，共頁"               # broken footer template — the strong anchor
    r"(?:.*?日題目)?"           # optional repeated header band, lazy up to its tail
)

# Markers used only to assert a clean result afterwards.
RESIDUAL_MARKERS = ("第頁，共頁", "能力鑑定【公告試題】", "考試日期", "試題公告日期", "《以下空白》")


def clean_text(s: str) -> str:
    return BAND.sub("", s)


def main() -> int:
    files = sorted(BEGINNER_DIR.glob("*/questions.json"))
    if not files:
        print(f"no questions.json under {BEGINNER_DIR}")
        return 1

    total_removed = 0
    residual = 0
    for path in files:
        raw = path.read_bytes().decode("utf-8")
        matches = BAND.findall(raw)
        cleaned = clean_text(raw)
        rel = path.relative_to(ROOT).as_posix()
        if cleaned != raw:
            path.write_bytes(cleaned.encode("utf-8"))
        n = len(matches)
        total_removed += n
        left = sum(cleaned.count(m) for m in RESIDUAL_MARKERS)
        residual += left
        print(f"{rel}: removed {n} band(s), residual markers {left}")

    print(f"total bands removed: {total_removed}; total residual markers: {residual}")
    return 1 if residual else 0


if __name__ == "__main__":
    sys.exit(main())
