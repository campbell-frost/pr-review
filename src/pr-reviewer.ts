import Anthropic from "@anthropic-ai/sdk";
import type { Config } from "./config.js";
import { ReviewError } from "./errors.js";
import type { ILogger } from "./logger.js";
import type { PRFile, PRInfo, ReviewResult } from "./types.js";
import { formatForPrompt } from "./diff.js";

const SYSTEM_PROMPT = `You are an expert code reviewer. You will be given a GitHub pull request — its title,
description, and diff — and you must produce a thorough review.

Your response MUST be a single valid JSON object with this exact shape:
{
  "summary": "<overall review as markdown>",
  "verdict": "<APPROVE | COMMENT | REQUEST_CHANGES>",
  "comments": [
    {
      "path": "<file path exactly as shown in the diff>",
      "line": <right-side line number from the [Lnnnn] prefix>,
      "body": "<comment text as markdown>"
    }
  ]
}

Rules:
- verdict must be APPROVE if the PR is correct and safe, COMMENT for minor notes,
  REQUEST_CHANGES for bugs or serious issues.
- Each comment line must come directly from a [Lnnnn] label in the diff. Do NOT
  invent line numbers.
- Only comment on lines prefixed with [Lnnnn] in the diff.
- body should be concise and actionable. Use markdown code fences where helpful.
- If there are no inline comments, return an empty array for comments.
- Output raw JSON only — no markdown fences, no extra text.`;

export class PRReviewer {
  private readonly client: Anthropic;

  constructor(
    private readonly config: Config,
    private readonly logger: ILogger,
  ) {
    this.client = new Anthropic({ apiKey: config.anthropicApiKey });
  }

  async review(pr: PRInfo, files: PRFile[]): Promise<ReviewResult> {
    const prompt = this.buildPrompt(pr, files);
    this.logger.debug("Sending prompt to Claude...");

    const response = await this.client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("");

    const result = this.parseResponse(raw);

    this.logger.info(
      `Review complete — verdict: ${result.verdict}, comments: ${result.comments.length.toString()}`,
    );

    return result;
  }

  private buildPrompt(pr: PRInfo, files: PRFile[]): string {
    const description = pr.body.trim() !== "" ? pr.body : "(no description provided)";
    const diff = formatForPrompt(files);

    return `## PR #${pr.number.toString()}: ${pr.title}

### Description
${description}

### Diff
${diff}`;
  }

  private parseResponse(raw: string): ReviewResult {
    this.logger.debug(`Raw Claude response: ${raw}`);

    const fenceMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/m.exec(raw.trim());
    const json = fenceMatch?.[1] ?? raw.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new ReviewError("Failed to parse Claude response as JSON", raw);
    }

    const result = parsed as ReviewResult;

    const validVerdicts = ["APPROVE", "COMMENT", "REQUEST_CHANGES"] as const;
    if (!validVerdicts.includes(result.verdict)) {
      this.logger.warn(`Unexpected verdict "${result.verdict}", defaulting to COMMENT`);
      result.verdict = "COMMENT";
    }

    return result;
  }
}
