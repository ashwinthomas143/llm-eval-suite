import type { PairedCase, PairedJudge } from "./types";

export interface PositionBiasResult {
  /** What the judge said with (A, B) in original order. */
  originalWinner: "A" | "B" | "tie";
  /** What the judge said with the same two answers swapped to (B, A). */
  swappedWinner: "A" | "B" | "tie";
  /**
   * True if the judge picked whichever answer was presented FIRST both
   * times, regardless of which underlying answer that was — the
   * specific pattern documented in
   * learn-ai/ai-testing-learning-plan.md as position bias: "a judge
   * model that picks the first presented answer most of the time,
   * regardless of actual quality, is measuring position, not
   * correctness."
   */
  showsPositionBias: boolean;
}

/**
 * Runs a paired judge twice — once in the given order, once with the
 * two answers swapped — and checks whether the verdict tracks *position*
 * (first vs. second) instead of *content* (answerA vs. answerB).
 *
 * A judge without position bias should reach the same conclusion about
 * which underlying answer is better regardless of which slot it's
 * presented in. If it instead always favors "whichever came first,"
 * this returns showsPositionBias: true.
 */
export async function checkPositionBias(
  judge: PairedJudge,
  input: PairedCase
): Promise<PositionBiasResult> {
  const original = await judge(input.source, input.question, input.answerA, input.answerB);
  const swapped = await judge(input.source, input.question, input.answerB, input.answerA);

  // Map each result back to "which underlying answer won" so the two
  // calls are comparable regardless of slot order.
  const originalWinnerAnswer = original.winner === "A" ? "A" : original.winner === "B" ? "B" : "tie";
  const swappedWinnerAnswer = swapped.winner === "A" ? "B" : swapped.winner === "B" ? "A" : "tie";

  // Position bias: the judge picked "first" both times (A when A was
  // first, then B when B was moved to first) rather than tracking the
  // same underlying answer as the winner in both runs.
  const pickedFirstBothTimes = original.winner === "A" && swapped.winner === "A";

  const showsPositionBias =
    pickedFirstBothTimes && originalWinnerAnswer !== swappedWinnerAnswer;

  return {
    originalWinner: original.winner,
    swappedWinner: swapped.winner,
    showsPositionBias,
  };
}
