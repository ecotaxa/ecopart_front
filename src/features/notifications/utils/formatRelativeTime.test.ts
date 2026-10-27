import { describe, it, expect } from "vitest";

import { formatRelativeTime } from "./formatRelativeTime";
import { notificationLink, type AppNotification } from "../api/notifications.api";

describe("formatRelativeTime", () => {
    const now = new Date("2026-10-26T12:00:00.000Z");

    it.each([
        ["2026-10-26T11:59:30.000Z", "just now"],
        ["2026-10-26T11:55:00.000Z", "5 minutes ago"],
        ["2026-10-26T09:00:00.000Z", "3 hours ago"],
        ["2026-10-25T12:00:00.000Z", "yesterday"],
        ["2026-10-12T12:00:00.000Z", "2 weeks ago"],
    ])("%s → %s", (iso, expected) => {
        expect(formatRelativeTime(iso, now)).toBe(expected);
    });

    it("returns an empty string for an invalid date", () => {
        expect(formatRelativeTime("not a date", now)).toBe("");
    });
});

describe("notificationLink", () => {
    const base = { task_id: 12, project_id: 3 } as AppNotification;

    it("leads to the task inside its project, or to the global task page", () => {
        expect(notificationLink(base)).toBe("/projects/3/tasks/12");
        expect(notificationLink({ ...base, project_id: null })).toBe("/tasks/12");
    });

    it("falls back to the project once the task is deleted, else nowhere", () => {
        expect(notificationLink({ ...base, task_id: null })).toBe("/projects/3");
        expect(notificationLink({ ...base, task_id: null, project_id: null })).toBeNull();
    });
});
