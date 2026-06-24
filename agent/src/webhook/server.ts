import { createServer, type Server } from "node:http";
import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";
import { config } from "../config.js";
import { openDb, migrate } from "../db/index.js";

// Only PRs that touch these path prefixes are in scope for review. This routing
// lives in the handler on purpose — the production-grade config story is a Week 4
// path-to-product concern, not a file in this repo.
const REVIEW_PATHS = ["notable/"];

function isReviewPath(file: string): boolean {
  return REVIEW_PATHS.some((prefix) => file.startsWith(prefix));
}

/**
 * The pull_request payload carries only a file *count*, not paths, so fetch the
 * changed-file list from the REST API. Reads are unauthenticated on a public repo;
 * GITHUB_TOKEN (if set) just raises the rate limit.
 */
async function fetchChangedFiles(repoFullName: string, prNumber: number): Promise<string[]> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "user-agent": "revue-bot",
    "x-github-api-version": "2022-11-28",
  };
  if (config.githubToken) headers.authorization = `Bearer ${config.githubToken}`;

  const url = `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}/files?per_page=100`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`list PR files failed: ${res.status} ${res.statusText}`);
  }
  const files = (await res.json()) as Array<{ filename: string }>;
  return files.map((f) => f.filename);
}

/**
 * Starts the webhook receiver. Session 2 scope: verify signatures, LOG pull_request
 * events, and persist a pull_request row so the loop is observable end-to-end.
 * No diff fetching, no AI — that's later.
 */
export function startServer(): Server {
  if (!config.webhookSecret) {
    throw new Error(
      "Missing GITHUB_WEBHOOK_SECRET — copy agent/.env.example to agent/.env and set it.",
    );
  }

  const db = openDb();
  migrate(db);

  const upsertPr = db.prepare(`
    INSERT INTO pull_request (repo, number, head_sha, base_sha, title, body, files_changed, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'demo')
    ON CONFLICT (repo, number) DO UPDATE SET
      head_sha      = excluded.head_sha,
      base_sha      = excluded.base_sha,
      title         = excluded.title,
      body          = excluded.body,
      files_changed = excluded.files_changed
  `);

  const webhooks = new Webhooks({ secret: config.webhookSecret });

  webhooks.onAny(({ id, name }) => {
    console.log(`→ ${name} (delivery ${id})`);
  });

  webhooks.on("pull_request", async ({ payload }) => {
    const { action, number, pull_request: pr, repository } = payload;
    console.log(
      `  pull_request.${action} — ${repository.full_name}#${number} ` +
        `"${pr.title}" [${pr.head.sha.slice(0, 7)} ← ${pr.base.sha.slice(0, 7)}]`,
    );

    if (action !== "opened" && action !== "reopened" && action !== "synchronize") {
      return;
    }

    // Path filter: only review PRs that touch in-scope paths. Everything else is
    // logged and dropped — no persistence, no comment, no approval, nothing.
    let files: string[];
    try {
      files = await fetchChangedFiles(repository.full_name, number);
    } catch (err) {
      console.warn(
        `  ⚠ could not list changed files (${(err as Error).message}); skipping review`,
      );
      return;
    }

    const inScope = files.filter(isReviewPath);
    if (inScope.length === 0) {
      console.log(
        `  ↳ skip: 0/${files.length} changed files under ${REVIEW_PATHS.join(", ")} — no review`,
      );
      return;
    }
    console.log(
      `  ↳ in scope: ${inScope.length}/${files.length} changed files under ${REVIEW_PATHS.join(", ")}`,
    );

    // Plumbing only — persist for the (future) review pipeline. No AI here.
    upsertPr.run(
      repository.full_name,
      number,
      pr.head.sha,
      pr.base.sha,
      pr.title,
      pr.body ?? null,
      pr.changed_files ?? null,
    );
    console.log(`  ↳ persisted pull_request row for ${repository.full_name}#${number}`);
  });

  webhooks.onError((err) => console.error("webhook error:", err));

  const middleware = createNodeMiddleware(webhooks, { path: config.webhookPath });

  const server = createServer(async (req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("ok");
      return;
    }
    if (await middleware(req, res)) return;
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("not found");
  });

  server.listen(config.port, () => {
    console.log(
      `revue webhook listening on http://localhost:${config.port}${config.webhookPath}`,
    );
  });

  return server;
}
