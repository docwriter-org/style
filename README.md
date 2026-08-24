# docwriter-style-generator

Build a `my-writing-style` skill from your own prose.

Give it a few pieces of your writing — local files, URLs, or pasted text — and
it analyzes your habits at the word, sentence, and passage level, checks each
one with you, and writes a skill to `~/.claude/skills/my-writing-style/` that
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

## What it produces

A separate skill at `~/.claude/skills/my-writing-style/`:

```
my-writing-style/
  SKILL.md              ← "write like this person" instructions
  references/
    propositions.json   ← the habit data
    examples.md         ← your passages with key sentences highlighted
    source-manifest.json
```
