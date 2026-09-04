// SSR-aware search index step: Pagefind needs static HTML, which a pure
// `output: "server"` build does not emit. Skip cleanly instead of failing;
// a DB-driven index can replace this later (see Task 8 notes).
import { execFileSync } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function hasHtml(dir) {
	let entries;
	try {
		entries = readdirSync(dir);
	} catch {
		return false;
	}
	return entries.some((entry) => {
		const full = join(dir, entry);
		if (entry.endsWith(".html")) return true;
		try {
			return statSync(full).isDirectory() && hasHtml(full);
		} catch {
			return false;
		}
	});
}

if (hasHtml("dist")) {
	execFileSync("npx", ["pagefind", "--site", "dist"], {
		stdio: "inherit",
		shell: true,
	});
} else {
	console.log(
		"[search-index] no static HTML in dist (SSR server build) — skipping pagefind.",
	);
}
