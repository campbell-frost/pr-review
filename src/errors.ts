export class ConfigError extends Error {
  override readonly name = "ConfigError";
}

export class GitHubError extends Error {
  override readonly name = "GitHubError";
  constructor(
    readonly status: number,
    readonly path: string,
    body: string,
  ) {
    super(`GitHub API ${status.toString()} on ${path}: ${body}`);
  }
}

export class ReviewError extends Error {
  override readonly name = "ReviewError";
  constructor(
    message: string,
    readonly rawResponse?: string,
  ) {
    super(message);
  }
}
