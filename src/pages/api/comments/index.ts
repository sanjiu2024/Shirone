import type { APIRoute } from "astro";
import { requireUser } from "../../../lib/auth.ts";
import {
	hashIp,
	listPublishedComments,
	normalizeContent,
} from "../../../lib/comments.ts";
import { query } from "../../../lib/db.ts";
import { checkLimit } from "../../../lib/rate-limit.ts";

export const GET: APIRoute = async ({ url }) => {
	const postId = Number(url.searchParams.get("postId"));
	if (!Number.isFinite(postId))
		return new Response(JSON.stringify({ error: "postId required" }), {
			status: 400,
		});
	try {
		const comments = await listPublishedComments(postId);
		return new Response(JSON.stringify({ comments }), {
			headers: { "Content-Type": "application/json" },
		});
	} catch {
		return new Response(JSON.stringify({ error: "comments unavailable" }), {
			status: 500,
		});
	}
};

export const POST: APIRoute = async (context) => {
	const user = await requireUser(context);
	if (!user)
		return new Response(JSON.stringify({ error: "unauthorized" }), {
			status: 401,
		});
	const ip = context.clientAddress ?? "unknown";
	const limit = checkLimit(`comment:${hashIp(ip)}`);
	if (!limit.ok) {
		return new Response(JSON.stringify({ error: "rate limited" }), {
			status: 429,
			headers: { "Retry-After": String(limit.retryAfter) },
		});
	}
	try {
		const body = (await context.request.json()) as {
			postId: number;
			content: string;
			parentId?: number;
		};
		const content = normalizeContent(body.content);
		await query(
			`INSERT INTO comments (post_id, user_id, parent_id, content, status, ip_hash) VALUES (?, ?, ?, ?, 'published', ?)`,
			[body.postId, user.id, body.parentId ?? null, content, hashIp(ip)],
		);
		return new Response(JSON.stringify({ ok: true }), { status: 201 });
	} catch (error) {
		return new Response(JSON.stringify({ error: (error as Error).message }), {
			status: 400,
		});
	}
};
