<!-- src/components/organisms/admin/PostEditor.svelte (runes) -->
<script lang="ts">
let {
	slug = "",
	initial = null,
}: { slug?: string; initial?: Record<string, unknown> | null } = $props();
let title = $state((initial?.title as string) ?? "");
let content = $state((initial?.content_md as string) ?? "");
let newSlug = $state("");
let status = $state("draft");
let message = $state("");

async function save() {
	const effectiveSlug = slug || newSlug;
	const method = slug ? "PUT" : "POST";
	const url = slug ? `/api/posts/${slug}` : "/api/posts";
	const res = await fetch(url, {
		method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			slug: effectiveSlug,
			title,
			content_md: content,
			status,
		}),
	});
	message = res.ok ? "Saved" : `Failed: ${res.status}`;
}
</script>

<form
	class="post-editor"
	data-post-editor
	onsubmit={(e) => {
		e.preventDefault();
		save();
	}}
>
	{#if !slug}
		<label class="post-editor-field" for="post-editor-slug">
			Slug
			<input
				id="post-editor-slug"
				bind:value={newSlug}
				name="slug"
				required
				pattern="[a-z0-9][a-z0-9-]{1,180}"
			/>
		</label>
	{/if}
	<label class="post-editor-field" for="post-editor-title">
		Title
		<input id="post-editor-title" bind:value={title} name="title" required />
	</label>
	<label class="post-editor-field" for="post-editor-content">
		Markdown
		<textarea
			id="post-editor-content"
			bind:value={content}
			name="content"
			rows={20}
			required
		></textarea>
	</label>
	<label class="post-editor-field" for="post-editor-status">
		Status
		<select id="post-editor-status" bind:value={status} name="status">
			<option value="draft">Draft</option>
			<option value="published">Published</option>
		</select>
	</label>
	<button class="post-editor-save" type="submit">Save</button>
	<p role="status">{message}</p>
</form>

<style>
	.post-editor {
		background: var(--surface-container);
		border: 1px solid var(--outline-variant);
		border-radius: var(--shape-corner-l);
		display: grid;
		gap: 1rem;
		padding: 1.25rem;
	}
	.post-editor-field {
		color: var(--on-surface);
		display: grid;
		font: var(--m3e-type-label-large);
		gap: 0.375rem;
	}
	.post-editor-field input,
	.post-editor-field textarea,
	.post-editor-field select {
		background: var(--surface-container-lowest);
		border: 1px solid var(--outline-variant);
		border-radius: var(--shape-corner-s);
		color: var(--on-surface);
		font: var(--m3e-type-body-medium);
		padding: 0.625rem 0.75rem;
	}
	.post-editor-save {
		background: var(--primary);
		border: 0;
		border-radius: var(--shape-corner-m);
		color: var(--on-primary);
		cursor: pointer;
		font: var(--m3e-type-label-large);
		justify-self: start;
		padding: 0.625rem 1.5rem;
	}
</style>
