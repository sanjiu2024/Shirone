<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { onMount } from "svelte";

interface SessionMe {
	id: number;
	login: string;
	avatar_url: string | null;
	role: string;
}

let user = $state<SessionMe | null>(null);
let loaded = $state(false);

async function loadMe() {
	try {
		const res = await fetch("/api/auth/me");
		if (res.ok) user = ((await res.json()) as { user: SessionMe | null }).user;
	} catch {
		user = null;
	}
	loaded = true;
}

async function logout() {
	try {
		await fetch("/api/auth/logout", { method: "POST" });
	} finally {
		user = null;
	}
}

onMount(() => {
	loadMe();
});
</script>

{#if loaded}
	<div
		data-github-login
		class="mb-4 flex items-center gap-3 text-sm text-[var(--on-surface-variant)]"
	>
		{#if user}
			{#if user.avatar_url}
				<img
					src={user.avatar_url}
					alt={user.login}
					width="24"
					height="24"
					class="rounded-full"
				/>
			{/if}
			<span>{i18n(I18nKey.authHi)}, {user.login}</span>
			<button
				type="button"
				onclick={logout}
				class="rounded-[var(--shape-corner-s)] border border-[var(--outline-variant)] px-3 py-1 text-[var(--on-surface)]"
			>
				{i18n(I18nKey.authLogout)}
			</button>
		{:else}
			<a
				href="/api/auth/github"
				class="rounded-[var(--shape-corner-m)] bg-[var(--surface-container-high)] px-4 py-2 text-[var(--on-surface)]"
			>
				{i18n(I18nKey.authLoginWithGithub)}
			</a>
		{/if}
	</div>
{/if}
