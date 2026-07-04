"""Generate BestLNG exam content packs from licensed public sources.

The generator combines ECDICT exam tags with Tatoeba CC0 English examples.
When no suitable Tatoeba sentence is available, it emits a short original
fallback sentence so every selected word can still be practiced. Chinese
prompts are generated from ECDICT definitions because Tatoeba's CC0 Mandarin
export currently has too few linked sentences for these exam word lists.
"""

from __future__ import annotations

import argparse
import bz2
import csv
import json
import re
import urllib.request
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ECDICT_URL = "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv"
TATOEBA_ENG_CC0_URL = (
    "https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences_CC0.tsv.bz2"
)
EXAM_PACKS = {
    "cet4": "BestLNG CET4 英中挖空词包",
    "cet6": "BestLNG CET6 英中挖空词包",
    "ielts": "BestLNG IELTS 英中挖空词包",
    "toefl": "BestLNG TOEFL 英中挖空词包",
}
BASIC_FUNCTION_WORDS = {
    "a",
    "all",
    "an",
    "and",
    "are",
    "as",
    "at",
    "back",
    "be",
    "been",
    "being",
    "but",
    "by",
    "day",
    "did",
    "do",
    "does",
    "for",
    "get",
    "go",
    "if",
    "in",
    "is",
    "no",
    "not",
    "of",
    "on",
    "one",
    "or",
    "out",
    "say",
    "so",
    "the",
    "time",
    "to",
    "up",
    "was",
}


@dataclass(frozen=True)
class DictionaryEntry:
    word: str
    translation: str
    definition: str
    collins: int
    oxford: bool
    bnc: int
    frq: int
    tags: tuple[str, ...]


@dataclass(frozen=True)
class ExampleSentence:
    sentence: str
    translation: str
    answer: str
    source: str


def download_file(url: str, destination: Path) -> None:
    if destination.exists() and destination.stat().st_size > 0:
        return

    destination.parent.mkdir(parents=True, exist_ok=True)
    print(f"Downloading {url}")
    request = urllib.request.Request(url, headers={"User-Agent": "BestLNG-Content-Builder"})

    with urllib.request.urlopen(request) as response:
        destination.write_bytes(response.read())


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\\n", " ")).strip()


def clean_translation(value: str) -> str:
    value = clean_text(value)
    return value or "暂无中文释义"


def is_supported_word(word: str) -> bool:
    return re.fullmatch(r"[A-Za-z][A-Za-z-]{1,24}", word) is not None


def word_pattern(word: str) -> re.Pattern[str]:
    return re.compile(rf"(?<![A-Za-z]){re.escape(word)}(?![A-Za-z])", re.IGNORECASE)


def load_ecdict_entries(path: Path) -> dict[str, list[DictionaryEntry]]:
    packs: dict[str, list[DictionaryEntry]] = {tag: [] for tag in EXAM_PACKS}
    seen_by_pack: dict[str, set[str]] = {tag: set() for tag in EXAM_PACKS}

    with path.open("r", encoding="utf-8", newline="") as file:
        reader = csv.DictReader(file)

        for row in reader:
            word = (row.get("word") or "").strip()

            if not is_supported_word(word):
                continue

            normalized_word = word.lower()
            tags = tuple((row.get("tag") or "").split())
            entry = DictionaryEntry(
                word=normalized_word,
                translation=clean_translation(row.get("translation") or ""),
                definition=clean_text(row.get("definition") or ""),
                collins=parse_int(row.get("collins") or ""),
                oxford=(row.get("oxford") or "").strip() == "1",
                bnc=parse_int(row.get("bnc") or ""),
                frq=parse_int(row.get("frq") or ""),
                tags=tags,
            )

            for tag in EXAM_PACKS:
                if tag in tags and normalized_word not in seen_by_pack[tag]:
                    packs[tag].append(entry)
                    seen_by_pack[tag].add(normalized_word)

    return packs


