# -*- coding: utf-8 -*-
"""Extract iPAS 中級 question bank from official PDFs into the app's Question JSON.

Sources (folder: ../../中級):
  - 公告試題 (official released exams), one PDF per subject -> source "114-2-official"
  - 考試樣題 (sample questions), one PDF covering 3 subjects -> source "114-sample"

Run:  PYTHONUTF8=1 python scripts/extract_intermediate.py
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

import fitz  # PyMuPDF

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT.parent / "中級"
OUT_DIR = ROOT / "src" / "data" / "intermediate"

# subject id -> (title, official-exam pdf filename)
SUBJECTS = {
    "ai-tech": (
        "人工智慧技術應用與規劃",
        "114年第二梯次中級AI應用規劃師第一科人工智慧技術應用與規劃(當次試題公告114.11.20).pdf",
    ),
    "big-data": (
        "大數據處理分析與應用",
        "114年第二梯次中級AI應用規劃師第二科大數據處理分析與應用(當次試題公告114.11.20).pdf",
    ),
    "ml-tech": (
        "機器學習技術與應用",
        "114年第二梯次中級AI應用規劃師第三科機器學習技術與應用(當次試題公告114.11.20).pdf",
    ),
}
SAMPLE_PDF = "iPAS+AI應用規劃師中級能力鑑定-考試樣題(114年9月版)+v2.pdf"
# id prefix used in question ids
PREFIX = {"ai-tech": "IT1", "big-data": "IT2", "ml-tech": "IT3"}

ANS_RE = re.compile(r"^[ABCDＡＢＣＤ]$")
# Q1-9 in the released exams use "9.  stem"; Q10+ use "10 stem" (no period).
QNUM_RE = re.compile(r"^(\d{1,3})[\.\．、]?[\s　]+(.*)")
# Later questions inline the answer: "Ｂ 40 stem", or "Ｂ 43" with the stem on the
# next line, so the trailing stem is optional.
ANS_QNUM_RE = re.compile(r"^([ABCDＡＢＣＤ])[\s　]+(\d{1,3})[\.\．、]?[\s　]*(.*)$")
OPT_RE = re.compile(r"^[\(（]\s*([ABCDＡＢＣＤ])\s*[\)）]\s*(.*)")
NUM_RE = re.compile(r"^\d{1,2}$")  # sample 樣題: a bare question-number line
IMG_MARKERS = ("附圖", "如下圖", "如圖", "下圖", "示意圖", "請參考圖", "下表所示之圖")
HEADER_PAT = re.compile(
    r"^(\d+\s*$|114\s*年|第[一二三四五六七八九十\d]+科|考試日期|試題公告|第\s*\d+\s*頁|"
    r"答案|答\s*$|案\s*$|題目|題號|iPAS|◆|（樣題|\(樣題|\d{3}\.\d{2}\s*版)"
)


def norm_letter(s: str) -> str:
    return unicodedata.normalize("NFKC", s).strip().upper()


def is_ascii_alnum(ch: str) -> bool:
    return ch.isascii() and ch.isalnum()


def smart_join(acc: str, line: str) -> str:
    line = line.strip()
    if not line:
        return acc
    if not acc:
        return line
    # keep a space between two western tokens broken across lines
    if is_ascii_alnum(acc[-1]) and is_ascii_alnum(line[0]):
        return acc + " " + line
    return acc + line


def clean_lines(text: str):
    for raw in text.splitlines():
        s = raw.strip()
        if not s:
            continue
        if s == "新":  # marker for newly-added items in the released exam
            continue
        if HEADER_PAT.match(s):
            continue
        yield s


def parse(text: str, want_image=False):
    """State machine: a bare answer-column letter precedes each numbered question.

    A line is treated as a new question only when an answer is pending OR the
    number is sequential, which prevents continuation lines that happen to start
    with a digit from being mistaken for a question boundary.
    """
    questions = []
    dropped = []
    cur = None
    pending = None
    cur_opt = None

    def finalize():
        nonlocal cur, cur_opt
        if cur:
            ok = len(cur["options"]) == 4 and cur["answer"]
            has_img = any(m in cur["stem"] for m in IMG_MARKERS)
            if ok and (want_image or not has_img):
                questions.append(cur)
            else:
                dropped.append((cur["num"], "img" if has_img else "incomplete"))
        cur, cur_opt = None, None

    for line in clean_lines(text):
        if ANS_RE.match(line):
            pending = norm_letter(line)
            continue
        m = ANS_QNUM_RE.match(line)
        if m:
            num = int(m.group(2))
            last = cur["num"] if cur else 0
            if num == last + 1:
                finalize()
                cur = {"num": num, "answer": norm_letter(m.group(1)), "stem": m.group(3).strip(), "options": {}}
                cur_opt = None
                pending = None
                continue
        m = QNUM_RE.match(line)
        if m:
            num = int(m.group(1))
            last = cur["num"] if cur else 0
            if pending is not None or num == last + 1:
                finalize()
                cur = {"num": num, "answer": pending or "", "stem": m.group(2).strip(), "options": {}}
                cur_opt = None
                pending = None
                continue
        m = OPT_RE.match(line)
        if m and cur is not None:
            key = norm_letter(m.group(1))
            cur["options"][key] = m.group(2).strip()
            cur_opt = key
            continue
        if cur is not None:
            if cur_opt:
                cur["options"][cur_opt] = smart_join(cur["options"][cur_opt], line)
            else:
                cur["stem"] = smart_join(cur["stem"], line)
    finalize()
    return questions, dropped


def to_question(q, subject, level, source, idx):
    text = lambda k: q["options"][k].rstrip("；;。 ").strip()
    return {
        "id": f"{PREFIX[subject]}-{source_tag(source)}-Q{idx:03d}",
        "level": level,
        "subject": subject,
        "source": source,
        "stem": q["stem"].rstrip("。 ").strip() if False else q["stem"].strip(),
        "options": [{"key": k, "text": text(k)} for k in ("A", "B", "C", "D")],
        "answer": q["answer"],
        "explanation": "",
        "tags": [],
    }


def source_tag(source):
    return {"114-2-official": "off", "114-sample": "smp"}[source]


def extract_official(subject):
    title, fname = SUBJECTS[subject]
    doc = fitz.open(SRC_DIR / fname)
    text = "\n".join(p.get_text() for p in doc)
    parsed, dropped = parse(text)
    return [to_question(q, subject, "intermediate", "114-2-official", i + 1)
            for i, q in enumerate(parsed)], parsed, dropped


def _sample_chrome(line: str) -> bool:
    return (
        line.startswith("iPAS")
        or line.startswith("(樣題")
        or line.startswith("（樣題")
        or line.startswith("題號")
        or line in ("題目", "答案")
        or bool(re.match(r"^\d{3}\.\d{2}", line))  # "114.09 版"
    )


def parse_sample(text: str):
    """Sample 樣題 format: a bare number line, then a bare answer letter, then the
    stem, then (A)-(D). Page numbers are also bare digits, but are NOT followed by
    an answer letter — that is how we tell a real question start apart."""
    lines = [l.strip() for l in text.splitlines() if l.strip()]
    n = len(lines)

    def is_qstart(j):
        return j + 1 < n and NUM_RE.match(lines[j]) and ANS_RE.match(lines[j + 1])

    questions, dropped = [], []
    i = 0
    while i < n:
        if not is_qstart(i):
            i += 1
            continue
        num, ans = int(lines[i]), norm_letter(lines[i + 1])
        i += 2
        stem, options, cur = "", {}, None
        while i < n:
            l = lines[i]
            if is_qstart(i):
                break
            if ANS_RE.match(l) and cur is not None:
                break  # bare answer letter after options => a numberless next question
            if _sample_chrome(l) or NUM_RE.match(l):  # column header / stray page number
                i += 1
                continue
            m = OPT_RE.match(l)
            if m:
                cur = norm_letter(m.group(1))
                options[cur] = m.group(2).strip()
            elif cur:
                options[cur] = smart_join(options[cur], l)
            else:
                stem = smart_join(stem, l)
            i += 1
        has_img = any(mk in stem for mk in IMG_MARKERS)
        if len(options) == 4 and ans and not has_img:
            questions.append({"num": num, "answer": ans, "stem": stem.strip(), "options": options})
        else:
            dropped.append((num, "img" if has_img else "incomplete"))
    return questions, dropped


def split_sample_sections(text: str):
    """The sample PDF concatenates 3 subjects under ◆ 科目一/二/三 headers."""
    markers = [("科目一", "ai-tech"), ("科目二", "big-data"), ("科目三", "ml-tech")]
    lines = text.splitlines()
    sections = {}
    cur_key = None
    buf = []
    for s in lines:
        hit = None
        for token, key in markers:
            if "◆" in s and token in s:
                hit = key
                break
        if hit:
            if cur_key:
                sections[cur_key] = "\n".join(buf)
            cur_key = hit
            buf = []
            continue
        buf.append(s)
    if cur_key:
        sections[cur_key] = "\n".join(buf)
    return sections


def extract_sample():
    doc = fitz.open(SRC_DIR / SAMPLE_PDF)
    text = "\n".join(p.get_text() for p in doc)
    sections = split_sample_sections(text)
    out, drops = {}, {}
    for subject, body in sections.items():
        parsed, dropped = parse_sample(body)
        out[subject] = [to_question(q, subject, "intermediate", "114-sample", i + 1)
                        for i, q in enumerate(parsed)]
        drops[subject] = dropped
    return out, drops


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    sample, sample_drops = extract_sample()
    summary = []
    for subject, (title, _) in SUBJECTS.items():
        official, parsed, dropped = extract_official(subject)
        smp = sample.get(subject, [])
        all_q = official + smp
        sub_dir = OUT_DIR / subject
        sub_dir.mkdir(parents=True, exist_ok=True)
        (sub_dir / "questions.json").write_text(
            json.dumps(all_q, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        summary.append((subject, title, len(official), len(smp), dropped, sample_drops.get(subject, [])))

    print("subject     | official | sample | off-dropped | sample-dropped")
    for subject, title, no, ns, dropped, sdrop in summary:
        print(f"{subject:11s} | {no:8d} | {ns:6d} | {dropped} | {sdrop}   {title}")


if __name__ == "__main__":
    main()
