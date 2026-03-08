import type { PRFile } from "./types.js";

const HUNK_HEADER_REGEX = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/;

export function getCommentableLines(patch: string): Set<number> {
  const lines = new Set<number>();
  let currentLine = 0;

  for (const line of patch.split("\n")) {
    const hunkMatch = HUNK_HEADER_REGEX.exec(line);
    if (hunkMatch !== null) {
      const startStr = hunkMatch[1];
      if (startStr !== undefined) {
        currentLine = parseInt(startStr, 10) - 1;
      }
      continue;
    }

    if (line.startsWith("-")) {
      continue;
    }

    currentLine++;
    lines.add(currentLine);
  }

  return lines;
}

export function formatForPrompt(files: PRFile[]): string {
  const parts: string[] = [];

  for (const file of files) {
    parts.push(`### ${file.filename} (${file.status})`);

    if (file.patch === undefined) {
      parts.push("(binary file or no textual diff)");
      continue;
    }

    let currentLine = 0;
    const patchLines: string[] = [];

    for (const line of file.patch.split("\n")) {
      const hunkMatch = HUNK_HEADER_REGEX.exec(line);
      if (hunkMatch !== null) {
        const startStr = hunkMatch[1];
        if (startStr !== undefined) {
          currentLine = parseInt(startStr, 10) - 1;
        }
        patchLines.push(line);
        continue;
      }

      if (line.startsWith("-")) {
        patchLines.push(line);
        continue;
      }

      currentLine++;
      const label = `[L${currentLine.toString().padStart(4, "0")}]`;
      patchLines.push(`${label}${line}`);
    }

    parts.push(patchLines.join("\n"));
  }

  return parts.join("\n\n");
}
