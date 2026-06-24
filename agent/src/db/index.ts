import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { config } from "../config.js";

const SCHEMA_URL = new URL("./schema.sql", import.meta.url);

/** Open (and create if missing) the SQLite database with sane pragmas. */
export function openDb(path: string = config.databasePath): DatabaseSync {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  return db;
}

/** Apply the schema. Idempotent — every statement uses CREATE TABLE IF NOT EXISTS. */
export function migrate(db: DatabaseSync): void {
  db.exec(readFileSync(SCHEMA_URL, "utf8"));
}
