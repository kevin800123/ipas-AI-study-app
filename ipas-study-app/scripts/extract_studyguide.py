# -*- coding: utf-8 -*-
"""Extract the FULL 學習指引 (study guide) body text into the app's summaries JSON.

The guides are well structured: a private-use bullet glyph (\\uf097), （N）/A./B.
sub-labels, running header (\\uf07d... 第三章 ...) and page-number lines (e.g. 3-12).
We strip the chrome, keep every paragraph/bullet, and emit SummaryBlock objects.

Run:  PYTHONUTF8=1 python scripts/extract_studyguide.py
"""
import json
import re
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parent

BULLET = ""
HEADER_GLYPH = ""

SUBJECTS = [
    {
        "pdf": "初級/AI應用規劃師(初級)-學習指引-科目1人工智慧基礎概論.pdf",
        "subject": "ai-basics",
        "header_kw": "第三章",
        "pagenum_re": re.compile(r"^\d-\d+$"),
        "marker_re": re.compile(r"^3\.[1-9]$"),
        # (chapter#, title, page_start, page_end)  -- 0-indexed, inclusive, content only
        "chapters": [
            (1, "人工智慧概念與治理", 6, 24),
            (2, "資料處理與分析概念", 29, 33),
            (3, "機器學習概念", 38, 48),
            (4, "鑑別式 AI 與生成式 AI", 53, 64),
        ],
    },
    {
        "pdf": "初級/AI應用規劃師(初級)-學習指引-科目2生成式AI應用與規劃.pdf",
        "subject": "genai",
        "header_kw": "第三章",
        "pagenum_re": re.compile(r"^\d-\d+$"),
        "marker_re": re.compile(r"^3\.[1-9]$"),
        "chapters": [
            (1, "No Code / Low Code 概念", 6, 16),
            (2, "生成式 AI 應用領域與工具使用", 22, 31),
            (3, "生成式 AI 導入評估與規劃", 36, 56),
        ],
    },
]

HEADING_PREFIX = re.compile(r"^(（\s*\d+\s*）|[A-Za-z][\.\、])")
BARE_NUM = re.compile(r"^\d{1,2}\.\s*$")
APPENDIX = re.compile(r"^[A-Z]-\d+$")


ARROW_RE = re.compile("[]")  # PUA arrows -> arrow


def is_private(ch: str) -> bool:
    return 0xF000 <= ord(ch) <= 0xF0FF


def has_cjk(s: str) -> bool:
    return any("一" <= c <= "鿿" for c in s)


def smart_join(acc: str, line: str) -> str:
    if not line:
        return acc
    if not acc:
        return line
    if acc[-1].isascii() and acc[-1].isalnum() and line[0].isascii() and line[0].isalnum():
        return acc + " " + line
    return acc + line


def extract_chapter(doc, p_start, p_end, header_kw, pagenum_re, marker_re):
    blocks = []
    para = ""          # current paragraph buffer
    bullets = []       # current keypoints buffer
    mode = None        # 'para' | 'bullet' | None

    def flush():
        nonlocal para, bullets, mode
        if para.strip():
            blocks.append({"type": "text", "content": para.strip()})
        if bullets:
            blocks.append({"type": "keypoints", "items": [b for b in bullets if b]})
        para, bullets, mode = "", [], None

    for p in range(p_start, p_end + 1):
        for raw in doc[p].get_text().splitlines():
            s = ARROW_RE.sub("→", raw.strip())  # normalise PUA arrows
            if not s:
                flush()
                continue
            if s and is_private(s[0]):
                if header_kw in s or s.startswith(HEADER_GLYPH):
                    continue  # running header
                # bullet: strip any leading private-use glyphs
                item = s.lstrip("".join(chr(c) for c in range(0xF000, 0xF100))).strip()
                if mode == "bullet" and not item:
                    continue
                if para.strip():
                    blocks.append({"type": "text", "content": para.strip()})
                    para = ""
                bullets.append(item)
                mode = "bullet"
                continue
            if pagenum_re.match(s) or marker_re.match(s) or APPENDIX.match(s):
                continue
            if "版權所有" in s or "經濟部產業發展署" in s:
                continue
            if BARE_NUM.match(s):
                continue  # bare sub-section number, title not in text layer
            # heading: short marker-prefixed label ending with colon
            if HEADING_PREFIX.match(s) and s.endswith("：") and len(s) <= 22:
                flush()
                blocks.append({"type": "heading", "text": s.rstrip("：")})
                continue
            # paragraph line / bullet continuation
            if mode == "bullet":
                bullets[-1] = smart_join(bullets[-1], s)
            else:
                para = smart_join(para, s)
                mode = "para"
    flush()
    # drop stray ASCII title fragments (e.g. "AI", "3.1 No code / Low code")
    cleaned = []
    for b in blocks:
        if b["type"] in ("text", "heading"):
            t = b.get("content") or b.get("text", "")
            if not has_cjk(t) and len(t) < 30:
                continue
        cleaned.append(b)
    return cleaned


def main():
    for cfg in SUBJECTS:
        doc = fitz.open(SRC / cfg["pdf"])
        chapters = []
        for num, title, ps, pe in cfg["chapters"]:
            blocks = extract_chapter(doc, ps, pe, cfg["header_kw"], cfg["pagenum_re"], cfg["marker_re"])
            chapters.append({
                "id": f"{cfg['subject']}-ch{num}",
                "subject": cfg["subject"],
                "chapter": num,
                "title": title,
                "blocks": blocks,
            })
        out = ROOT / "src" / "data" / "beginner" / cfg["subject"] / "summaries.json"
        out.write_text(json.dumps(chapters, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"== {cfg['subject']} -> {out.name}")
        for ch in chapters:
            kinds = {}
            for b in ch["blocks"]:
                kinds[b["type"]] = kinds.get(b["type"], 0) + 1
            chars = sum(len(b.get("content", "")) + sum(len(i) for i in b.get("items", [])) for b in ch["blocks"])
            print(f"   ch{ch['chapter']} {ch['title']}: {len(ch['blocks'])} blocks {kinds}  ~{chars} chars")


if __name__ == "__main__":
    main()