def parse_int(value: str) -> int:
    try:
        return int(value)
    except ValueError:
        return 0


def iter_bz2_tsv(path: Path) -> Iterable[list[str]]:
    with bz2.open(path, "rt", encoding="utf-8", newline="") as file:
        reader = csv.reader(file, delimiter="\t")
        yield from reader


def load_sentences(path: Path) -> dict[int, str]:
    sentences: dict[int, str] = {}

    for row in iter_bz2_tsv(path):
        if len(row) < 3:
            continue

        try:
            sentence_id = int(row[0])
        except ValueError:
            continue

        text = clean_text(row[2])

        if text:
            sentences[sentence_id] = text

    return sentences


def is_good_english_sentence(sentence: str) -> bool:
    if len(sentence) < 24 or len(sentence) > 150:
        return False

    if '"' in sentence or "\t" in sentence or "____" in sentence:
        return False

    return sentence.endswith((".", "!", "?"))


def build_tatoeba_examples(
    english_sentences: dict[int, str],
    entries_by_word: dict[str, DictionaryEntry],
    target_words: set[str],
) -> dict[str, ExampleSentence]:
    examples: dict[str, ExampleSentence] = {}

    for sentence in english_sentences.values():
        if not is_good_english_sentence(sentence):
            continue

        tokens = {token.lower() for token in re.findall(r"[A-Za-z][A-Za-z-]{1,24}", sentence)}
        candidates = sorted(tokens.intersection(target_words), key=len, reverse=True)

        for word in candidates:
            if word in examples:
                continue

            match = word_pattern(word).search(sentence)

            if match is None:
                continue

            entry = entries_by_word[word]

            examples[word] = ExampleSentence(
                sentence=sentence,
                translation=f"中文释义提示：{entry.translation}。",
                answer=match.group(0),
                source="tatoeba-cc0",
            )

    return examples


def fallback_example(entry: DictionaryEntry) -> ExampleSentence:
    return ExampleSentence(
        sentence=f"The word {entry.word} appears often in English reading.",
        translation=f"阅读中常见表达。中文释义提示：{entry.translation}。",
        answer=entry.word,
        source="bestlng-generated",
    )


def word_family_key(word: str) -> str:
    normalized = re.sub(r"[^a-z]", "", word.lower())

    if len(normalized) <= 4:
        return normalized[:2]

    return normalized[:4]


def is_exam_core(entry: DictionaryEntry, pack_tag: str) -> bool:
    if pack_tag in {"cet4", "cet6"}:
        return "cet4" in entry.tags or "cet6" in entry.tags or "gk" in entry.tags

    return pack_tag in entry.tags


def learning_priority(entry: DictionaryEntry, pack_tag: str) -> tuple[int, int, int, int, str]:
    """给词条生成稳定学习优先级：高频/核心优先，长难低频词后置。"""

    collins_score = 6 - entry.collins if entry.collins > 0 else 8
    bnc_rank = entry.bnc if entry.bnc > 0 else 99_999
    frq_rank = entry.frq if entry.frq > 0 else 99_999
    exam_penalty = 0 if is_exam_core(entry, pack_tag) else 2
    oxford_bonus = 0 if entry.oxford else 1
    basic_word_penalty = (
        12 if pack_tag in {"ielts", "toefl"} and entry.word in BASIC_FUNCTION_WORDS else 0
    )
    advanced_common_penalty = (
        8
        if pack_tag in {"ielts", "toefl"}
        and 0 < entry.bnc <= 1500
        and len(entry.word) <= 6
        else 0
    )
    length_penalty = max(0, len(entry.word) - 8)

    return (
        exam_penalty,
        collins_score
        + oxford_bonus
        + basic_word_penalty
        + advanced_common_penalty
        + length_penalty,
        bnc_rank,
        frq_rank,
        entry.word,
    )


