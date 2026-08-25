# docwriter-style-generator

Build a `my-writing-style` skill from your own prose.

Give it a few pieces of your writing — local files, URLs, or pasted text — and
it runs lexical analysis (plus sentence and passage specialists), checks each
habit with you, and writes a skill to `~/.claude/skills/my-writing-style/` that
Claude Code loads automatically in every project.

## Install

```bash
claude plugin install docwriter-org/style
```

## Use

```
/docwriter-style-generator
```

Or just ask Claude to learn your writing style — the skill triggers
automatically.

## How analysis works

Before any specialist reads the prose, the generator runs
`skills/docwriter-style-generator/scripts/analyze-style.mjs`. That is the same
checklist DocWriter uses: Leech and Short's *Style in Fiction*, starting with
the lexical family (A1–A5: general lexis, nouns, adjectives, verbs, adverbs).

```bash
node skills/docwriter-style-generator/scripts/analyze-style.mjs \
  --input sample.txt \
  --family lexical \
  --measured
```

`--measured` drops zero scores. `--family lexical` keeps only word-level
metrics. Pass several `--input` files so hapax rate and signature n-grams see
the whole sample.

The numbers are hints. The lexis specialist still has to quote your sentences.

```bash
node tests/lexical-analysis.mjs
```

## What it produces

A separate skill at `~/.claude/skills/my-writing-style/`:

```
my-writing-style/
  SKILL.md              ← "write like this person" instructions
  references/
    propositions.json   ← the habit data
    examples.md         ← your passages with key sentences highlighted
    source-manifest.json
    metrics.json        ← lexical and other measurements
  scripts/              ← analyzer, so you can re-run lexical analysis
```
