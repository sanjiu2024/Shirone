// src/lib/posts.ts
import { siteMarkdownProcessor } from "../utils/markdown-processor.mjs";
import { query } from "./db.ts";

export interface PostInput {
	slug: string;
	title: string;
	description?: string | null;
	cover?: string | null;
	category?: string | null;
	tags?: string[];
	content_md: string;
	status?: "draft" | "published";
	pinned?: boolean;
}

export interface PostRow {
	id: number;
	slug: string;
	title: string;
	description: string | null;
	cover: string | null;
	category: string | null;
	tags: string[] | null;
	content_md: string;
	html_cache: string | null;
	status: "draft" | "published";
	pinned: number;
	created_at: string;
	updated_at: string;
}

export function validatePostInput(input: PostInput): void {
	if (!input.slug || !/^[a-z0-9][a-z0-9-]{1,180}$/.test(input.slug))
		throw new Error("invalid slug");
	if (!input.title || input.title.length > 255)
		throw new Error("invalid title");
	if (!input.content_md || input.content_md.length > 1_500_000)
		throw new Error("invalid content");
}

export async function renderMarkdownToHtml(markdown: string): Promise<string> {
	const renderer = await siteMarkdownProcessor.createRenderer({});
	const { code } = await renderer.render(markdown, { frontmatter: {} });
	return code;
}

function parseTags(raw: string[] | string | null): string[] {
	if (!raw) return [];
	return Array.isArray(raw) ? raw : JSON.parse(raw as string);
}

export async function listPublished(
	page = 1,
	pageSize = 10,
): Promise<{ posts: PostRow[]; total: number }> {
	const offset = (page - 1) * pageSize;
	const posts = await query<PostRow[]>(
		"SELECT * FROM posts WHERE status = 'published' ORDER BY pinned DESC, created_at DESC LIMIT ? OFFSET ?",
		[pageSize, offset],
	);
	const count = await query<{ total: number }[]>(
		"SELECT COUNT(*) AS total FROM posts WHERE status = 'published'",
	);
	return {
		posts: posts.map((p) => ({
			...p,
			tags: parseTags(p.tags as unknown as string | null) as unknown as null,
		})),
		total: count[0].total,
	};
}

export async function getPublishedBySlug(
	slug: string,
): Promise<PostRow | null> {
	const rows = await query<PostRow[]>(
		"SELECT * FROM posts WHERE slug = ? AND status = 'published' LIMIT 1",
		[slug],
	);
	if (!rows[0]) return null;
	return {
		...rows[0],
		tags: parseTags(
			rows[0].tags as unknown as string | null,
		) as unknown as null,
	};
}

export async function createPost(input: PostInput): Promise<void> {
	validatePostInput(input);
	const html = await renderMarkdownToHtml(input.content_md);
	await query(
		"INSERT INTO posts (slug, title, description, cover, category, tags, content_md, html_cache, status, pinned) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
		[
			input.slug,
			input.title,
			input.description ?? null,
			input.cover ?? null,
			input.category ?? null,
			JSON.stringify(input.tags ?? []),
			input.content_md,
			html,
			input.status ?? "draft",
			input.pinned ? 1 : 0,
		],
	);
}

export async function updatePost(
	slug: string,
	input: Partial<PostInput>,
): Promise<void> {
	const html = input.content_md
		? await renderMarkdownToHtml(input.content_md)
		: undefined;
	await query(
		"UPDATE posts SET title = COALESCE(?, title), description = COALESCE(?, description), cover = COALESCE(?, cover), category = COALESCE(?, category), tags = COALESCE(?, tags), content_md = COALESCE(?, content_md), html_cache = COALESCE(?, html_cache), status = COALESCE(?, status), pinned = COALESCE(?, pinned) WHERE slug = ?",
		[
			input.title ?? null,
			input.description ?? null,
			input.cover ?? null,
			input.category ?? null,
			input.tags ? JSON.stringify(input.tags) : null,
			input.content_md ?? null,
			html ?? null,
			input.status ?? null,
			input.pinned === undefined ? null : input.pinned ? 1 : 0,
			slug,
		],
	);
}

/**
 * DB-first list with file fallback. When MySQL is unreachable (local dev
 * without a database, or a DB outage) the homepage/archive/categories/tags
 * render the theme's file-based posts instead of hard-500ing. Detail pages
 * and writes still require the database.
 */
export async function listPublishedResilient(
	page = 1,
	pageSize = 10,
): Promise<{ posts: PostRow[]; total: number }> {
	try {
		return await listPublished(page, pageSize);
	} catch {
		// Lazy import: content-utils pulls astro:content, which only
		// resolves inside the Astro runtime (never under plain node tests).
		const { getSortedPosts } = await import("../utils/content-utils.ts");
		const { removeFileExtension } = await import("../utils/url-utils.ts");
		const all = await getSortedPosts();
		const total = all.length;
		const start = (page - 1) * pageSize;
		const posts: PostRow[] = all
			.slice(start, start + pageSize)
			.map((entry, index) => ({
				id: start + index,
				slug: removeFileExtension(entry.id),
				title: entry.data.title,
				description: entry.data.description ?? null,
				cover: typeof entry.data.image === "string" ? entry.data.image : null,
				category: entry.data.category ?? null,
				tags: entry.data.tags ?? [],
				content_md: "",
				html_cache: null,
				status: "published",
				pinned: entry.data.pinned ? 1 : 0,
				created_at: entry.data.published.toISOString(),
				updated_at: (entry.data.updated ?? entry.data.published).toISOString(),
			}));
		return { posts, total };
	}
}
