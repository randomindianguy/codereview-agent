import { openDb, migrate } from "./index.js";
import { config } from "../config.js";

// Standalone migration runner: `npm run db:init`.
const db = openDb();
migrate(db);

const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
  .all() as Array<{ name: string }>;

console.log(`✓ Schema applied to ${config.databasePath}`);
console.log(`  ${tables.length} tables: ${tables.map((t) => t.name).join(", ")}`);
db.close();
