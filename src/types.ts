export interface PRInfo {
  number: number;
  title: string;
  body: string;
}

export interface PRFile {
  filename: string;
  status: string;
  patch: string | undefined;
}

export interface ReviewComment {
  path: string;
  line: number;
  body: string;
}

export interface ReviewResult {
  summary: string;
  verdict: "APPROVE" | "COMMENT" | "REQUEST_CHANGES";
  comments: ReviewComment[];
}
