import { readFile } from "node:fs/promises";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
	host: process.env.DB_HOST ?? "127.0.0.1",
	port: Number(process.env.DB_PORT ?? "3306"),
	user: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	multipleStatements: true,
});
const sql = await readFile(new URL("./schema.sql", import.meta.url), "utf8");
await connection.query(sql);
await connection.end();
console.log("[migrate] schema applied");
