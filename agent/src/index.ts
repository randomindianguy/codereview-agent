import { startServer } from "./webhook/server.js";

// Entry point. Plumbing only — receive and log PR webhooks, persist to SQLite.
startServer();
