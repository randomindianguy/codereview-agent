import "dotenv/config";

/**
 * Centralized runtime config. Values come from agent/.env (see .env.example).
 * Nothing here throws on import — individual entry points validate what they need
 * (e.g. the webhook server requires GITHUB_WEBHOOK_SECRET, db:init does not).
 */
export const config = {
  port: Number(process.env.PORT ?? 3000),
  webhookPath: process.env.WEBHOOK_PATH ?? "/api/webhook",
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? "",
  databasePath: process.env.DATABASE_PATH ?? "revue.db",
  // Optional: raises the GitHub REST rate limit for listing PR files.
  // Listing works unauthenticated on a public repo, so this is not required.
  githubToken: process.env.GITHUB_TOKEN ?? "",
};
