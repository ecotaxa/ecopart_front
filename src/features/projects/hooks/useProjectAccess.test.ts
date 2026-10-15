import { afterEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useProjectAccess } from './useProjectAccess';
import { loginAsRole, logoutUser } from '@/test/helpers/auth.helpers';
import { makeProjectFixture } from '@/test/helpers/project.fixtures';

describe('useProjectAccess (unit)', () => {
    afterEach(() => logoutUser());

    it('TC-AL7: combines the logged-in user with the project', () => {
        const project = makeProjectFixture({ ...loginAsRole('member'), privacy_status: 'visible' });

        const { result } = renderHook(() => useProjectAccess(project));

        expect(result.current.role).toBe('member');
        expect(result.current.privacy).toBe('visible');
        expect(result.current.can.import).toBe(true);
        expect(result.current.can.manage).toBe(false);
    });

    it('TC-AL8: grants only "see" while the project is unknown, except to an admin', () => {
        loginAsRole('user');
        const { result, rerender } = renderHook(() => useProjectAccess(undefined));
        expect(Object.entries(result.current.can).filter(([, allowed]) => allowed).map(([action]) => action)).toEqual(['see']);

        loginAsRole('admin');
        rerender();
        expect(result.current.can.manage).toBe(true);
    });
});
