/**
 * `url` when it is an absolute http(s) URL, null otherwise. React doesn't block
 * `javascript:` links, so a URL stored in the backend goes through this before it
 * reaches an `href` or `window.open`.
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
    if (!url) return null;
    try {
        const { protocol } = new URL(url);
        return protocol === "http:" || protocol === "https:" ? url : null;
    } catch {
        return null;
    }
}
