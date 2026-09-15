import { render, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement, ReactNode } from "react";

import ConfirmDialogHost from "@/shared/components/ConfirmDialog";

interface RenderWithRouterOptions {
    route?: string;
    state?: Record<string, unknown>;
}

/**
 * A React Query client for tests: retries are off so a mocked error surfaces
 * immediately instead of being retried, and nothing is cached between tests
 * (a fresh client is created per render).
 */
export function createTestQueryClient() {
    return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}

/**
 * Custom render function that wraps the component in a MemoryRouter (for
 * `useNavigate`/`useLocation`), a React Query provider and the confirm-dialog
 * host — mirroring the app root (`AppProviders`), which always supplies them.
 */
export function renderWithRouter(ui: ReactElement, { route = "/", state }: RenderWithRouterOptions = {}) {
    const initialEntry = state ? { pathname: route, state } : route;
    const queryClient = createTestQueryClient();
    return {
        ...render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={[initialEntry]}>
                    {ui}
                    <ConfirmDialogHost />
                </MemoryRouter>
            </QueryClientProvider>
        ),
        queryClient,
    };
}

/**
 * `renderHook` with the same providers as the app root, for hooks that read
 * React Query (`useQuery`, `useQueryClient`) or the router.
 */
export function renderHookWithProviders<Result, Props>(
    hook: (props: Props) => Result,
    { route = "/" }: { route?: string } = {},
) {
    const queryClient = createTestQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
        </QueryClientProvider>
    );
    return { ...renderHook(hook, { wrapper }), queryClient };
}
