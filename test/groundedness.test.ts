import { test } from "node:test";
import assert from "node:assert/strict";
import { buildGroundednessPrompt, parseJudgeResponse } from "../src/judge";

test("buildGroundednessPrompt includes the source, question, and answer verbatim", () => {
  const prompt = buildGroundednessPrompt({
    source: "The mitochondria is the powerhouse of the cell.",
    question: "What is the powerhouse of the cell?",
    answer: "The mitochondria.",
  });

  assert.match(prompt, /The mitochondria is the powerhouse of the cell\./);
  assert.match(prompt, /What is the powerhouse of the cell\?/);
  assert.match(prompt, /The mitochondria\./);
  assert.match(prompt, /"grounded" \| "ungrounded"/);
});

test("parseJudgeResponse accepts a well-formed grounded verdict", () => {
  const raw = '{"verdict": "grounded", "confidence": 0.95, "reasoning": "Directly supported."}';
  const result = parseJudgeResponse(raw);
  assert.equal(result.verdict, "grounded");
  assert.equal(result.confidence, 0.95);
  assert.equal(result.reasoning, "Directly supported.");
});

test("parseJudgeResponse accepts a well-formed ungrounded verdict", () => {
  const raw = '{"verdict": "ungrounded", "confidence": 0.8, "reasoning": "Source never mentions this."}';
  const result = parseJudgeResponse(raw);
  assert.equal(result.verdict, "ungrounded");
});

test("parseJudgeResponse tolerates surrounding prose around the JSON", () => {
  // Real model responses sometimes wrap the JSON in a sentence despite
  // being asked not to — the parser needs to survive that, not just the
  // ideal case.
  const raw = 'Here is my assessment:\n{"verdict": "grounded", "confidence": 0.7, "reasoning": "ok"}\nHope that helps!';
  const result = parseJudgeResponse(raw);
  assert.equal(result.verdict, "grounded");
});

test("parseJudgeResponse rejects a response with no JSON object", () => {
  assert.throws(() => parseJudgeResponse("I think it's fine."), /contained no JSON object/);
});

test("parseJudgeResponse rejects an invalid verdict value", () => {
  const raw = '{"verdict": "sort-of", "confidence": 0.5, "reasoning": "unclear"}';
  assert.throws(() => parseJudgeResponse(raw), /invalid verdict/);
});

test("parseJudgeResponse rejects a confidence outside 0-1", () => {
  const raw = '{"verdict": "grounded", "confidence": 1.5, "reasoning": "too sure"}';
  assert.throws(() => parseJudgeResponse(raw), /invalid confidence/);
});

// Real fixture pair, not run through a live judge in this repo's own
// test suite (no ANTHROPIC_API_KEY here) but documented as the actual
// case this whole project exists to catch — see README.md.
test("fixture: a genuinely grounded answer", () => {
  const prompt = buildGroundednessPrompt({
    source: "nesto is a Canadian fintech founded in Montreal in 2018.",
    question: "Where was nesto founded?",
    answer: "nesto was founded in Montreal.",
  });
  assert.match(prompt, /Montreal/);
});

test("fixture: a plausible-sounding but ungrounded answer", () => {
  // The source never states a founding year for this fictional example
  // — a hallucinating model might invent one anyway because it "sounds
  // right," which is exactly the failure mode claudeJudge exists to catch.
  const prompt = buildGroundednessPrompt({
    source: "Acme Corp builds industrial sensors for manufacturing plants.",
    question: "When was Acme Corp founded?",
    answer: "Acme Corp was founded in 1987.",
  });
  assert.match(prompt, /Acme Corp builds industrial sensors/);
  assert.match(prompt, /1987/);
});
