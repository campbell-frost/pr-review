import { Config } from "./config.js";
import { ConfigError, GitHubError, ReviewError } from "./errors.js";
import { GitHubClient } from "./github-client.js";
import { Logger } from "./logger.js";
import { ReviewOrchestrator } from "./orchestrator.js";
import { PRReviewer } from "./pr-reviewer.js";

async function main(): Promise<void> {
  let config: Config;
  try {
    config = Config.fromEnv();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
    } else {
      console.error("Unexpected error during configuration", err);
    }
    process.exit(1);
  }

  const logger = new Logger(config.logLevel);

  try {
    const github = new GitHubClient(config, logger);
    const reviewer = new PRReviewer(config, logger);
    const orchestrator = new ReviewOrchestrator(github, reviewer, logger);
    await orchestrator.run();
  } catch (err) {
    if (err instanceof ConfigError) {
      logger.error(err.message);
    } else if (err instanceof GitHubError) {
      logger.error(err.message, err);
    } else if (err instanceof ReviewError) {
      logger.error(err.message, err);
    } else {
      logger.error("Unexpected error", err);
    }
    process.exit(1);
  }
}

await main();
