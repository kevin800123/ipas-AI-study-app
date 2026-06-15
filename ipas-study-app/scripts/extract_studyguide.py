# -*- coding: utf-8 -*-
"""Extract the FULL 學習指引 (study guide) body text into the app's summaries JSON.

Two modes:
  * beginner guides: one content chapter (第三章) split into sections by explicit
    page ranges (their section markers are bare "3.N").
  * intermediate guides: content spans 第三章~第六章. We classify each page as
    content vs practice (pages with 'Ans（' or many '... ？' questions are dropped),
    group content pages by the running header "第X章 <title>", and emit one app
    chapter per guide chapter.

Common cleaning: drop running header (\\uf07d... 第X章) and page-number lines
(e.g. 3-12), normalise private-use arrows -> "→", keep paragraphs / bullets
(\\uf097) / section headings.

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
ARROW_RE = re.compile("[]")
SYMBOL_MAP = {
    0xf061:"α",0xf062:"β",0xf067:"γ",0xf064:"δ",0xf065:"ε",
    0xf066:"φ",0xf071:"θ",0xf06b:"κ",0xf06c:"λ",0xf06d:"μ",
    0xf070:"π",0xf072:"ρ",0xf073:"σ",0xf074:"τ",0xf077:"ω",
    0xf078:"ξ",0xf07a:"ζ",
    0xf0b3:"≥",0xf0a3:"≤",0xf0b4:"×",0xf0b8:"÷",0xf0b9:"≠",
    0xf0b1:"±",0xf0d7:"·",0xf0e5:"∑",0xf0f2:"∫",0xf0a5:"∞",
    0xf0b6:"∂",0xf0d6:"√",0xf0ce:"∈",0xf0e0:"→",0xf0e2:"→",0xf0e8:"→",
}

CN = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}

PAGENUM_RE = re.compile(r"^\d-\d+(\s|$)")
HEADER_LINE_RE = re.compile(r"^[-\s]*第[一二三四五六七八九十\d]+章")
CHAPTER_HDR_RE = re.compile(r"第([一二三四五六七八九十]+)章\s*(\S[^\n]*)")
SECTION_RE = re.compile(r"^[3-6]\.\d{1,2}(\s+\S.{0,30})?$")
HEADING_PREFIX = re.compile(r"^(（\s*\d+\s*）|[A-Za-z][\.\、])")
BARE_NUM = re.compile(r"^\d{1,2}\.\s*$")
# standalone numbered sub-section title, e.g. "1. 前言與章節導覽"
NUMBERED_TITLE = re.compile(r"^\d{1,2}\.\s+\S")
APPENDIX = re.compile(r"^[A-Z]-\d+$")
RUNNING_LABEL = re.compile(r"^(重點掃[瞄描]|前言與章節導覽)$")

SUBJECTS = [
    {"pdf": "初級/AI應用規劃師(初級)-學習指引-科目1人工智慧基礎概論.pdf",
     "subject": "ai-basics", "level": "beginner", "mode": "ranges",
     "chapters": [(1, "人工智慧概念與治理", 6, 24), (2, "資料處理與分析概念", 29, 33),
                  (3, "機器學習概念", 38, 48), (4, "鑑別式 AI 與生成式 AI", 53, 64)]},
    {"pdf": "初級/AI應用規劃師(初級)-學習指引-科目2生成式AI應用與規劃.pdf",
     "subject": "genai", "level": "beginner", "mode": "ranges",
     "chapters": [(1, "No Code / Low Code 概念", 6, 16), (2, "生成式 AI 應用領域與工具使用", 22, 31),
                  (3, "生成式 AI 導入評估與規劃", 36, 56)]},
    {"pdf": "中級/AI應用規劃師(中級)-學習指引-科目1人工智慧技術應用規劃.pdf",
     "subject": "ai-tech", "level": "intermediate", "mode": "auto"},
    {"pdf": "中級/AI應用規劃師(中級)-學習指引-科目2大數據處理分析與應用.pdf",
     "subject": "big-data", "level": "intermediate", "mode": "auto"},
    {"pdf": "中級/AI應用規劃師(中級)-學習指引-科目3機器學習技術與應用.pdf",
     "subject": "ml-tech", "level": "intermediate", "mode": "auto"},
]


def is_private(ch):
    return 0xE000 <= ord(ch) <= 0xF8FF


def has_cjk(s):
    return any("一" <= c <= "鿿" for c in s)


def smart_join(acc, line):
    if not line:
        return acc
    if not acc:
        return line
    if acc[-1].isascii() and acc[-1].isalnum() and line[0].isascii() and line[0].isalnum():
        return acc + " " + line
    return acc + line


def build_blocks(lines):
    blocks, para, bullets, mode = [], "", [], None

    def flush():
        nonlocal para, bullets, mode
        if para.strip():
            blocks.append({"type": "text", "content": para.strip()})
        if bullets:
            blocks.append({"type": "keypoints", "items": [b for b in bullets if b]})
        para, bullets, mode = "", [], None

    for raw in lines:
        s = raw.strip().translate(SYMBOL_MAP)
        if not s:
            flush()
            continue
        if is_private(s[0]):
            if s.startswith(HEADER_GLYPH) or HEADER_LINE_RE.match(s):
                continue  # running header
            item = s.lstrip("".join(chr(c) for c in range(0xE000, 0xF900))).strip()
            if mode == "bullet" and not item:
                continue
            if para.strip():
                blocks.append({"type": "text", "content": para.strip()})
                para = ""
            bullets.append(item)
            mode = "bullet"
            continue
        if PAGENUM_RE.match(s) or APPENDIX.match(s) or RUNNING_LABEL.match(s):
            continue
        if HEADER_LINE_RE.match(s) or "版權所有" in s or "經濟部產業發展署" in s:
            continue
        if SECTION_RE.match(s) and "。" not in s:
            flush()
            blocks.append({"type": "heading", "text": s.strip()})
            continue
        if BARE_NUM.match(s):
            continue
        if NUMBERED_TITLE.match(s) and len(s) <= 24 and not any(p in s for p in "。，；"):
            flush()
            blocks.append({"type": "heading", "text": s.strip()})
            continue
        if HEADING_PREFIX.match(s) and s.endswith("：") and len(s) <= 22:
            flush()
            blocks.append({"type": "heading", "text": s.rstrip("：")})
            continue
        if mode == "bullet":
            bullets[-1] = smart_join(bullets[-1], s)
        else:
            para = smart_join(para, s)
            mode = "para"
    flush()
    cleaned = [b for b in blocks
               if not (b["type"] in ("text", "heading")
                       and not has_cjk(b.get("content") or b.get("text", ""))
                       and len(b.get("content") or b.get("text", "")) < 30)]
    return cleaned


def is_practice(text):
    if "Ans（" in text or "Ans(" in text:
        return True
    return len(re.findall(r"(?m)^\s*\d+\.\s+\S.*？", text)) >= 4


def extract_ranges(doc, chapters):
    out = []
    for num, title, ps, pe in chapters:
        lines = []
        for p in range(ps, pe + 1):
            lines.extend(doc[p].get_text().splitlines())
        out.append((num, title, build_blocks(lines)))
    return out


def extract_auto(doc):
    grouped, order = {}, []
    for i in range(len(doc)):
        text = doc[i].get_text()
        if is_practice(text):
            continue
        m = CHAPTER_HDR_RE.search(text)
        if not m:
            continue
        ch = CN.get(m.group(1))
        if ch is None or ch < 3:
            continue  # skip front-matter / admin chapters
        if ch not in grouped:
            title = re.split(r"\s{2,}|\d-\d+", m.group(2).strip())[0].strip()
            grouped[ch] = {"title": title, "lines": []}
            order.append(ch)
        grouped[ch]["lines"].extend(text.splitlines())
    out = []
    for seq, ch in enumerate(order, 1):
        out.append((seq, grouped[ch]["title"], build_blocks(grouped[ch]["lines"])))
    return out


def main():
    for cfg in SUBJECTS:
        doc = fitz.open(SRC / cfg["pdf"])
        raw = extract_ranges(doc, cfg["chapters"]) if cfg["mode"] == "ranges" else extract_auto(doc)
        chapters = [{"id": f"{cfg['subject']}-ch{num}", "subject": cfg["subject"],
                     "chapter": num, "title": title, "blocks": blocks}
                    for num, title, blocks in raw]
        out = ROOT / "src" / "data" / cfg["level"] / cfg["subject"] / "summaries.json"
        out.write_text(json.dumps(chapters, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"== {cfg['subject']} ({cfg['level']}) -> {len(chapters)} chapters")
        for ch in chapters:
            kinds = {}
            for b in ch["blocks"]:
                kinds[b["type"]] = kinds.get(b["type"], 0) + 1
            chars = sum(len(b.get("content", "")) + sum(len(i) for i in b.get("items", [])) for b in ch["blocks"])
            print(f"   ch{ch['chapter']} {ch['title'][:24]:24s} {len(ch['blocks']):3d} blk {str(kinds):44s} ~{chars}")


if __name__ == "__main__":
    main()
