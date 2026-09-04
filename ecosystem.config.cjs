// PM2 cluster config for Baota deploy (Task 7).
// Server entry/port contract from Task 1: standalone, 127.0.0.1:3000 only.
module.exports = {
	apps: [
		{
			name: "blog",
			cwd: "/www/wwwroot/blog",
			script: "./dist/server/entry.mjs",
			exec_mode: "cluster",
			instances: "max",
			watch: false,
			max_memory_restart: "500M",
			env_production: {
				NODE_ENV: "production",
				PORT: "3000",
				HOSTNAME: "127.0.0.1",
			},
		},
	],
};
