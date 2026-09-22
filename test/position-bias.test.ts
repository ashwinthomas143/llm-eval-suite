import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPositionBias } from "../src/position-bias";
import type { PairedJudge } from "../src/types";

const CASE = {
  source: "Paris is the capital of France.",
  question: "What is the capital of France?",
  answerA: "Paris.",
  answerB: "Lyon.", // deliberately the wrong answer, so a good judge should always prefer A
};

test("detects a judge that always picks whichever answer came first, regardless of content", async () => {
  // A deliberately broken judge: ignores the actual answers and just
  // returns "A" every time, i.e. "whichever is first." This proves the
  // detection mechanism itself works, without needing a real model —
  // the mechanism is what's under test here, not any particular judge.
  const biasedJudge: PairedJudge = async () => ({
    winner: "A",
    reasoning: "picked first slot regardless of content",
  });

  const result = await checkPositionBias(biasedJudge, CASE);

  assert.equal(result.showsPositionBias, true);
});

test("does not flag a judge that correctly tracks the better answer across both orders", async () => {
  // A genuinely good judge: correctly identifies "Paris" as the better
  // answer whether it's presented first or second.
  const goodJudge: PairedJudge = async (_source, _question, first, second) => {
    if (first === "Paris.") return { winner: "A", reasoning: "Paris is correct" };
    if (second === "Paris.") return { winner: "B", reasoning: "Paris is correct" };
    return { winner: "tie", reasoning: "neither mentions Paris" };
  };

  const result = await checkPositionBias(goodJudge, CASE);

  assert.equal(result.showsPositionBias, false);
});

test("does not flag a judge that consistently returns a tie", async () => {
  const tieJudge: PairedJudge = async () => ({ winner: "tie", reasoning: "can't distinguish" });

  const result = await checkPositionBias(tieJudge, CASE);

  assert.equal(result.showsPositionBias, false);
});
