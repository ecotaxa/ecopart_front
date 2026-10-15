import { describe, it, expect } from 'vitest';

import type { Task } from '../api/projects.api';
import { isActiveTask, isCancellableTask, isDeletableTask } from './taskColumns';

const taskWithStatus = (task_status: string) => ({ task_status } as Task);

describe('task status helpers', () => {
    it.each([
        ['PENDING', true, true, false],
        ['RUNNING', true, true, false],
        ['CANCELLING', true, false, false],
        ['DONE', false, false, true],
        ['ERROR', false, false, true],
        ['CANCELLED', false, false, true],
    ])('%s : active %s, cancellable %s, deletable %s', (status, active, cancellable, deletable) => {
        expect(isActiveTask(taskWithStatus(status))).toBe(active);
        expect(isCancellableTask(taskWithStatus(status))).toBe(cancellable);
        expect(isDeletableTask(taskWithStatus(status))).toBe(deletable);
    });

    it('reads the status case-insensitively', () => {
        expect(isCancellableTask(taskWithStatus('running'))).toBe(true);
    });
});