def interleave_word_families(entries: list[DictionaryEntry]) -> list[DictionaryEntry]:
    """分散同前缀/形近词，减少连续学习 abandon/abandoned 这类相似词的干扰。"""

    pending = entries.copy()
    ordered: list[DictionaryEntry] = []
    recent_families: list[str] = []
    window_size = 8

    while pending:
        selected_index = 0

        for index, entry in enumerate(pending):
            if word_family_key(entry.word) not in recent_families:
                selected_index = index
                break

        selected = pending.pop(selected_index)
        ordered.append(selected)
        recent_families.append(word_family_key(selected.word))
        recent_families = recent_families[-window_size:]

    return ordered


def order_entries_for_learning(
    entries: list[DictionaryEntry],
    pack_tag: str,
    limit: int | None,
) -> list[DictionaryEntry]:
    selected_entries = entries[:limit] if limit is not None else entries
    priority_sorted = sorted(
        selected_entries,
        key=lambda entry: learning_priority(entry, pack_tag),
    )

    return interleave_word_families(priority_sorted)


def stable_sentence_id(pack_tag: str, index: int, word: str) -> str:
    safe_word = re.sub(r"[^a-z0-9]+", "-", word.lower()).strip("-")
    return f"{pack_tag}-{index + 1:05d}-{safe_word}"


def build_content_package(
    pack_tag: str,
    entries: list[DictionaryEntry],
    examples: dict[str, ExampleSentence],
    limit: int | None,
) -> dict[str, object]:
    original_positions = {entry.word: index for index, entry in enumerate(entries)}
    selected_entries = order_entries_for_learning(entries, pack_tag, limit)
    sentences = []

    for index, entry in enumerate(selected_entries):
        example = examples.get(entry.word) or fallback_example(entry)
        sentence_id = stable_sentence_id(pack_tag, original_positions[entry.word], entry.word)
        accepted_answers = sorted({entry.word, entry.word.capitalize(), example.answer})
        tags = sorted({pack_tag, *entry.tags, f"order:{index + 1:05d}", f"source:{example.source}"})

        sentences.append(
            {
                "id": sentence_id,
                "text": example.sentence,
                "translation": example.translation,
                "blanks": [
                    {
                        "id": f"{sentence_id}-blank-1",
                        "answer": example.answer,
                        "acceptedAnswers": accepted_answers,
                        "hint": entry.translation,
                    }
                ],
                "tags": tags,
            }
        )

    return {
        "manifest": {
            "id": f"bestlng-{pack_tag}-en-zh",
            "name": EXAM_PACKS[pack_tag],
            "version": "0.3.0",
            "description": (
                "基于 ECDICT 考试词表标签生成，优先匹配 Tatoeba CC0 英文例句；"
                "中文提示由 ECDICT 释义生成；未匹配词条使用 BestLNG 原创兜底例句；"
                "词序按词频、考试核心度和形近词分散策略生成；练习提示不提前暴露答案。"
            ),
            "sourceLanguage": "en",
            "targetLanguage": "zh-Hans",
            "license": {
                "name": "MIT + CC0-1.0 + BestLNG generated examples",
                "url": "https://github.com/skywind3000/ECDICT/blob/master/LICENSE",
                "attribution": (
                    "Word list and definitions from ECDICT by skywind3000 (MIT); "
                    "matched English examples from Tatoeba CC0 exports; "
                    "Chinese prompts and fallback examples generated by BestLNG contributors."
                ),
            },
            "authors": ["skywind3000/ECDICT", "Tatoeba contributors", "BestLNG contributors"],
        },
        "sentences": sentences,
    }


