# revue-agent

The TypeScript code reviewer that runs as a GitHub App. **Session 2 = plumbing only**:
webhook receiver + SQLite data model. No prompts, no agent logic, no eval code yet.

## Layout

```
agent/
├── src/
│   ├── config.ts          # env-backed runtime config
│   ├── index.ts           # entry point — starts the webhook server
│   ├── db/
│   │   ├── schema.sql      # full data model (PRD §5)
│   │   ├── index.ts        # openDb() + migrate()
│   │   └── init.ts         # `npm run db:init`
│   └── webhook/
│       └── server.ts       # node:http + @octokit/webhooks, logs pull_request events
└── .env.example
```

## Stack notes

- **SQLite:** Node's built-in `node:sqlite` (no native build). Emits a one-time
  `ExperimentalWarning` — harmless.
- **Webhooks:** `@octokit/webhooks` on `node:http`; HMAC signature verification is built in.
- **Run:** `tsx` (TypeScript executed directly, no compile step).

## Setup

```bash
cd agent
npm install
cp .env.example .env        # then fill in GITHUB_WEBHOOK_SECRET
npm run db:init             # create revue.db with all tables
```

## Register the GitHub App (one time)

1. Go to **https://github.com/settings/apps/new**.
2. **Name:** your bot name (e.g. `revue-reviewer`). **Homepage URL:** `https://revue.sidharthsundaram.com`.
3. **Webhook → Active.** URL = your smee channel (see below). **Secret** = the value in `.env` (`GITHUB_WEBHOOK_SECRET`).
4. **Permissions:** Pull requests → Read & write; Contents → Read-only; Metadata → Read-only.
5. **Subscribe to events:** Pull request.
6. **Where can this app be installed:** Only on this account. Click **Create GitHub App**.
7. (For later sessions) Generate a private key (downloads a `.pem`) and note the **App ID**.
8. **Install** the app on the `codereview-agent` repo.

## Run the loop locally

```bash
# terminal 1 — proxy GitHub deliveries to localhost
npx smee-client --url <your-smee-channel-url> --target http://localhost:3000/api/webhook

# terminal 2 — the agent
npm run dev
```

Open a PR on the installed repo → you should see the event logged and a row written to `revue.db`.

```bash
# inspect what landed
sqlite3 revue.db "SELECT id, repo, number, title FROM pull_request;"
```
