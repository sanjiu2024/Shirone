<!-- src/components/organisms/admin/CommentModeration.svelte (runes) -->
<script lang="ts">
interface ModeratedComment {
	id: number;
	content: string;
	login?: string;
	created_at?: string;
}

let { postId = 0 }: { postId?: number } = $props();
let targetPostId = $state(postId);
let comments = $state<ModeratedComment[]>([]);
let message = $state("");

async function load() {
	message = "";
	try {
		const res = await fetch(`/api/comments?postId=${targetPostId}`);
		if (!res.ok) {
			message = `Failed: ${res.status}`;
			return;
		}
		const data = (await res.json()) as { comments: ModeratedComment[] };
		comments = data.comments ?? [];
		message = `${comments.length} comments`;
	} catch {
		message = "Comments unavailable";
	}
}

async function remove(id: number) {
	const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
	if (!res.ok) {
		message = `Failed: ${res.status}`;
		return;
	}
	message = "Deleted";
	await load();
}
</script>

<section
	class="comment-moderation"
	data-comment-moderation
	aria-labelledby="comment-moderation-title"
>
	<h2 id="comment-moderation-title">Moderation</h2>
	<form
		class="comment-moderation-load"
		onsubmit={(e) => {
			e.preventDefault();
			load();
		}}
	>
		<label class="comment-moderation-field" for="comment-moderation-post-id">
			Post ID
			<input
				id="comment-moderation-post-id"
				type="number"
				min="1"
				bind:value={targetPostId}
				name="postId"
				required
			/>
		</label>
		<button class="comment-moderation-button" type="submit">Load</button>
	</form>
	<ul class="comment-moderation-list">
		{#each comments as comment (comment.id)}
			<li data-comment-id={comment.id}>
				<p>{comment.content}</p>
				{#if comment.login}<small>{comment.login}</small>{/if}
				<button
					class="comment-moderation-button"
					type="button"
					aria-label={`Delete comment ${comment.id}`}
					onclick={() => remove(comment.id)}
				>
					Delete
				</button>
			</li>
		{/each}
	</ul>
	<p role="status">{message}</p>
</section>

<style>
	.comment-moderation {
		background: var(--surface-container);
		border: 1px solid var(--outline-variant);
		border-radius: var(--shape-corner-l);
		display: grid;
		gap: 1rem;
		padding: 1.25rem;
	}
	.comment-moderation h2 {
		font: var(--m3e-type-title-medium);
		margin: 0;
	}
	.comment-moderation-load {
		display: flex;
		gap: 0.75rem;
		align-items: end;
	}
	.comment-moderation-field {
		color: var(--on-surface);
		display: grid;
		font: var(--m3e-type-label-large);
		gap: 0.375rem;
	}
	.comment-moderation-field input {
		background: var(--surface-container-lowest);
		border: 1px solid var(--outline-variant);
		border-radius: var(--shape-corner-s);
		color: var(--on-surface);
		font: var(--m3e-type-body-medium);
		padding: 0.625rem 0.75rem;
	}
	.comment-moderation-list {
		display: grid;
		gap: 0.5rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.comment-moderation-list li {
		background: var(--surface-container-lowest);
		border-radius: var(--shape-corner-s);
		display: grid;
		gap: 0.375rem;
		padding: 0.625rem 0.875rem;
	}
	.comment-moderation-list p {
		font: var(--m3e-type-body-medium);
		margin: 0;
	}
	.comment-moderation-button {
		background: var(--primary);
		border: 0;
		border-radius: var(--shape-corner-m);
		color: var(--on-primary);
		cursor: pointer;
		font: var(--m3e-type-label-large);
		justify-self: start;
		padding: 0.625rem 1.25rem;
	}
</style>
