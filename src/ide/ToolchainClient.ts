import type { BoardId, SourceFile } from "./workspace";
export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  severity: "warning" | "error";
  message: string;
}
export interface BuildResult {
  job: string;
  success: boolean;
  log: string;
  diagnostics: Diagnostic[];
  artifacts: string[];
  board: BoardId;
}
/** @brief Fixed loopback client. Token is held in memory and never included in portable projects. */
export class ToolchainClient {
  constructor(
    private readonly token: string,
    private readonly base = "http://127.0.0.1:4317",
  ) {
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))
      throw new Error("Companion must use loopback");
  }
  async request<T>(path: string, body?: unknown): Promise<T> {
    const r = await fetch(this.base + path, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(1900000),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error ?? `Companion returned ${r.status}`);
    return data;
  }
  compile(board: BoardId, files: SourceFile[]) {
    return this.request<BuildResult>("/compile", {
      board,
      files: files.map(({ name, content }) => ({ name, content })),
    });
  }
  async artifact(job: string, name: string) {
    const r = await fetch(
      `${this.base}/artifact/${encodeURIComponent(job)}/${encodeURIComponent(name)}`,
      { headers: { Authorization: `Bearer ${this.token}` } },
    );
    if (!r.ok) throw new Error("Artifact unavailable");
    return r.arrayBuffer();
  }
}
