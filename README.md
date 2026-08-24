# docwriter-style

Your writing style as a Claude Code skill.

The first time it loads, it asks for writing samples — local files, URLs, or
pasted text — and learns your habits at the word, sentence, and passage level.
After that, it applies the learned style whenever you draft or revise prose.

One skill, two modes: learn, then apply.

## Install

```bash
claude plugin install docwriter-org/style
```

## Use

The skill loads automatically. If no profile exists yet, it prompts you for
samples. To rebuild from scratch, delete `~/.claude/skills/docwriter-style/references/`
and it will ask again.

Works standalone in any Claude Code session. If you also use DocWriter, it
picks up the same profile automatically.