def write_summary(output_dir: Path, stats: dict[str, dict[str, int]]) -> None:
    lines = [
        "# BestLNG Exam Content Packs",
        "",
        "本目录包含可直接导入 BestLNG 桌面端的考试词包 JSON 文件。",
        "",
        "## 数据来源",
        "",
        "- ECDICT: https://github.com/skywind3000/ECDICT, MIT License。",
        "- Tatoeba CC0 exports: https://tatoeba.org/en/downloads, CC0 句子导出。",
        "- BestLNG generated fallback examples: 未匹配到合适 CC0 句对时生成的原创兜底例句。",
        "",
        "## 生成结果",
        "",
        "| 文件 | 词条数 | Tatoeba 英文例句 | 原创兜底 |",
        "| --- | ---: | ---: | ---: |",
    ]

    for tag in EXAM_PACKS:
        item = stats[tag]
        lines.append(
            f"| bestlng-{tag}-en-zh.json | {item['total']} | "
            f"{item['tatoeba']} | {item['generated']} |"
        )

    lines.extend(
        [
            "",
            "## 词序策略",
            "",
            "考试词包不会按字母表顺序出词。生成脚本会优先安排 ECDICT 中更常见、考试核心度更高的词，",
            "再用一个小窗口分散同前缀/形近词，降低连续学习相似词带来的干扰。每条句子的 tags 中会写入",
            "`order:00001` 这类稳定学习序号，桌面端按该序号出题和展示单词本。",
            "",
            "## 重新生成",
            "",
            "```bash",
            "python packages/content/scripts/generate_exam_packs.py",
            "```",
            "",
            "生成脚本会把下载缓存放到 `packages/content/.cache/exam-packs/`。",
        ]
    )
    output_dir.joinpath("README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limit words per pack for smoke testing.",
    )
    parser.add_argument(
        "--skip-tatoeba",
        action="store_true",
        help="Only use ECDICT and generated fallback sentences.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    repo_root = Path(__file__).resolve().parents[3]
    cache_dir = repo_root / "packages" / "content" / ".cache" / "exam-packs"
    output_dir = repo_root / "packages" / "content" / "packs" / "exam"
    ecdict_path = cache_dir / "ecdict.csv"

    output_dir.mkdir(parents=True, exist_ok=True)
    download_file(ECDICT_URL, ecdict_path)
    entries_by_pack = load_ecdict_entries(ecdict_path)
    target_words = {
        entry.word
        for entries in entries_by_pack.values()
        for entry in (entries[: args.limit] if args.limit is not None else entries)
    }
    examples: dict[str, ExampleSentence] = {}
    entries_by_word = {
        entry.word: entry
        for entries in entries_by_pack.values()
        for entry in (entries[: args.limit] if args.limit is not None else entries)
    }

    if not args.skip_tatoeba:
        english_path = cache_dir / "eng_sentences_CC0.tsv.bz2"

        download_file(TATOEBA_ENG_CC0_URL, english_path)

        print("Loading Tatoeba CC0 English sentences...")
        english_sentences = load_sentences(english_path)
        print("Matching exam words with Tatoeba examples...")
        examples = build_tatoeba_examples(english_sentences, entries_by_word, target_words)

    stats: dict[str, dict[str, int]] = defaultdict(dict)

    for pack_tag, entries in entries_by_pack.items():
        content_package = build_content_package(pack_tag, entries, examples, args.limit)
        sentences = content_package["sentences"]
        assert isinstance(sentences, list)
        tatoeba_count = sum(
            1 for sentence in sentences if "source:tatoeba-cc0" in sentence.get("tags", [])
        )
        generated_count = len(sentences) - tatoeba_count
        output_path = output_dir / f"bestlng-{pack_tag}-en-zh.json"

        output_path.write_text(
            json.dumps(content_package, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        stats[pack_tag] = {
            "total": len(sentences),
            "tatoeba": tatoeba_count,
            "generated": generated_count,
        }
        print(
            f"Wrote {output_path.relative_to(repo_root)} "
            f"({len(sentences)} entries, {tatoeba_count} Tatoeba, {generated_count} generated)"
        )

    write_summary(output_dir, stats)


if __name__ == "__main__":
    main()
