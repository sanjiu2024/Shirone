<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { onMount } from "svelte";
import { onSwupReplace } from "../../../utils/swup-remount.ts";

interface CommentItem {
	id: number;
	content: string;
	parent_id: number | null;
	created_at: string;
	login: string;
	avatar_url: string | null;
	role: string;
}

interface SessionMe {
	id: number;
	login: string;
	role: string;
}

let {
	postId,
	slug,
	enabled = true,
}: { postId: number; slug: string; enabled?: boolean } = $props();

let comments = $state<CommentItem[]>([]);
let draft = $state("");
let error = $state("");
let offline = $state(false);
let me = $state<SessionMe | null>(null);
let replyTo = $state<number | null>(null);
let replyDraft = $state<HTMLTextAreaElement | undefined>(undefined);

async function load() {
	try {
		const res = await fetch(`/api/comments?postId=${postId}`);
		if (!res.ok) {
			offline = true;
			return;
		}
		offline = false;
		comments = ((await res.json()) as { comments: CommentItem[] }).comments;
	} catch {
		offline = true;
	}
}

async function loadMe() {
	try {
		const res = await fetch("/api/auth/me");
		if (res.ok) me = ((await res.json()) as { user: SessionMe | null }).user;
	} catch {
		me = null;
	}
}

async function submit(e: Event) {
	e.preventDefault();
	error = "";
	const res = await fetch("/api/comments", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			postId,
			content: draft,
			parentId: replyTo,
		}),
	});
	if (res.status === 401) {
		error = i18n(I18nKey.authLoginWithGithub);
		return;
	}
	if (res.status === 429) {
		error = i18n(I18nKey.commentsSpam);
		return;
	}
	if (!res.ok) {
		error = i18n(I18nKey.commentsLoadFailed);
		return;
	}
	draft = "";
	replyTo = null;
	error = "";
	await load();
}

async function remove(id: number) {
	const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
	if (!res.ok) {
		error = i18n(I18nKey.commentsLoadFailed);
		return;
	}
	await load();
}

function reply(id: number) {
	replyTo = id;
	replyDraft?.focus();
}

onMount(() => {
	load();
	loadMe();
	return onSwupReplace(() => {
		load();
		loadMe();
	});
});
</script>

{#if enabled}
<section
	id="comments"
	aria-labelledby="comments-title"
	data-comment-island
	data-post-slug={slug}
	class="w-full"
>
	{#if offline}
		<p role="status" class="text-sm text-[var(--on-surface-variant)]">
			{i18n(I18nKey.commentsUnavailable)}
		</p>
	{:else if comments.length === 0}
		<p
			role="status"
			class="text-sm text-[var(--on-surface-variant)]"
			data-comment-empty
		>
			{i18n(I18nKey.commentsEmpty)}
		</p>
	{:else}
		<ul class="flex flex-col gap-3">
			{#each comments as c (c.id)}
				<li
					data-comment-id={c.id}
					class="rounded-[var(--shape-corner-m)] border border-[var(--outline-variant)] bg-[var(--surface-container-low)] p-4"
				>
					<div class="mb-1 flex items-center gap-2 text-sm">
						<span class="font-medium text-[var(--on-surface)]">{c.login}</span>
						<time class="text-[var(--on-surface-variant)]">{c.created_at}</time>
					</div>
					<p class="text-sm text-[var(--on-surface)]">{c.content}</p>
					<div class="mt-2 flex gap-2">
						<button
							type="button"
							class="text-sm text-[var(--primary)]"
							onclick={() => reply(c.id)}
						>
							{i18n(I18nKey.commentsReply)}
						</button>
						{#if me && (me.role === "admin" || me.login === c.login)}
							<button
								type="button"
								class="text-sm text-[var(--error)]"
								onclick={() => remove(c.id)}
							>
								{i18n(I18nKey.commentsDelete)}
							</button>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{/if}
	<form
		onsubmit={submit}
		class="mt-4 flex flex-col gap-3"
		data-comment-form
	>
		<textarea
			bind:this={replyDraft}
			bind:value={draft}
			maxlength={2000}
			rows={4}
			aria-label="comment"
			class="w-full rounded-[var(--shape-corner-m)] border border-[var(--outline-variant)] bg-[var(--surface-container-low)] p-3 text-sm text-[var(--on-surface)]"
		></textarea>
		<button
			type="submit"
			class="self-start rounded-[var(--shape-corner-m)] bg-[var(--primary)] px-4 py-2 text-sm text-[var(--on-primary)]"
		>
			{i18n(I18nKey.commentsPost)}
		</button>
	</form>
	{#if error}
		<p role="alert" class="mt-2 text-sm text-[var(--error)]">{error}</p>
	{/if}
</section>
{/if}
