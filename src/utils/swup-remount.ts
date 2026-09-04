export function onSwupReplace(callback: () => void): () => void {
	const handler = () => callback();
	document.addEventListener("swup:content:replace", handler);
	window.addEventListener("swup:page:view", handler);
	return () => {
		document.removeEventListener("swup:content:replace", handler);
		window.removeEventListener("swup:page:view", handler);
	};
}
