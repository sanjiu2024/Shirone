import type { APIRoute } from "astro";
import { getEnv } from "../../../lib/env.ts";

export const GET: APIRoute = async () => {
	const env = getEnv();
	const params = new URLSearchParams({
		client_id: env.githubId,
		redirect_uri: `${env.siteUrl}/api/auth/callback/github`,
		scope: "read:user",
	});
	return Response.redirect(
		`https://github.com/login/oauth/authorize?${params}`,
		302,
	);
};
