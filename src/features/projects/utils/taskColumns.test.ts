import { describe, it, expect } from 'vitest';

import type { Task } from '../api/projects.api';
import { isActiveTask, isCancellableTask } from './taskColumns';

const taskWithStatus = (task_status: string) => ({ task_status } as Task);

describe('task status helpers', () => {
    it.each([
        ['PENDING', true, true],
        ['RUNNING', true, true],
        ['CANCELLING', true, false],
        ['DONE', false, false],
        ['ERROR', false, false],
        ['CANCELLED', false, false],
    ])('%s : active %s, cancellable %s', (status, active, cancellable) => {
        expect(isActiveTask(taskWithStatus(status))).toBe(active);
        expect(isCancellableTask(taskWithStatus(status))).toBe(cancellable);
    });

    it('reads the status case-insensitively', () => {
        expect(isCancellableTask(taskWithStatus('running'))).toBe(true);
    });
});
