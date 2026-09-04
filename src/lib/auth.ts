import { createHash, randomBytes } from "node:crypto";
import type { APIContext } from "astro";
import { query } from "./db.ts";
import { getEnv } from "./env.ts";

export const SESSION_COOKIE = "shirone_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionUser {
	id: number;
	login: string;
	avatar_url: string | null;
	role: "admin" | "user";
}

export function sessionCookie(value: string, maxAge: number): string {
	return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie(): string {
	return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function createSession(userId: number): Promise<string> {
	const token = randomBytes(32).toString("hex");
	const id = createHash("sha256").update(token).digest("hex");
	const expires = new Date(Date.now() + SESSION_TTL_MS);
	await query(
		"INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
		[id, userId, expires],
	);
	return token;
}

export async function getSessionUser(
	context: APIContext,
): Promise<SessionUser | null> {
	const token = context.cookies.get(SESSION_COOKIE)?.value;
	if (!token) return null;
	const id = createHash("sha256").update(token).digest("hex");
	const rows = await query<SessionUser[]>(
		"SELECT u.id, u.login, u.avatar_url, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.id = ? AND s.expires_at > NOW() LIMIT 1",
		[id],
	);
	return rows[0] ?? null;
}

export async function requireUser(
	context: APIContext,
): Promise<SessionUser | null> {
	return getSessionUser(context);
}

export async function requireAdmin(
	context: APIContext,
): Promise<SessionUser | null> {
	const user = await getSessionUser(context);
	return user?.role === "admin" ? user : null;
}

export function isAdminGithubId(githubId: string | number): boolean {
	return String(githubId) === getEnv().adminGithubId;
}
