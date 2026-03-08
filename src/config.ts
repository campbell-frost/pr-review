import { ConfigError } from "./errors.js";
import type { LogLevel } from "./logger.js";

const VALID_LOG_LEVELS: readonly LogLevel[] = ["debug", "info", "warn", "error"];

function isLogLevel(value: string): value is LogLevel {
  return (VALID_LOG_LEVELS as readonly string[]).includes(value);
}

export class Config {
  private constructor(
    readonly githubToken: string,
    readonly anthropicApiKey: string,
    readonly owner: string,
    readonly repo: string,
    readonly prNumber: number,
    readonly logLevel: LogLevel,
  ) {}

  static fromEnv(): Config {
    const githubToken = process.env["GITHUB_TOKEN"];
    if (!githubToken) {
      throw new ConfigError("Missing required environment variable: GITHUB_TOKEN");
    }

    const anthropicApiKey = process.env["ANTHROPIC_API_KEY"];
    if (!anthropicApiKey) {
      throw new ConfigError("Missing required environment variable: ANTHROPIC_API_KEY");
    }

    const githubRepository = process.env["GITHUB_REPOSITORY"];
    if (!githubRepository) {
      throw new ConfigError("Missing required environment variable: GITHUB_REPOSITORY");
    }

    const slashIndex = githubRepository.indexOf("/");
    if (slashIndex === -1) {
      throw new ConfigError(
        `Invalid GITHUB_REPOSITORY format (expected "owner/repo"): ${githubRepository}`,
      );
    }
    const owner = githubRepository.slice(0, slashIndex);
    const repo = githubRepository.slice(slashIndex + 1);

    const prNumberRaw = process.env["PR_NUMBER"];
    if (!prNumberRaw) {
      throw new ConfigError("Missing required environment variable: PR_NUMBER");
    }
    const prNumber = parseInt(prNumberRaw, 10);
    if (isNaN(prNumber)) {
      throw new ConfigError(`Invalid PR_NUMBER (expected integer): ${prNumberRaw}`);
    }

    const logLevelRaw = process.env["LOG_LEVEL"] ?? "info";
    const logLevel: LogLevel = isLogLevel(logLevelRaw) ? logLevelRaw : "info";

    return new Config(githubToken, anthropicApiKey, owner, repo, prNumber, logLevel);
  }
}
