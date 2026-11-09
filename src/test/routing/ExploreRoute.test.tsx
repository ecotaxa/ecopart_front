import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryRouter, type RouteObject } from 'react-router-dom';

vi.mock('@/features/explore/components/ExploreMap', () => ({
    default: () => <div data-testid="explore-map" />,
}));

import { router } from '@/app/router';
import { createTestQueryClient } from '@/test/utils';
import { logoutUser } from '@/test/helpers/auth.helpers';

/** The routes of the application, on a memory router. */
function renderRoute(route: string) {
    const memoryRouter = createMemoryRouter(router.routes as RouteObject[], { initialEntries: [route] });
    render(
        <QueryClientProvider client={createTestQueryClient()}>
            <RouterProvider router={memoryRouter} />
        </QueryClientProvider>,
    );
    return memoryRouter;
}

describe('Explore route (Routing)', () => {
    beforeEach(() => {
        logoutUser();
    });

    it.each(['/explore', '/explore/graphs', '/explore/exportable'])('opens %s to an anonymous visitor', async (route) => {
        const memoryRouter = renderRoute(route);

        expect(await screen.findByRole('heading', { name: 'Explore data' })).toBeInTheDocument();
        expect(memoryRouter.state.location.pathname).toBe(route);
    });

    it('still sends an anonymous visitor of the projects to the login page', async () => {
        const memoryRouter = renderRoute('/projects');

        await waitFor(() => expect(memoryRouter.state.location.pathname).toBe('/login'));
    });
});
