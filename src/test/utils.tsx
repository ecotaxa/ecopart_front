import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ReactElement } from "react";

/**
 * Custom render function that wraps the component in a MemoryRouter.
 * This is essential for testing components that use 'useNavigate' or 'useLocation'.
 */
export function renderWithRouter(ui: ReactElement, { route = "/" } = {}) {
    return {
        ...render(
            <MemoryRouter initialEntries={[route]}>
                {ui}
            </MemoryRouter>
        ),
    };
}