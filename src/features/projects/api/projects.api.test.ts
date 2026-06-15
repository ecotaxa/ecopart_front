import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';

import { server } from '@/test/msw/server';
import {
    searchProjectTasks,
    deleteProjectTask,
    getTaskLog,
    exportProjectBackup,
    runProjectBackup,
    getImportFolders,
    getImportFolderMetadata,
    getLastBackupDate,
    getImportableRawSamples,
    importRawSamples,
    getImportableEcoTaxaSamples,
    importEcoTaxaSamples,
    searchProjectSamples,
    searchProjectEcoTaxaSamples,
    deleteProjectSample,
    deleteProjectEcoTaxaSamples,
    searchProjectCtdSamples,
    getImportableCtdSamples,
    importProjectCtdSamples,
    deleteProjectCtdSamples,
    searchProjects,
    getProjectById,
    updateProject,
    getOneTask,
    SearchFilter,
} from './projects.api';

const PID = 77;
const TASK = { task_id: 9, task_status: 'PENDING', task_type: 'BACKUP' };

describe('Projects API helpers (W)', () => {
    // TC-W1: Backup launchers
    it('TC-W1: exportProjectBackup and runProjectBackup POST the right body', async () => {
        let exportBody: unknown;
        let runBody: unknown;
        let exportPath = '';
        let runPath = '';
        server.use(
            http.post('*/projects/:id/backup/export', async ({ request }) => {
                exportPath = new URL(request.url).pathname;
                exportBody = await request.json();
                return HttpResponse.json(TASK);
            }),
            http.post('*/projects/:id/backup', async ({ request }) => {
                runPath = new URL(request.url).pathname;
                runBody = await request.json();
                return HttpResponse.json(TASK);
            }),
        );

        await expect(exportProjectBackup(PID, { ftp_export: true })).resolves.toEqual(TASK);
        expect(exportPath).toBe('/projects/77/backup/export');
        expect(exportBody).toEqual({ ftp_export: true });

        await expect(runProjectBackup(PID, { skip_already_imported: false })).resolves.toEqual(TASK);
        expect(runPath).toBe('/projects/77/backup');
        expect(runBody).toEqual({ skip_already_imported: false });
    });

    // TC-W2: File-system folders
    it('TC-W2: getImportFolders builds an optional folder_path query; metadata is fetched', async () => {
        let folderPathParam: string | null = 'unset';
        server.use(
            http.get('*/file_system/import_folders', ({ request }) => {
                folderPathParam = new URL(request.url).searchParams.get('folder_path');
                return HttpResponse.json(['/a', '/b']);
            }),
            http.get('*/file_system/import_folder_metadata', ({ request }) => {
                const fp = new URL(request.url).searchParams.get('folder_path');
                return HttpResponse.json({
                    project_acronym: 'ACR', project_description: '', cruise: '', ship: '',
                    serial_number: 'sn1', instrument_model: 'UVP5HD', _echo: fp,
                });
            }),
        );

        await expect(getImportFolders()).resolves.toEqual(['/a', '/b']);
        expect(folderPathParam).toBeNull();

        await getImportFolders('  /srv/a b  ');
        expect(folderPathParam).toBe('/srv/a b'); // trimmed + url-decoded

        const meta = await getImportFolderMetadata('/srv/x');
        expect(meta).toMatchObject({ instrument_model: 'UVP5HD', serial_number: 'sn1' });
    });

    // TC-W3: Last backup date
    it('TC-W3: getLastBackupDate returns the backup date (and passes null through)', async () => {
        server.use(
            http.get('*/projects/:id/backup/last-date', () =>
                HttpResponse.json({ last_backup_date: '2026-01-01T00:00:00.000Z' }),
            ),
        );
        await expect(getLastBackupDate(PID)).resolves.toEqual({ last_backup_date: '2026-01-01T00:00:00.000Z' });

        server.use(
            http.get('*/projects/:id/backup/last-date', () => HttpResponse.json({ last_backup_date: null })),
        );
        await expect(getLastBackupDate(PID)).resolves.toEqual({ last_backup_date: null });
    });

    // TC-W4: Raw samples
    it('TC-W4: getImportableRawSamples (GET) and importRawSamples (POST body)', async () => {
        let importPath = '';
        let importBody: unknown;
        server.use(
            http.get('*/projects/:id/samples/can_be_imported', () =>
                HttpResponse.json([{ sample_name: 'raw-1' }]),
            ),
            http.post('*/projects/:id/samples/import', async ({ request }) => {
                importPath = new URL(request.url).pathname;
                importBody = await request.json();
                return HttpResponse.json({ success: true, task_import_samples: 42 });
            }),
        );

        await expect(getImportableRawSamples(PID)).resolves.toEqual([{ sample_name: 'raw-1' }]);

        await importRawSamples(PID, {
            samples: ['raw-1'],
            backup_project: true,
            backup_project_skip_already_imported: false,
        });
        expect(importPath).toBe('/projects/77/samples/import');
        expect(importBody).toEqual({
            samples: ['raw-1'],
            backup_project: true,
            backup_project_skip_already_imported: false,
        });
    });

    // TC-W5: EcoTaxa import samples
    it('TC-W5: getImportableEcoTaxaSamples (GET) and importEcoTaxaSamples forwards ecotaxa_user', async () => {
        let body: unknown;
        server.use(
            http.get('*/projects/:id/ecotaxa_samples/can_be_imported', () =>
                HttpResponse.json([{ sample_id: 1, sample_name: 'eco-1', tsv_file_name: 't', local_folder_tsv_path: 'p', images: 5 }]),
            ),
            http.post('*/projects/:id/ecotaxa_samples/import', async ({ request }) => {
                body = await request.json();
                return HttpResponse.json({ success: true });
            }),
        );

        await expect(getImportableEcoTaxaSamples(PID)).resolves.toHaveLength(1);

        await expect(importEcoTaxaSamples(PID, { samples: ['eco-1'], ecotaxa_user: 'bob' }))
            .resolves.toEqual({ success: true });
        expect(body).toEqual({ samples: ['eco-1'], ecotaxa_user: 'bob' });
    });

    // TC-W6: UVP sample search + EcoTaxa list normalization + deletes
    it('TC-W6: searchProjectSamples query/body, ecotaxa normalization, sample deletes', async () => {
        const filter: SearchFilter = { field: 'sample_name', operator: 'LIKE', value: '%a%' };
        let searchUrl: URL | null = null;
        let searchBody: unknown;
        server.use(
            http.post('*/projects/:id/samples/searches', async ({ request }) => {
                searchUrl = new URL(request.url);
                searchBody = await request.json();
                return HttpResponse.json({ search_info: { total: 3, page: 2, limit: 5 }, samples: [] });
            }),
        );
        const res = await searchProjectSamples(PID, { page: 2, limit: 5, sort_by: 'desc(sample_id)', filters: [filter] });
        expect(res.search_info.total).toBe(3);
        expect(searchUrl!.pathname).toBe('/projects/77/samples/searches');
        expect(searchUrl!.searchParams.get('page')).toBe('2');
        expect(searchUrl!.searchParams.get('limit')).toBe('5');
        expect(searchUrl!.searchParams.get('sort_by')).toBe('desc(sample_id)');
        expect(searchBody).toEqual([filter]);

        // EcoTaxa list: object shape passes through.
        server.use(
            http.get('*/projects/:id/ecotaxa_samples', () =>
                HttpResponse.json({ search_info: { total: 1, page: 1, limit: 10 }, samples: [{ sample_id: 1 }] }),
            ),
        );
        const objShape = await searchProjectEcoTaxaSamples(PID, { page: 1, limit: 10, filters: [] });
        expect(objShape.search_info.total).toBe(1);
        expect(objShape.samples).toHaveLength(1);

        // EcoTaxa list: bare array is normalized into a paginated shape.
        server.use(
            http.get('*/projects/:id/ecotaxa_samples', () =>
                HttpResponse.json([{ sample_id: 1 }, { sample_id: 2 }]),
            ),
        );
        const arrShape = await searchProjectEcoTaxaSamples(PID, { page: 1, limit: 10, filters: [] });
        expect(arrShape.search_info).toEqual({ total: 2, page: 1, limit: 2 });
        expect(arrShape.samples).toHaveLength(2);

        // Deletes.
        let deletePath = '';
        let ecoDeleteBody: unknown;
        server.use(
            http.delete('*/projects/:id/samples/:sampleId', ({ request }) => {
                deletePath = new URL(request.url).pathname;
                return HttpResponse.json({ message: 'ok' });
            }),
            http.delete('*/projects/:id/ecotaxa_samples', async ({ request }) => {
                ecoDeleteBody = await request.json();
                return HttpResponse.json({ message: 'ok' });
            }),
        );
        await deleteProjectSample(PID, 9);
        expect(deletePath).toBe('/projects/77/samples/9');

        await deleteProjectEcoTaxaSamples(PID, ['a', 'b']);
        expect(ecoDeleteBody).toEqual({ samples: ['a', 'b'] });
    });

    // TC-W7: CTD search/import/delete + normalization
    it('TC-W7: CTD search & importable normalization, import and delete', async () => {
        // search: object shape passes through
        server.use(
            http.get('*/projects/:id/ctd_samples', () =>
                HttpResponse.json({ search_info: { total: 1, page: 1, limit: 10 }, samples: [{ sample_name: 'c1' }] }),
            ),
        );
        const objShape = await searchProjectCtdSamples(PID, { page: 1, limit: 10, filters: [] });
        expect(objShape.samples).toEqual([{ sample_name: 'c1' }]);

        // search: bare array normalized
        server.use(
            http.get('*/projects/:id/ctd_samples', () => HttpResponse.json([{ sample_name: 'c1' }, { sample_name: 'c2' }])),
        );
        const arrShape = await searchProjectCtdSamples(PID, { page: 1, limit: 10, filters: [] });
        expect(arrShape.search_info).toEqual({ total: 2, page: 1, limit: 2 });

        // importable: string array → objects with file_extension "ctd"
        server.use(
            http.get('*/projects/:id/ctd_samples/can_be_imported', () => HttpResponse.json(['ctd-1', 'ctd-2'])),
        );
        const importable = await getImportableCtdSamples(PID);
        expect(importable).toEqual([
            { sample_name: 'ctd-1', file_extension: 'ctd' },
            { sample_name: 'ctd-2', file_extension: 'ctd' },
        ]);

        // importable: object shape ({samples:[...]} with already-objects) passes through unchanged
        server.use(
            http.get('*/projects/:id/ctd_samples/can_be_imported', () =>
                HttpResponse.json({ samples: [{ sample_name: 'ctd-9', file_extension: 'ctd', station_id: 'S1' }] }),
            ),
        );
        const objImportable = await getImportableCtdSamples(PID);
        expect(objImportable).toEqual([{ sample_name: 'ctd-9', file_extension: 'ctd', station_id: 'S1' }]);

        // importable: empty payload → empty list
        server.use(
            http.get('*/projects/:id/ctd_samples/can_be_imported', () => HttpResponse.json([])),
        );
        await expect(getImportableCtdSamples(PID)).resolves.toEqual([]);

        // import + delete
        let importBody: unknown;
        let deleteBody: unknown;
        server.use(
            http.post('*/projects/:id/ctd_samples/import', async ({ request }) => {
                importBody = await request.json();
                return HttpResponse.json(TASK);
            }),
            http.delete('*/projects/:id/ctd_samples', async ({ request }) => {
                deleteBody = await request.json();
                return HttpResponse.json({ message: 'ok' });
            }),
        );
        await expect(importProjectCtdSamples(PID, { samples: ['ctd-1'] })).resolves.toEqual(TASK);
        expect(importBody).toEqual({ samples: ['ctd-1'] });

        await deleteProjectCtdSamples(PID, ['c1']);
        expect(deleteBody).toEqual({ samples: ['c1'] });
    });

    // TC-W8: searchProjects normalization, getProjectById, and error mapping
    it('TC-W8: searchProjects normalizes, getProjectById finds/throws, errors are mapped', async () => {
        // Happy path with an unusual backend shape (results + flat total)
        server.use(
            http.post('*/projects/searches', () =>
                HttpResponse.json({ results: [{ project_id: 77, project_title: 'P' }], total: 1 }),
            ),
        );
        const search = await searchProjects({ page: 1, limit: 10, filters: [] });
        expect(search.projects).toHaveLength(1);
        expect(search.search_info.total).toBe(1);

        const project = await getProjectById(77);
        expect(project.project_id).toBe(77);

        // Empty result → getProjectById throws not-found
        server.use(
            http.post('*/projects/searches', () => HttpResponse.json({ projects: [] })),
        );
        await expect(getProjectById(77)).rejects.toThrow('Project with ID 77 not found.');

        // 400 with a backend message → http maps it to Error(message)
        server.use(
            http.post('*/projects/searches', () => HttpResponse.json({ message: 'Bad thing' }, { status: 400 })),
        );
        await expect(searchProjects({ page: 1, limit: 10, filters: [] })).rejects.toThrow('Bad thing');
    });

    // TC-W9: updateProject PATCHes the project payload
    it('TC-W9: updateProject sends a PATCH with the partial payload', async () => {
        let method = '';
        let path = '';
        let body: unknown;
        server.use(
            http.patch('*/projects/:id', async ({ request }) => {
                method = request.method;
                path = new URL(request.url).pathname;
                body = await request.json();
                return HttpResponse.json({ project_id: 77, project_title: 'Updated' });
            }),
        );

        const updated = await updateProject(77, { project_title: 'Updated' });
        expect(method).toBe('PATCH');
        expect(path).toBe('/projects/77');
        expect(body).toEqual({ project_title: 'Updated' });
        expect(updated.project_title).toBe('Updated');
    });

    // TC-W10: getOneTask fetches a single task by id
    it('TC-W10: getOneTask GETs /tasks/:id/ and returns the task', async () => {
        let path = '';
        server.use(
            http.get('*/tasks/:taskId/', ({ request }) => {
                path = new URL(request.url).pathname;
                return HttpResponse.json({ task_id: 5, task_type: 'IMPORT', task_status: 'DONE' });
            }),
        );

        const task = await getOneTask(5);
        expect(path).toBe('/tasks/5/');
        expect(task).toMatchObject({ task_id: 5, task_status: 'DONE' });
    });
});

