import { Octokit } from "@octokit/rest";
import type { Config } from "./config.js";
import { GitHubError } from "./errors.js";
import type { ILogger } from "./logger.js";
import type { PRFile, PRInfo, ReviewComment, ReviewResult } from "./types.js";
import { getCommentableLines } from "./diff.js";

export class GitHubClient {
  private readonly octokit: Octokit;

  constructor(
    private readonly config: Config,
    private readonly logger: ILogger,
  ) {
    this.octokit = new Octokit({ auth: config.githubToken });
  }

  async getPR(): Promise<PRInfo> {
    try {
      const { data } = await this.octokit.rest.pulls.get({
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: this.config.prNumber,
      });
      return {
        number: data.number,
        title: data.title,
        body: data.body ?? "",
      };
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async getPRFiles(): Promise<PRFile[]> {
    try {
      const files = await this.octokit.paginate(this.octokit.rest.pulls.listFiles, {
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: this.config.prNumber,
        per_page: 100,
      });
      return files.map((entry) => ({
        filename: entry.filename,
        status: entry.status,
        patch: entry.patch,
      }));
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  async postReview(files: PRFile[], review: ReviewResult): Promise<void> {
    const commentableByFile = new Map<string, Set<number>>();
    for (const file of files) {
      if (file.patch !== undefined) {
        commentableByFile.set(file.filename, getCommentableLines(file.patch));
      }
    }

    const validComments: ReviewComment[] = [];
    for (const comment of review.comments) {
      const commentableLines = commentableByFile.get(comment.path);
      if (commentableLines === undefined || !commentableLines.has(comment.line)) {
        this.logger.warn(
          `Dropping comment on ${comment.path}:${comment.line.toString()} — line not commentable in diff`,
        );
        continue;
      }
      validComments.push(comment);
    }

    try {
      await this.octokit.rest.pulls.createReview({
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: this.config.prNumber,
        body: review.summary,
        event: review.verdict,
        comments: validComments.map((c) => ({
          path: c.path,
          line: c.line,
          side: "RIGHT",
          body: c.body,
        })),
      });
    } catch (err) {
      throw this.wrapError(err);
    }
  }

  private wrapError(err: unknown): GitHubError {
    if (
      typeof err === "object" &&
      err !== null &&
      "status" in err &&
      "message" in err &&
      typeof (err as { status: unknown }).status === "number"
    ) {
      const e = err as { status: number; message: string };
      return new GitHubError(e.status, "github api", e.message);
    }
    return new GitHubError(0, "github api", String(err));
  }
}
