import type { GitHubClient } from "./github-client.js";
import type { ILogger } from "./logger.js";
import type { PRReviewer } from "./pr-reviewer.js";

export class ReviewOrchestrator {
  constructor(
    private readonly github: GitHubClient,
    private readonly reviewer: PRReviewer,
    private readonly logger: ILogger,
  ) {}

  async run(): Promise<void> {
    this.logger.info("Fetching PR info and files...");
    const [pr, files] = await Promise.all([this.github.getPR(), this.github.getPRFiles()]);

    this.logger.info(
      `Reviewing PR #${pr.number.toString()}: ${pr.title} (${files.length.toString()} file(s))`,
    );

    const review = await this.reviewer.review(pr, files);

    this.logger.info(
      `Posting review — verdict: ${review.verdict}, comments: ${review.comments.length.toString()}`,
    );
    await this.github.postReview(files, review);

    this.logger.info("Done.");
  }
}
