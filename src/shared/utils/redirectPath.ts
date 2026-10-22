/** Where a signed-in user lands when nothing asked for a specific page. */
export const DEFAULT_AFTER_LOGIN = "/dashboard";

/**
 * The in-app page a protected route sent the user away from (`location.state.from`,
 * set by `ProtectedRoute`), or `fallback`. Only same-app paths are honoured, never
 * an absolute or protocol-relative URL, so the redirect can't send the user off-site.
 */
export function redirectPathFromState(state: unknown, fallback = DEFAULT_AFTER_LOGIN): string {
    const from = (state as { from?: unknown } | null)?.from;
    return typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from : fallback;
}
