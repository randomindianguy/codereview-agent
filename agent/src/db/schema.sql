-- revue data model — mirrors PRD §5.
-- SQLite, one file in the repo, no external DB.
-- Local integer primary keys; GitHub identifiers stored as plain columns.

PRAGMA foreign_keys = ON;

-- A pull request under review (demo PRs, eval instances, or comparison runs).
CREATE TABLE IF NOT EXISTS pull_request (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  repo          TEXT    NOT NULL,                     -- "owner/name"
  number        INTEGER,                              -- GitHub PR number
  head_sha      TEXT,
  base_sha      TEXT,
  title         TEXT,
  body          TEXT,
  files_changed INTEGER,                              -- count of changed files
  source        TEXT NOT NULL DEFAULT 'demo'
                CHECK (source IN ('demo', 'eval', 'comparison')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (repo, number)
);

-- A single hunk from a PR diff.
CREATE TABLE IF NOT EXISTS diff_hunk (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  pr_id      INTEGER NOT NULL REFERENCES pull_request(id) ON DELETE CASCADE,
  file_path  TEXT NOT NULL,
  line_start INTEGER,
  line_end   INTEGER,
  content    TEXT
);

-- Full content of each changed file (context strategy: diff + full file, changed files only).
CREATE TABLE IF NOT EXISTS file_context (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  pr_id        INTEGER NOT NULL REFERENCES pull_request(id) ON DELETE CASCADE,
  file_path    TEXT NOT NULL,
  full_content TEXT,
  language     TEXT
);

-- Hand-graded ground truth for the golden dataset.
CREATE TABLE IF NOT EXISTS golden_label (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  pr_id             INTEGER NOT NULL REFERENCES pull_request(id) ON DELETE CASCADE,
  bug_class         TEXT,
  expected_severity TEXT,
  expected_line     INTEGER,
  mutation_type     TEXT,
  source            TEXT CHECK (source IN ('deepswe', 'handcrafted')),
  graded_by         TEXT CHECK (graded_by IN ('sid', 'sid_v2', 'peer'))
);

-- One execution of the reviewer over a PR.
CREATE TABLE IF NOT EXISTS review_run (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  pr_id          INTEGER NOT NULL REFERENCES pull_request(id) ON DELETE CASCADE,
  model          TEXT,
  prompt_version TEXT,
  completed_at   TEXT,
  latency_ms     INTEGER,
  cost_usd       REAL,
  total_tokens   INTEGER
);

-- A candidate review comment produced by a run (surviving or dropped in reflection).
CREATE TABLE IF NOT EXISTS review_comment (
  id                        INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id                    INTEGER NOT NULL REFERENCES review_run(id) ON DELETE CASCADE,
  file_path                 TEXT,
  line                      INTEGER,
  severity                  TEXT,
  body                      TEXT,
  reasoning_trace           TEXT,
  was_dropped_in_reflection INTEGER NOT NULL DEFAULT 0
                            CHECK (was_dropped_in_reflection IN (0, 1))
);

-- Aggregate eval metrics for a run, scored against the golden labels.
CREATE TABLE IF NOT EXISTS eval_result (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id              INTEGER NOT NULL REFERENCES review_run(id) ON DELETE CASCADE,
  true_positives      INTEGER,
  false_positives     INTEGER,
  false_negatives     INTEGER,
  precision           REAL,
  recall              REAL,
  severity_match_rate REAL
);

-- LLM-as-judge verdict on an individual comment.
CREATE TABLE IF NOT EXISTS judge_grading (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  comment_id      INTEGER NOT NULL REFERENCES review_comment(id) ON DELETE CASCADE,
  judge_model     TEXT,
  verdict         TEXT CHECK (verdict IN ('correct', 'wrong', 'partial')),
  judge_reasoning TEXT
);

-- Head-to-head comparison entry (e.g. revue vs CodeRabbit) on a PR.
CREATE TABLE IF NOT EXISTS comparison_run (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  pr_id             INTEGER NOT NULL REFERENCES pull_request(id) ON DELETE CASCADE,
  reviewer_name     TEXT CHECK (reviewer_name IN ('sid', 'coderabbit')),
  comments_count    INTEGER,
  qualitative_notes TEXT
);
