const hits = new Map<string, number[]>();

export function checkLimit(
	key: string,
	max = 3,
	windowMs = 60_000,
): { ok: boolean; retryAfter: number } {
	const now = Date.now();
	const windowStart = now - windowMs;
	const stamps = (hits.get(key) ?? []).filter((t) => t > windowStart);
	if (stamps.length >= max) {
		const retryAfter = Math.ceil((stamps[0] + windowMs - now) / 1000);
		hits.set(key, stamps);
		return { ok: false, retryAfter: Math.max(retryAfter, 1) };
	}
	stamps.push(now);
	hits.set(key, stamps);
	return { ok: true, retryAfter: 0 };
}
