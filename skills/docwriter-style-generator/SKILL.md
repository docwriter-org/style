---
name: docwriter-style-generator
description: >-
  Build a writing style skill from your own prose. Measures word-level habits,
  then runs a multi-agent pass over words, sentences, and passages, and
  produces a portable my-writing-style skill that Claude Code loads
  automatically. Run /docwriter-style-generator to start, or let it trigger
  when you ask to learn or build a writing style.
---

# Build a writing style skill

This skill is a generator. It reads your writing, measures word-level habits
with the bundled analyzer, runs a multi-agent pass, checks each habit with
you, and writes a separate `my-writing-style` skill to
`~/.claude/skills/my-writing-style/` that Claude Code picks up automatically in
every project.

If `~/.claude/skills/my-writing-style/SKILL.md` already exists, ask:

```
AskUserQuestion:
  header: "Style skill"
  question: "You already have a writing style skill. What would you like to do?"
  options:
    - label: "Rebuild from scratch"
      description: "Start over with new writing samples"
    - label: "Keep it"
      description: "Nothing to do — your style skill is already active"
```

If they choose "Keep it", stop. Otherwise continue below.

## 1. Gather sources

Ask where their writing is:

```
AskUserQuestion:
  header: "Sources"
  question: "Where is your writing? I need 3–5 pieces (1000+ words each)."
  options:
    - label: "Local files"
      description: "I'll give you file paths or globs"
    - label: "URLs"
      description: "Blog posts, articles, docs — I'll give you links"
    - label: "I'll paste it"
      description: "I'll paste text directly"
    - label: "Mix"
      description: "Some files, some URLs, some pasted"
```

Based on their answer, ask for the paths/URLs/text. Read files with Read,
fetch URLs with WebFetch (extract the article body, strip nav/menus/footers/
cookie banners/bylines). Label each source by what the user calls it.

After gathering, confirm:

```
AskUserQuestion:
  header: "Sources"
  question: "I have N pieces. Ready to analyze, or add more?"
  options:
    - label: "Analyze these"
      description: "Start the style analysis"
    - label: "Add more"
      description: "I have more writing to add"
```

## 2. Analyze

Do not jump straight to impressions of word choice. Measure first, then read.

### 2a. Word-level measurements

This skill ships `scripts/analyze-style.mjs` next to this file. Run it on
every cleaned source in one invocation:

```bash
node scripts/analyze-style.mjs \
  --input /tmp/source-1.txt \
  --input /tmp/source-2.txt \
  --output /tmp/style-report.json \
  --words \
  --measured
```

`--words` keeps word-level scores. `--measured` drops zeros. A zero is not
evidence of a habit — do not invent absences from missing metrics.

The report is a hint for where to look: plain vs complex words, formal vs
casual, concrete vs abstract, contractions, hedges, signature phrases. Never
copy a rate or score into a proposition.

Tell the user you finished the word-level measurements, then start the
multi-agent pass.

### 2b. Multi-agent pass

Read all the sources. Find habits at three levels by running three parallel
Agent forks:

- **Words and phrases** — what words does this person reach for? Plain or
  complex, concrete or abstract, formal or casual. Contractions, hedges,
  signature phrases. Use the measurements from 2a here.
- **Sentences** — how are sentences built? Length variation, openers,
  coordination vs. subordination, punctuation rhythm, lists, parentheticals.
- **Passages** — how does the writing hang together? Paragraph transitions,
  parallelism, reader address, first person, stance, how other voices
  (quotes, citations) are handled.

Then merge: drop duplicates, drop vague advice any writer follows, drop
anything that leans on boilerplate rather than prose. Reword anything that
sounds like a linguistics lecture into plain advice. Prefer fewer sharp
habits over many soft ones.

Tell the user how many habits you found before moving to calibration.

### What a proposition looks like

```json
{
  "statement": "the habit, one sentence",
  "instruction": "what to do when writing (imperative)",
  "examples": ["verbatim passage 1", "verbatim passage 2", "verbatim passage 3"],
  "focus": ["the key sentence in passage 1", "...", "..."],
  "contrast": {
    "passage": "20-60 word verbatim excerpt that shows the habit",
    "rewritten": "same passage rewritten without the habit"
  }
}
```

Rules that matter:

- **Examples must be verbatim.** Copy word for word from the sources. No
  invention. If you cannot find three real examples, drop the proposition.
- **Examples are passages, not sentences.** Quote 3-4 consecutive sentences
  so the reader sees the habit in context. Set the focus to the one sentence
  the habit is actually about.
- **Contrasts are short.** 20-60 words. The writer will see both versions
  side by side and pick which sounds like them. The rewrite must be
  competent prose — the question is preference, not quality.
- **One habit per sentence.** No two propositions should claim the same
  focus sentence or contrast passage. If they do, merge them.
- **Plain language.** No "register," "discourse markers," "rhetorical
  moves," "modality." Say what to do in the sentence.

## 3. Calibrate

For each proposition, show the writer its contrast pair. Use AskUserQuestion
with previews. Randomize which slot (A or B) gets the original vs. the
rewrite. Batch 3–4 propositions per question to keep it moving.

```
AskUserQuestion:
  header: "Voice check"
  question: "Which sounds more like your writing?"
  options:
    - label: "A"
      preview: <candidate A text>
    - label: "B"
      preview: <candidate B text>
    - label: "Neither"
      description: "Both miss the mark — skip this one"
```

Writer picks original → keep. Writer picks rewrite or neither → drop.

After all calibrations, report how many survived and ask to confirm:

```
AskUserQuestion:
  header: "Results"
  question: "N out of M habits confirmed. Save as your writing style?"
  options:
    - label: "Save it"
      description: "Write the skill to ~/.claude/skills/my-writing-style/"
    - label: "Start over"
      description: "Discard and try with different samples"
```

## 4. Write the my-writing-style skill

Write a complete skill to `~/.claude/skills/my-writing-style/`. Create the
directory if it does not exist.

### SKILL.md

```markdown
---
name: my-writing-style
description: >-
  Apply the learned writing style when drafting or revising prose. Follow these
  habits where they fit; ignore any that would make the sentence worse.
---

# Learned author style

These are tendencies learned from a few pieces of writing, not rules. Follow
them where they fit; ignore any that would make the sentence worse. A draft
that mechanically hits every instruction reads like an imitation.

Do not copy subject matter, facts, or turns of phrase from the examples —
only how the sentences are built.

The user's own rules and requests always win over these instructions.

## <level heading>

* <instruction>

  > <example passage — **bold** the focus sentence>

  > <another example>

  > <another example>

(repeat for each proposition, grouped by level: words, sentences, passages)
```

Group propositions by level. Three longest examples per proposition, longest
first. Bold the focus sentence in each.

### references/propositions.json

The full proposition objects as a JSON array.

### references/examples.md

All examples grouped by proposition statement, focus sentences bolded.

### references/source-manifest.json

`[{ "label": "...", "wordCount": 123 }]` for each source used.

### references/metrics.json

The analyzer report from step 2a.

### scripts/

Copy this skill's `scripts/` folder into the generated skill so later passes
can re-run the word-level measurements:

```
scripts/analyze-style.mjs
scripts/style-metrics.mjs
scripts/style-metric-registry.mjs
scripts/style-data.json
```

After writing, tell the user their style skill is active and will load
automatically in every Claude Code session.
