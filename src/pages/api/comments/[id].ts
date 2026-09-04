import type { APIRoute } from "astro";
import { getSessionUser } from "../../../lib/auth.ts";
import { query } from "../../../lib/db.ts";

export const DELETE: APIRoute = async (context) => {
	const user = await getSessionUser(context);
	if (!user)
		return new Response(JSON.stringify({ error: "unauthorized" }), {
			status: 401,
		});
	const rows = await query<{ user_id: number }[]>(
		"SELECT user_id FROM comments WHERE id = ? LIMIT 1",
		[context.params.id],
	);
	if (!rows[0])
		return new Response(JSON.stringify({ error: "not found" }), {
			status: 404,
		});
	if (user.role !== "admin" && rows[0].user_id !== user.id) {
		return new Response(JSON.stringify({ error: "forbidden" }), {
			status: 403,
		});
	}
	await query("DELETE FROM comments WHERE id = ?", [context.params.id]);
	return new Response(JSON.stringify({ ok: true }));
};
