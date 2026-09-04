import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { query } from "./db.ts";

export function normalizeContent(raw: string): string {
	const content = raw.trim().replace(/\s+/g, " ");
	if (!content) throw new Error("empty content");
	if (content.length > 2000) throw new Error("content exceeds 2000 chars");
	return content;
}

export function hashIp(ip: string): string {
	return createHash("sha256").update(ip).digest("hex");
}

export async function listPublishedComments(
	postId: number,
): Promise<RowDataPacket[]> {
	return query(
		`SELECT c.id, c.content, c.parent_id, c.created_at, u.login, u.avatar_url, u.role FROM comments c JOIN users u ON u.id = c.user_id WHERE c.post_id = ? AND c.status = 'published' ORDER BY c.created_at ASC`,
		[postId],
	);
}
