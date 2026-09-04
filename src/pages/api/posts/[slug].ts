import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/auth.ts";
import { query as dbQuery } from "../../../lib/db.ts";
import { getPublishedBySlug, updatePost } from "../../../lib/posts.ts";

export const GET: APIRoute = async ({ params }) => {
	const post = await getPublishedBySlug(params.slug ?? "");
	if (!post)
		return new Response(JSON.stringify({ error: "not found" }), {
			status: 404,
		});
	return new Response(JSON.stringify({ post }), {
		headers: { "Content-Type": "application/json" },
	});
};

export const PUT: APIRoute = async (context) => {
	const admin = await requireAdmin(context);
	if (!admin)
		return new Response(JSON.stringify({ error: "forbidden" }), {
			status: 403,
		});
	await updatePost(context.params.slug ?? "", await context.request.json());
	return new Response(JSON.stringify({ ok: true }));
};

export const DELETE: APIRoute = async (context) => {
	const admin = await requireAdmin(context);
	if (!admin)
		return new Response(JSON.stringify({ error: "forbidden" }), {
			status: 403,
		});
	await dbQuery("DELETE FROM posts WHERE slug = ?", [
		context.params.slug ?? "",
	]);
	return new Response(JSON.stringify({ ok: true }));
};
