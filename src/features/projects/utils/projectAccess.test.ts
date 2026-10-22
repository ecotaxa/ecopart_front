import { describe, expect, it } from 'vitest';

import {
    PROJECT_ACTIONS,
    getProjectAccess,
    getProjectRole,
    isProjectActionAllowed,
    privacyLabel,
    roleLabel,
    toPrivacyStatus,
    type ProjectAction,
    type ProjectPrivacyStatus,
    type ProjectRole,
} from './projectAccess';

const ADMIN = { user_id: 1, is_admin: true };
const USER = { user_id: 1, is_admin: false };

// The functional matrix, written out cell by cell: V = allowed.
const MATRIX: Record<ProjectRole, Record<ProjectPrivacyStatus, ProjectAction[]>> = {
    admin: {
        private: [...PROJECT_ACTIONS],
        visible: [...PROJECT_ACTIONS],
        public: [...PROJECT_ACTIONS],
        open: [...PROJECT_ACTIONS],
    },
    manager: {
        private: [...PROJECT_ACTIONS],
        visible: [...PROJECT_ACTIONS],
        public: [...PROJECT_ACTIONS],
        open: [...PROJECT_ACTIONS],
    },
    member: {
        private: ['see', 'figures', 'export_particles', 'export_ecotaxa', 'import'],
        visible: ['see', 'figures', 'export_particles', 'export_ecotaxa', 'import'],
        public: ['see', 'figures', 'export_particles', 'export_ecotaxa', 'import'],
        open: ['see', 'figures', 'export_particles', 'export_ecotaxa', 'import'],
    },
    user: {
        private: ['see'],
        visible: ['see', 'figures'],
        public: ['see', 'figures', 'export_particles'],
        open: ['see', 'figures', 'export_particles', 'export_ecotaxa'],
    },
};

const CASES = (Object.keys(MATRIX) as ProjectRole[]).flatMap((role) =>
    (Object.keys(MATRIX[role]) as ProjectPrivacyStatus[]).flatMap((privacy) =>
        PROJECT_ACTIONS.map((action) => [role, privacy, action, MATRIX[role][privacy].includes(action)] as const),
    ),
);

describe('projectAccess (unit)', () => {
    it.each(CASES)('TC-AL1: %s on a %s project, %s allowed = %s', (role, privacy, action, expected) => {
        expect(isProjectActionAllowed(role, privacy, action)).toBe(expected);
    });

    it('TC-AL2: derives the role as admin > manager > member > user', () => {
        const project = { managers: [{ user_id: 1 }], members: [{ user_id: 1 }, { user_id: 2 }] };

        expect(getProjectRole(project, ADMIN)).toBe('admin');
        expect(getProjectRole(project, USER)).toBe('manager');
        expect(getProjectRole(project, { user_id: 2, is_admin: false })).toBe('member');
        expect(getProjectRole(project, { user_id: 3, is_admin: false })).toBe('user');
        // Ids may come back as strings from older payloads.
        expect(getProjectRole({ managers: [{ user_id: '1' as unknown as number }] }, USER)).toBe('manager');
    });

    it('TC-AL3: treats a missing user or project as a plain user (an admin stays admin)', () => {
        expect(getProjectRole({ managers: [{ user_id: 1 }] }, null)).toBe('user');
        expect(getProjectRole(undefined, USER)).toBe('user');
        expect(getProjectRole(undefined, ADMIN)).toBe('admin');
    });

    it('TC-AL4: fails closed on a payload without (or with an unknown) privacy status', () => {
        expect(toPrivacyStatus(undefined)).toBe('private');
        expect(toPrivacyStatus('secret')).toBe('private');
        expect(toPrivacyStatus('open')).toBe('open');

        const access = getProjectAccess({ managers: [], members: [] }, USER);
        expect(access.privacy).toBe('private');
        expect(access.can.figures).toBe(false);
    });

    it('TC-AL5: getProjectAccess combines role, privacy and every action', () => {
        const access = getProjectAccess({ managers: [], members: [], privacy_status: 'public' }, USER);

        expect(access).toEqual({
            role: 'user',
            privacy: 'public',
            can: {
                see: true,
                figures: true,
                export_particles: true,
                export_ecotaxa: false,
                import: false,
                manage: false,
            },
        });
        expect(getProjectAccess({ members: [{ user_id: 1 }], privacy_status: 'private' }, USER).can).toMatchObject({
            figures: true,
            import: true,
            manage: false,
        });
    });

    it('TC-AL6: labels the privacy statuses and the roles for the chips', () => {
        expect((['private', 'visible', 'public', 'open'] as const).map(privacyLabel)).toEqual([
            'Private', 'Visible', 'Public', 'Open',
        ]);
        expect((['admin', 'manager', 'member', 'user'] as const).map(roleLabel)).toEqual([
            'Admin', 'Manager', 'Member', null,
        ]);
    });
});