// Task helpers live in the same projects.api.ts module; the only way to assert the
// internal `task_project_id` filter injection is to exercise the real function vs MSW.
describe('Task helpers (V)', () => {
    let lastSearchBody: unknown;
    let lastSearchUrl: URL | null;

    beforeEach(() => {
        lastSearchBody = undefined;
        lastSearchUrl = null;
        server.use(
            http.post('*/tasks/searches', async ({ request }) => {
                lastSearchUrl = new URL(request.url);
                lastSearchBody = await request.json();
                return HttpResponse.json({ search_info: { total: 0, page: 1, limit: 10 }, tasks: [] });
            }),
        );
    });

    const userFilter: SearchFilter = { field: 'task_type', operator: 'LIKE', value: '%IMPORT%' };

    // TC-V1: projectId injection
    it('TC-V1: injects a task_project_id filter and forwards page/limit/sort_by', async () => {
        await searchProjectTasks({
            projectId: 77,
            page: 2,
            limit: 25,
            sort_by: 'desc(task_id)',
            filters: [userFilter],
        });

        expect(lastSearchBody).toEqual([
            { field: 'task_project_id', operator: '=', value: 77 },
            userFilter,
        ]);
        expect(lastSearchUrl?.searchParams.get('page')).toBe('2');
        expect(lastSearchUrl?.searchParams.get('limit')).toBe('25');
        expect(lastSearchUrl?.searchParams.get('sort_by')).toBe('desc(task_id)');
    });

    // TC-V2: no project filter when projectId omitted
    it('TC-V2: sends only the provided filters when no projectId is given', async () => {
        await searchProjectTasks({
            page: 1,
            limit: 10,
            filters: [userFilter],
        });

        expect(lastSearchBody).toEqual([userFilter]);
    });

    // TC-V3: delete + log endpoints
    it('TC-V3: deleteProjectTask hits DELETE /tasks/:id/ and getTaskLog returns raw text', async () => {
        let deletedPath: string | null = null;
        server.use(
            http.delete('*/tasks/:taskId/', ({ request }) => {
                deletedPath = new URL(request.url).pathname;
                return HttpResponse.json({ message: 'removed' });
            }),
            http.get('*/tasks/:taskId/log', () =>
                HttpResponse.text('line 1\nimport done successfully'),
            ),
        );

        const deleteResult = await deleteProjectTask(42);
        expect(deleteResult).toEqual({ message: 'removed' });
        expect(deletedPath).toBe('/tasks/42/');

        const log = await getTaskLog(42);
        expect(log).toBe('line 1\nimport done successfully');
    });
});
