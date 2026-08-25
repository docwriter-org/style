# docwriter-style-generator

Build a `my-writing-style` skill from your own prose.

Give it a few pieces of your writing — local files, URLs, or pasted text — and
it measures word-level habits, runs a multi-agent pass over words, sentences,
and passages, checks each habit with you, and writes a skill that Claude Code
and Codex load automatically.

This is the same style-learning flow used in the
[DocWriter](https://docs.docwriter.org/customize/style) app.

## Install

Add the marketplace, then install the plugin.

### Claude Code

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

### Codex

From a Codex session:

```
/plugins
```

Add marketplace `docwriter-org/style`, then install `docwriter-style-generator`.

From the terminal:

```bash
codex plugin marketplace add docwriter-org/style
codex plugin add docwriter-style-generator@docwriter-style
```

## Update

Refresh the marketplace after we ship a change.

### Claude Code

From a Claude Code session:

```
/plugin marketplace update docwriter-style
```

From the terminal:

```bash
claude plugin marketplace update docwriter-style
```

### Codex

From a Codex session, open `/plugins` and refresh marketplace `docwriter-style`.

From the terminal:

```bash
codex plugin marketplace upgrade docwriter-style
```


## Use

Claude Code:

```
/docwriter-style-generator
```

Codex:

```
$docwriter-style-generator
```

Or just ask to learn your writing style — the skill triggers automatically.
Run it again to add a source or update the habits.

## What it produces

A separate skill at `~/.claude/skills/my-writing-style/` (Claude Code) and
`~/.agents/skills/my-writing-style/` (Codex):

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
