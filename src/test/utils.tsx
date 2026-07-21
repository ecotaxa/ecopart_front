import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactElement } from "react";

interface RenderWithRouterOptions {
    route?: string;
    state?: Record<string, unknown>;
}

/**
 * Custom render function that wraps the component in a MemoryRouter (for
 * `useNavigate`/`useLocation`) and a React Query provider — mirroring the app
 * root (`AppProviders`), which always supplies both. A fresh QueryClient is
 * created per render so no query cache leaks between tests, and retries are off
 * so a mocked error surfaces immediately instead of being retried.
 */
export function renderWithRouter(ui: ReactElement, { route = "/", state }: RenderWithRouterOptions = {}) {
    const initialEntry = state ? { pathname: route, state } : route;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return {
        ...render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter initialEntries={[initialEntry]}>
                    {ui}
                </MemoryRouter>
            </QueryClientProvider>
        ),
    };
}
