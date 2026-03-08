# pr-review

A GitHub Action that reviews pull requests using Claude and posts inline comments via the GitHub Reviews API.

**Tech:** Node.js 20 · TypeScript 5 · `@anthropic-ai/sdk` · `@octokit/rest`

## Setup

1. Add `ANTHROPIC_API_KEY` as a repository secret under **Settings → Secrets and variables → Actions**
2. Push to GitHub — the workflow activates automatically on pull requests

## Local development

```bash
cp .env.example .env   # fill in your values
pnpm install
pnpm review:local
```
