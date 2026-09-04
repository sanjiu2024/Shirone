import type { APIRoute } from "astro";
import { getSessionUser } from "../../../lib/auth.ts";

export const GET: APIRoute = async (context) => {
	const user = await getSessionUser(context);
	if (!user)
		return new Response(JSON.stringify({ user: null }), {
			headers: { "Content-Type": "application/json" },
		});
	return new Response(JSON.stringify({ user }), {
		headers: { "Content-Type": "application/json" },
	});
};
