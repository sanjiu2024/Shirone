export interface ServerEnv {
	dbHost: string;
	dbPort: number;
	dbUser: string;
	dbPassword: string;
	dbName: string;
	githubId: string;
	githubSecret: string;
	authSecret: string;
	adminGithubId: string;
	siteUrl: string;
}

function required(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`[env] Missing required ${name}`);
	return value;
}

export function getEnv(): ServerEnv {
	return {
		dbHost: process.env.DB_HOST ?? "127.0.0.1",
		dbPort: Number(process.env.DB_PORT ?? "3306"),
		dbUser: required("DB_USER"),
		dbPassword: required("DB_PASSWORD"),
		dbName: required("DB_NAME"),
		githubId: required("AUTH_GITHUB_ID"),
		githubSecret: required("AUTH_GITHUB_SECRET"),
		authSecret: required("AUTH_SECRET"),
		adminGithubId: required("ADMIN_GITHUB_ID"),
		siteUrl: process.env.PUBLIC_SITE_URL ?? "http://localhost:4321",
	};
}
