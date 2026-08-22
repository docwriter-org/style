# docwriter-style

A Claude Code plugin that learns your writing style from samples and produces
a portable style skill you can drop into any project.

Give it a few pieces of your writing — local files, URLs, or pasted text — and
it reads them, finds your habits at the word, sentence, and passage level,
checks each one with you, and writes a skill file that teaches Claude to write
like you.

## Install

```bash
claude plugin install docwriter-org/style
```

Or for local development:

```bash
claude --plugin-dir /path/to/docwriter-style
```

## Use

```
/docwriter-style
```

Then point it at your writing: file paths, URLs, or paste text directly.

## What it produces

A skill folder you can drop into any project's `.claude/skills/`:

```
author-style/
  SKILL.md              ← the style instructions Claude follows
  references/
    examples.md         ← your passages with key sentences highlighted
    propositions.json   ← the full habit data
    source-manifest.json
```
