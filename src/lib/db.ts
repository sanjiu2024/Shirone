import mysql, { type Pool, type RowDataPacket } from "mysql2/promise";
import { getEnv } from "./env.ts";

let pool: Pool | null = null;

export function getPool(): Pool {
	if (pool) return pool;
	const env = getEnv();
	pool = mysql.createPool({
		host: env.dbHost,
		port: env.dbPort,
		user: env.dbUser,
		password: env.dbPassword,
		database: env.dbName,
		waitForConnections: true,
		connectionLimit: 10,
		queueLimit: 0,
	});
	return pool;
}

export async function query<T = RowDataPacket[]>(
	sql: string,
	params: unknown[] = [],
): Promise<T> {
	const [rows] = await getPool().query(sql, params);
	return rows as T;
}
