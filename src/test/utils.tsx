import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ReactElement } from "react";

interface RenderWithRouterOptions {
    route?: string;
    state?: Record<string, unknown>;
}

/**
 * Custom render function that wraps the component in a MemoryRouter.
 * This is essential for testing components that use 'useNavigate' or 'useLocation'.
 * It simulates a mini-true-browser.
 */
export function renderWithRouter(ui: ReactElement, { route = "/", state }: RenderWithRouterOptions = {}) {
    const initialEntry = state ? { pathname: route, state } : route;
    return {
        ...render(
            <MemoryRouter initialEntries={[initialEntry]}>
                {ui}
            </MemoryRouter>
        ),
    };
}