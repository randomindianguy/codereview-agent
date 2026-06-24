import { createServer, type Server } from "node:http";
import { Webhooks, createNodeMiddleware } from "@octokit/webhooks";
import { config } from "../config.js";
import { openDb, migrate } from "../db/index.js";

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

  webhooks.on("pull_request", ({ payload }) => {
    const { action, number, pull_request: pr, repository } = payload;
    console.log(
      `  pull_request.${action} — ${repository.full_name}#${number} ` +
        `"${pr.title}" [${pr.head.sha.slice(0, 7)} ← ${pr.base.sha.slice(0, 7)}]`,
    );

    if (action === "opened" || action === "reopened" || action === "synchronize") {
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
    }
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
