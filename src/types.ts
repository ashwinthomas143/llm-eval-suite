export interface GroundednessCase {
  source: string;
  question: string;
  answer: string;
}

export type Verdict = "grounded" | "ungrounded";

export interface JudgeResult {
  verdict: Verdict;
  confidence: number; // 0-1
  reasoning: string;
}

/**
 * A judge is anything that can score a (source, question, answer) triple.
 * The real implementation calls Claude; tests use deterministic stand-ins
 * so the harness logic can be verified without a live API call.
 */
export type Judge = (input: GroundednessCase) => Promise<JudgeResult>;

/** Same case, but with two candidate answers to compare (position-bias test). */
export interface PairedCase {
  source: string;
  question: string;
  answerA: string;
  answerB: string;
}

export type PairVerdict = "A" | "B" | "tie";

export interface PairedJudgeResult {
  winner: PairVerdict;
  reasoning: string;
}

export type PairedJudge = (
  source: string,
  question: string,
  first: string,
  second: string
) => Promise<PairedJudgeResult>;
