import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { pool } from "./index.js";

const schemaUrl = new URL("../../schema.sql", import.meta.url);
const sql = await fs.readFile(fileURLToPath(schemaUrl), "utf8");
await pool.query(sql);
console.log("Database schema applied.");
await pool.end();
