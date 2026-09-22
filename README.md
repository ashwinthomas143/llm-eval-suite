# llm-eval-suite

[![CI](https://github.com/ashwinthomas143/llm-eval-suite/actions/workflows/ci.yml/badge.svg)](https://github.com/ashwinthomas143/llm-eval-suite/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A small, real LLM-as-judge evaluation harness — groundedness scoring
plus a detector for a specific, documented failure mode in the judge
itself: position bias.

## Why this exists

The other repos in this portfolio (`api-test-suite`, `ui-test-suite`,
`ai-test-reviewer`) all demonstrate *using* AI to build and review test
code. This one is different on purpose: it tests an **AI system's own
output**, which is a distinct skill — checking whether a generated
answer is actually supported by its source, not just whether the code
that produced it runs without error.

## The two things this actually checks

**1. Groundedness** — given a source document, a question, and a
generated answer, is the answer fully supported by the source, or does
it contain a plausible-sounding claim the source never actually made?
That second case is a hallucination a naive "did it respond" check
would never catch.

**2. Position bias in the judge itself** — a judge model that
consistently favors whichever answer it sees *first*, regardless of
which one is actually better, is measuring position, not quality. The
harness checks for this directly: run the same pair of answers through
the judge twice, once in each order, and see whether the verdict tracks
the *content* or just the *slot*.

## What's actually verified right now, honestly

This repo's own test suite (`npm test`, 12 tests, all passing,
`tsc --noEmit` clean) verifies the **harness logic** — prompt
construction, response parsing (including tolerating a model that wraps
its JSON in a sentence despite being told not to), and the position-bias
detection mechanism itself, proven against a deliberately-biased fake
judge and a genuinely correct one — all without needing a live model
call.

**The actual Claude-backed judge (`claudeJudge` in `src/judge.ts`) is
real, correctly wired code, not a mockup — but it requires
`ANTHROPIC_API_KEY` to run, which isn't set in this environment.**
Same gated-optional pattern as `scripts/summarize-results.js` in
`api-test-suite` and `ui-test-suite`: the feature is real and will work
the moment a key is provided, and nothing here claims it was run live
without one.

## Running it

```bash
npm install
npm test              # the 12 deterministic tests, no API key needed
```

To actually call Claude and judge a real case:

```bash
export ANTHROPIC_API_KEY=sk-...
```

```ts
import { claudeJudge } from "./src/judge";

const result = await claudeJudge({
  source: "nesto is a Canadian fintech founded in Montreal in 2018.",
  question: "Where was nesto founded?",
  answer: "nesto was founded in Toronto.", // wrong on purpose
});
// Expect verdict: "ungrounded" — the source says Montreal, not Toronto.
```

Built as part of the same discipline documented in the case log at
[my portfolio](https://claude.ai/artifact/Fnnwnje4ZZfoczcGAsgLsF) — see
also [`api-test-suite`](https://github.com/ashwinthomas143/api-test-suite),
[`ui-test-suite`](https://github.com/ashwinthomas143/ui-test-suite), and
[`ai-test-reviewer`](https://github.com/ashwinthomas143/ai-test-reviewer).

## What this doesn't do yet

- **No live-run results yet** — the `claudeJudge` path is correct but
  unverified against a real model in this repo, honestly, since no key
  was available while building it. Worth running for real before citing
  specific pass/fail numbers from the live judge.
- **Position-bias check only covers pairwise comparison**, not the
  single-answer groundedness judge — a real v1 addition would be
  checking whether `claudeJudge` itself is sensitive to answer length or
  phrasing confidence, not just order.
- **No retrieval step** — this scores groundedness against a source
  that's already given, not a full RAG pipeline that also has to find
  the right source first. That's a different, larger problem.

## License

MIT — see `LICENSE`.
