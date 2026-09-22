import type { GroundednessCase, JudgeResult, Verdict } from "./types";

/**
 * Builds the judge prompt. Pure function, no API call — testable on its
 * own so the prompt structure can be verified without spending a real
 * request.
 */
export function buildGroundednessPrompt(input: GroundednessCase): string {
  return [
    "You are a strict fact-checker. Given a SOURCE document, a QUESTION",
    "that was asked about it, and an ANSWER that was generated, decide",
    "whether the ANSWER is fully supported by the SOURCE.",
    "",
    "Respond with ONLY a JSON object, no other text:",
    '{"verdict": "grounded" | "ungrounded", "confidence": <0 to 1>, "reasoning": "<one sentence>"}',
    "",
    '"grounded" means every claim in the answer is directly supported by',
    'the source. "ungrounded" means the answer contains at least one claim',
    "the source does not actually support — including claims that sound",
    "plausible but were invented, and claims that are true in general but",
    "not stated in this specific source.",
    "",
    `SOURCE:\n${input.source}`,
    "",
    `QUESTION:\n${input.question}`,
    "",
    `ANSWER:\n${input.answer}`,
  ].join("\n");
}

/**
 * Parses a judge's raw text response into a structured result. Pure
 * function — the actual thing under test in groundedness.test.ts,
 * since a judge that can't be parsed reliably isn't a usable judge no
 * matter how good its underlying reasoning is.
 */
export function parseJudgeResponse(raw: string): JudgeResult {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error(`Judge response contained no JSON object: ${raw}`);
  }

  const parsed = JSON.parse(match[0]);

  if (parsed.verdict !== "grounded" && parsed.verdict !== "ungrounded") {
    throw new Error(`Judge returned an invalid verdict: ${parsed.verdict}`);
  }
  if (typeof parsed.confidence !== "number" || parsed.confidence < 0 || parsed.confidence > 1) {
    throw new Error(`Judge returned an invalid confidence: ${parsed.confidence}`);
  }

  return {
    verdict: parsed.verdict as Verdict,
    confidence: parsed.confidence,
    reasoning: String(parsed.reasoning ?? ""),
  };
}

/**
 * The real judge. Calls Claude to actually score groundedness.
 *
 * Requires ANTHROPIC_API_KEY — not required to run this repo's test
 * suite (see test/groundedness.test.ts, which tests buildGroundednessPrompt
 * and parseJudgeResponse directly instead), same gated-optional pattern
 * as scripts/summarize-results.js in api-test-suite and ui-test-suite.
 */
export async function claudeJudge(input: GroundednessCase): Promise<JudgeResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "claudeJudge requires ANTHROPIC_API_KEY. This is intentional — see README.md."
    );
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 300,
      messages: [{ role: "user", content: buildGroundednessPrompt(input) }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status} ${await response.text()}`);
  }

  const body = (await response.json()) as { content?: Array<{ text?: string }> };
  const text = body.content?.[0]?.text ?? "";
  return parseJudgeResponse(text);
}
