// Type declarations for the sibling JavaScript markdown pipeline
// (src/utils/markdown-processor.mjs). Kept structural so both the
// build-time adapters and the DB-backed post repo type-check without
// importing the full remark/rehype plugin chain into type space.
interface MarkdownRenderer {
	render(
		markdown: string,
		options: { frontmatter: Record<string, unknown> },
	): Promise<{ code: string }>;
}

export declare const siteMarkdownProcessor: {
	createRenderer(options: unknown): Promise<MarkdownRenderer>;
};
export declare const siteRemarkPlugins: unknown[];
export declare const siteRehypePlugins: unknown[];
