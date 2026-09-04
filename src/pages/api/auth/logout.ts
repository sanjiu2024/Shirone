import { createHash } from "node:crypto";
import type { APIRoute } from "astro";
import { clearSessionCookie, SESSION_COOKIE } from "../../../lib/auth.ts";
import { query } from "../../../lib/db.ts";

export const POST: APIRoute = async ({ cookies }) => {
	const token = cookies.get(SESSION_COOKIE)?.value;
	if (token) {
		const id = createHash("sha256").update(token).digest("hex");
		await query("DELETE FROM sessions WHERE id = ?", [id]);
	}
	return new Response(JSON.stringify({ ok: true }), {
		headers: {
			"Content-Type": "application/json",
			"Set-Cookie": clearSessionCookie(),
		},
	});
};
