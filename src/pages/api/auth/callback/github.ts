import type { APIRoute } from "astro";
import {
	createSession,
	isAdminGithubId,
	sessionCookie,
} from "../../../../lib/auth.ts";
import { query } from "../../../../lib/db.ts";
import { getEnv } from "../../../../lib/env.ts";

export const GET: APIRoute = async ({ url, redirect }) => {
	const env = getEnv();
	const code = url.searchParams.get("code");
	if (!code) return redirect("/login?err=oauth", 302);
	try {
		const tokenRes = await fetch(
			"https://github.com/login/oauth/access_token",
			{
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					client_id: env.githubId,
					client_secret: env.githubSecret,
					code,
				}),
			},
		);
		const tokenJson = (await tokenRes.json()) as { access_token?: string };
		if (!tokenJson.access_token) return redirect("/login?err=oauth", 302);
		const userRes = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${tokenJson.access_token}`,
				Accept: "application/vnd.github+json",
			},
		});
		if (!userRes.ok) return redirect("/login?err=oauth", 302);
		const gh = (await userRes.json()) as {
			id: number;
			login: string;
			avatar_url: string;
		};
		const role = isAdminGithubId(gh.id) ? "admin" : "user";
		await query(
			`INSERT INTO users (github_id, login, avatar_url, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE login = VALUES(login), avatar_url = VALUES(avatar_url), role = IF(VALUES(role) = 'admin', 'admin', role)`,
			[gh.id, gh.login, gh.avatar_url, role],
		);
		const rows = await query<{ id: number }[]>(
			"SELECT id FROM users WHERE github_id = ? LIMIT 1",
			[gh.id],
		);
		const token = await createSession(rows[0].id);
		return new Response(null, {
			status: 302,
			headers: {
				Location: "/",
				"Set-Cookie": sessionCookie(token, 30 * 24 * 60 * 60),
			},
		});
	} catch {
		return redirect("/login?err=oauth", 302);
	}
};
