# docwriter-style-generator

Build a `my-writing-style` skill from your own prose.

Give it a few pieces of your writing — local files, URLs, or pasted text — and
it measures word-level habits, runs a multi-agent pass over words, sentences,
and passages, checks each habit with you, and writes a skill to
`~/.claude/skills/my-writing-style/` that Claude Code loads automatically in
every project.

## Install

Add the marketplace, then install the plugin.

From a Claude Code session:

```
/plugin marketplace add docwriter-org/style
/plugin install docwriter-style-generator@docwriter-style
```

From the terminal:

```bash
claude plugin marketplace add docwriter-org/style
claude plugin install docwriter-style-generator@docwriter-style
```


## Use

```
/docwriter-style-generator
```

Or just ask Claude to learn your writing style — the skill triggers
automatically. Run it again to add a source or update the habits.

## What it produces

A separate skill at `~/.claude/skills/my-writing-style/`:

```
my-writing-style/
  SKILL.md              ← "write like this person" instructions
  sources/              ← cleaned writing samples
  references/
    propositions.json   ← the habit data
    examples.md         ← your passages with key sentences highlighted
    source-manifest.json
    metrics.json        ← word-level measurements
  scripts/              ← analyzer the skill runs
```
