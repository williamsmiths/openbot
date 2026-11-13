#!/usr/bin/env python3
"""Replaces the visible product name "OpenBot" with "kongCowork" in the i18n catalogs (fork only).

Run it again after each merge from upstream. It changes catalog values, never catalog keys.

Kept as "OpenBot":
- Each entry whose English text names a bot or app that still has the released name outside this
  app: the Slack, Discord and Telegram bot (`@OpenBot`, "the OpenBot bot", "named OpenBot"), the
  OpenBot GitHub App and the commit co-author trailer. The same keys are kept in every language.
- "Shared with OpenBot" anywhere: the 1Password vault, Bitwarden folder and Proton Pass vault that the
  connectors look up by that exact name. Every language keeps it in English.
- `@OpenBot` and a Windows path (`OpenBot\\`) anywhere.
Polish inflections map to the inflections of the new name. A grammar pass then fixes French and
Italian elision and articles, the English article and the Korean particles after the new name
(read 콩코워크, it ends in a vowel).
Usage: scripts/fork/rename-product-text.py [--check]
"""
import glob, os, re, sys

ROOT = "packages/i18n/src/messages"
NEW = "kongCowork"
FORMS = {"OpenBot": NEW, "OpenBota": NEW + "a", "OpenBotowi": NEW + "owi", "OpenBotem": NEW + "iem", "OpenBocie": NEW + "u"}
# Not after "@" or an ASCII word character (a `\n` escape is not one); not before an ASCII word
# character, an escaped backslash (`\\` in the source: a Windows path), or `":` (the end of a key).
# Korean, Japanese and Chinese text joins the name with no space, and Turkish escapes its apostrophe
# (`OpenBot\'u`): both still match.
PATTERN = re.compile(r'(?<!Shared with )(?:(?<=\\n)|(?<![@A-Za-z0-9_]))(OpenBot(?:owi|em|a)?|OpenBocie)(?![A-Za-z0-9_])(?!\\\\)(?!":)')
# English text of an entry that names an outside identity. The entry keeps "OpenBot" in all languages.
KEEP = re.compile(r"OpenBot GitHub App|named OpenBot|OpenBot bot|@OpenBot|[Cc]o-author")
ENTRY_KEY = re.compile(r'^  "([^"]+)":')
# (language, pattern, replacement): elision and articles that the new name does not take.
GRAMMAR = [
    ("fr", re.compile(r"\b(\w*)qu[’']" + NEW), r"\1que " + NEW),
    ("fr", re.compile(r"\b([dD])[’']" + NEW), lambda m: ("de " if m.group(1) == "d" else "De ") + NEW),
    ("fr", re.compile(r"\b([lL])[’']" + NEW), lambda m: ("le " if m.group(1) == "l" else "Le ") + NEW),
    ("fr", re.compile(r"\b([dD])e le " + NEW), lambda m: ("du " if m.group(1) == "d" else "Du ") + NEW),
    ("fr", re.compile(r"(?<!\w)([àÀ]) le " + NEW), lambda m: ("au " if m.group(1) == "à" else "Au ") + NEW),
    ("fr", re.compile(r"\b([cC])et " + NEW), r"\1e " + NEW),
    ("fr", re.compile(r"\b([nN])ouvel " + NEW), r"\1ouveau " + NEW),
    ("it", re.compile(r"\b([dDaAnNsS])(?:e|a|u)?ll[’']" + NEW), None),
    ("it", re.compile(r"\b([lL])[’']" + NEW), lambda m: ("il " if m.group(1) == "l" else "Il ") + NEW),
    ("it", re.compile(r"\b([dD])[’']" + NEW), lambda m: ("di " if m.group(1) == "d" else "Di ") + NEW),
    ("en", re.compile(r"\b([aA])n " + NEW), r"\1 " + NEW),
    ("ko", re.compile(NEW + r"(이|을|은|으로|과)(?![\uac00-\ud7a3])"), lambda m: NEW + KOREAN_AFTER_VOWEL[m.group(1)]),
]
# Korean particles after a consonant, and the same particles after a vowel.
KOREAN_AFTER_VOWEL = {"이": "가", "을": "를", "은": "는", "으로": "로", "과": "와"}
ITALIAN_ARTICLED = {"dell": "del", "all": "al", "nell": "nel", "sull": "sul", "dall": "dal"}


def italian_articled(match: re.Match) -> str:
    word = match.group(0)[: -len(NEW) - 1]
    lower = ITALIAN_ARTICLED.get(word.lower())
    if lower is None:
        return match.group(0)
    return (lower.capitalize() if word[0].isupper() else lower) + " " + NEW


def entries(text: str):
    """Yields (key or None, chunk). A chunk is one top-level entry, or lines outside entries."""
    key, chunk = None, []
    for line in text.splitlines(keepends=True):
        found = ENTRY_KEY.match(line)
        if found or (key is not None and (line.startswith("  //") or line.startswith("}"))):
            if chunk:
                yield key, "".join(chunk)
            key, chunk = (found.group(1) if found else None), []
        chunk.append(line)
    if chunk:
        yield key, "".join(chunk)


def kept_keys() -> set[str]:
    keys = set()
    for path in glob.glob(f"{ROOT}/en/**/*.ts", recursive=True):
        for key, chunk in entries(open(path, encoding="utf-8").read()):
            if key and KEEP.search(chunk):
                keys.add(key)
    return keys


def rename(text: str, language: str, keep: set[str]) -> tuple[str, int]:
    total, out = 0, []
    for key, chunk in entries(text):
        if key not in keep:
            chunk, count = PATTERN.subn(lambda m: FORMS[m.group(1)], chunk)
            total += count
            for lang, pattern, replacement in GRAMMAR:
                if lang == language:
                    chunk = pattern.sub(replacement or italian_articled, chunk)
        out.append(chunk)
    return "".join(out), total


def main() -> int:
    check = "--check" in sys.argv
    keep = kept_keys()
    total = changed = 0
    for path in sorted(glob.glob(f"{ROOT}/**/*.ts", recursive=True)):
        language = os.path.relpath(path, ROOT).split(os.sep)[0]
        text = open(path, encoding="utf-8").read()
        new_text, count = rename(text, language, keep)
        total += count
        if new_text != text:
            changed += 1
            if not check:
                open(path, "w", encoding="utf-8").write(new_text)
    verb = "would change" if check else "changed"
    print(f"{verb} {changed} files ({total} names); kept {len(keep)} entries")
    return 1 if check and changed else 0


if __name__ == "__main__":
    sys.exit(main())
