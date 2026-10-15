import type { MinimalUserModel, Project } from '@/features/projects/api/projects.api';
import type { ProjectPrivacyStatus } from '@/features/projects/utils/projectAccess';

const toUser = (user_id: number): MinimalUserModel => ({
    user_id,
    user_name: `User ${user_id}`,
    email: `user${user_id}@test.com`,
});

export interface ProjectFixtureOptions extends Partial<Omit<Project, 'managers' | 'members' | 'contact'>> {
    /** User ids of the managers; the first one is the contact. */
    managers?: number[];
    members?: number[];
    privacy_status?: ProjectPrivacyStatus;
}

/**
 * A project as the backend returns it (POST /projects/searches, GET /projects/:id),
 * with the privileges given as user ids. A user without privilege gets no
 * `root_folder_path`: pass `root_folder_path: undefined` to mimic it.
 */
export const makeProjectFixture = ({
    managers = [],
    members = [],
    privacy_status = 'private',
    ...overrides
}: ProjectFixtureOptions = {}): Project => ({
    project_id: 101,
    project_title: 'Test Project',
    project_acronym: 'TEST',
    instrument_model: 'UVP5HD',
    ecotaxa_project_name: null,
    ecotaxa_project_id: null,
    ecotaxa_instance_id: null,
    root_folder_path: '/data/test',
    privacy_duration: 2,
    visible_duration: 24,
    public_duration: 36,
    project_creation_utc_date_time: '2026-01-01T00:00:00.000Z',
    privacy_status,
    managers: managers.map(toUser),
    members: members.map(toUser),
    contact: managers.length > 0 ? toUser(managers[0]) : undefined,
    ...overrides,
});
