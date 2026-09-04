import type { APIRoute } from "astro";
import { requireAdmin } from "../../../lib/auth.ts";
import { createPost, listPublished } from "../../../lib/posts.ts";

export const GET: APIRoute = async ({ url }) => {
	const page = Number(url.searchParams.get("page") ?? "1");
	const { posts, total } = await listPublished(
		Number.isFinite(page) && page > 0 ? page : 1,
		10,
	);
	return new Response(JSON.stringify({ posts, total }), {
		headers: { "Content-Type": "application/json" },
	});
};

export const POST: APIRoute = async (context) => {
	const admin = await requireAdmin(context);
	if (!admin)
		return new Response(JSON.stringify({ error: "forbidden" }), {
			status: 403,
		});
	try {
		await createPost(await context.request.json());
		return new Response(JSON.stringify({ ok: true }), { status: 201 });
	} catch (error) {
		return new Response(JSON.stringify({ error: (error as Error).message }), {
			status: 400,
		});
	}
};
