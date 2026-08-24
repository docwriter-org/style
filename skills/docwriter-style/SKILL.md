---
name: docwriter-style
description: >-
  The user's writing style. Applies learned habits when drafting or revising
  prose. If no style profile exists yet, prompts the user for writing samples
  and builds one.
---

# Writing style

First, check whether a profile exists: try to Read
`~/.claude/skills/docwriter-style/references/propositions.json`.

If it exists and contains propositions, read
`~/.claude/skills/docwriter-style/references/style-profile.md` and follow
those instructions when drafting or revising prose. The user's own rules and
requests always win. Done — stop here.

If the file is missing or empty, the user has no style profile yet. Tell them
and ask for writing samples so you can build one. Follow the learning pipeline
below.

---

# Learning pipeline

## 1. Gather sources

Accept whatever the user gives you: file paths (use Read), URLs (use
WebFetch — extract the article body, skip nav/chrome), or pasted text. Three
to five pieces, 1000+ words each, is the sweet spot. Fewer is fine — mention
it and move on. Label each source by what the user calls it.

If a source is from a web page, strip everything that is not the author's
prose: menus, bylines, share buttons, cookie banners, footers, URLs.

## 2. Analyze

Read all the sources. Find habits at three levels:

- **Words and phrases** — what words does this person reach for? Plain or
  complex, concrete or abstract, formal or casual. Contractions, hedges,
  signature phrases.
- **Sentences** — how are sentences built? Length variation, openers,
  coordination vs. subordination, punctuation rhythm, lists, parentheticals.
- **Passages** — how does the writing hang together? Paragraph transitions,
  parallelism, reader address, first person, stance, how other voices
  (quotes, citations) are handled.

Run these three as parallel Agent forks against the sources. Each fork
returns its findings as propositions (see format below). Then merge: drop
duplicates, drop vague advice any writer follows, drop anything that leans
on boilerplate text rather than the author's prose. Reword anything that
sounds like a linguistics lecture into plain advice. Prefer fewer sharp
habits over many soft ones.

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

For each proposition, show the writer its contrast pair and ask which
version sounds more like their writing. Use AskUserQuestion with previews.
Randomize which slot gets the original vs. the rewrite.

```
question: "<statement> — which sounds more like you?"
options:
  A: [preview: candidate A]
  B: [preview: candidate B]
  Neither: skip this one
```

Writer picks original → keep. Writer picks rewrite or neither → drop.
Batch 3-4 per question to keep it moving.

Tell the user how many survived.

## 4. Write the profile

Write the results into this skill's own directory at
`~/.claude/skills/docwriter-style/references/`. Create the directory if it
does not exist.

### references/style-profile.md

The style instructions that future invocations will follow. Format:

```markdown
# Learned style profile

These are tendencies learned from a few pieces of writing, not rules. Follow
them where they fit; ignore any that would make the sentence worse. A draft
that mechanically hits every instruction reads like an imitation.

Do not copy subject matter, facts, or turns of phrase from the examples —
only how the sentences are built.

## <family heading>

* <instruction>

  > <example passage — **bold** the focus sentence>

  > <another example>

  > <another example>
```

Group propositions by level (words, sentences, passages). Three longest
examples per proposition, longest first. Bold the focus sentence in each.

### references/propositions.json

The full proposition objects as a JSON array.

### references/examples.md

All examples grouped by proposition statement, focus sentences bolded.

### references/source-manifest.json

`[{ "label": "...", "wordCount": 123 }]` for each source used.
