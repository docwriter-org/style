---
name: docwriter-style-generator
description: >-
  Build a writing style skill from your own prose. Runs lexical analysis plus
  sentence and passage specialists, then produces a portable my-writing-style
  skill that Claude Code loads automatically. Run /docwriter-style-generator to
  start, or let it trigger when you ask to learn or build a writing style.
---

# Build a writing style skill

This skill is a generator. It reads your writing, measures lexical habits with
the bundled analyzer, distills those habits, checks each one with you, and
writes a separate `my-writing-style` skill to
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

Do not jump straight to impressions of word choice. First measure the writing,
then read it. The lexical pass is the measurement step — without it the
word-level habits are guesses.

### 2a. Lexical analysis (required)

This skill ships a deterministic analyzer next to this file:

`scripts/analyze-style.mjs`

It scores the Leech and Short *Style in Fiction* checklist. Lexical metrics
are the `lexical.*` family:

- **A1 general lexis** — complexity, formality, concreteness, contractions,
  idioms, rare words, hapax, MATTR, lexical density, signature n-grams
- **A2 nouns** — abstract nouns, proper nouns
- **A3 adjectives** — rate, intensifiers, attributive vs predicative
- **A4 verbs** — stative, transitive, factive
- **A5 adverbs** — -ly adverbs, stance, hedges, boosters, discourse markers

Steps:

1. Write each cleaned source to its own temp file.
2. Find this skill's directory (the folder that contains this `SKILL.md`).
3. Run the analyzer on every source in one invocation so corpus metrics
   (hapax rate, signature n-grams) see the whole sample:

```bash
node scripts/analyze-style.mjs \
  --input /tmp/source-1.txt \
  --input /tmp/source-2.txt \
  --output /tmp/style-report.json \
  --measured
```

Use `--family lexical` when you only need the lexis slice. Omit it to keep
grammatical, figures, and cohesion measurements for the other specialists.

4. Read `/tmp/style-report.json`. `--measured` already dropped zeros. A zero
   is not evidence of a habit — do not invent absences from missing metrics.
5. Tell the user you finished lexical analysis and how many lexical
   measurements fired before opening the specialist forks.

Treat the numbers as hints for where to look. Never copy a rate or score into
a proposition statement.

`compromise` is optional. If it is installed, a few POS-backed metrics get
sharper; the rest of the lexical checklist still runs without it.

### 2b. Specialists

Read all the sources. Find habits at three levels by running three parallel
Agent forks. Give each fork the filtered measurements for its families plus
the source texts.

- **Lexis (words)** — family `lexical`. Unit of analysis: the word and short
  phrase. Ask what words this person reaches for: plain or complex, formal or
  conversational, concrete or abstract, neutral or judgmental, common or
  specialized. Look for contractions, nominalizations, idioms, signature
  phrases, adjective and verb choices, hedges, boosters, and stance words. Do
  not make claims about sentence construction, punctuation, or paragraph
  linkage.
- **Grammar (sentences)** — family `grammatical`. Unit of analysis: the
  sentence and clause. Ask how sentences are built: length variation, openers,
  coordination vs. subordination, punctuation rhythm, lists, parentheticals.
  Do not make claims about vocabulary as such or about links across
  paragraphs.
- **Discourse (passages)** — families `figures` and `cohesion-context`. Unit
  of analysis: the paragraph and passage. Ask how the writing hangs together:
  paragraph transitions, parallelism, reader address, first person, stance,
  quotes and citations. Do not make claims about isolated word choice.

Then merge: drop duplicates, drop vague advice any writer follows, drop
anything that leans on boilerplate rather than prose. Reword anything that
sounds like a linguistics lecture into plain advice. Prefer fewer sharp
habits over many soft ones.

Tell the user how many habits you found before moving to calibration.

### What a proposition looks like

```json
{
  "family": "lexical",
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

`family` is one of `lexical`, `grammatical`, `figures`, `cohesion-context`.

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

## <family heading>

* <instruction>

  > <example passage — **bold** the focus sentence>

  > <another example>

  > <another example>

(repeat for each proposition, grouped by family: lexical, grammatical,
figures, cohesion-context)
```

Group propositions by family. Three longest examples per proposition, longest
first. Bold the focus sentence in each.

### references/propositions.json

The full proposition objects as a JSON array.

### references/examples.md

All examples grouped by proposition statement, focus sentences bolded.

### references/source-manifest.json

`[{ "label": "...", "wordCount": 123 }]` for each source used.

### references/metrics.json

The analyzer report from step 2a (measurements and conventions). This is how
the lexical analysis travels with the skill.

### scripts/

Copy this skill's `scripts/` folder into the generated skill so later passes
can re-run lexical analysis on new drafts:

```
scripts/analyze-style.mjs
scripts/style-metrics.mjs
scripts/style-metric-registry.mjs
scripts/style-data.json
```

After writing, tell the user their style skill is active and will load
automatically in every Claude Code session.
