import { describe, it, expect, beforeEach } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { http, HttpResponse } from "msw";

import NotificationBell from "./NotificationBell";
import type { AppNotification } from "../api/notifications.api";
import { NOTIFICATIONS_QUERY_KEY } from "../hooks/useNotifications";
import { renderWithRouter } from "@/test/utils";
import { server } from "@/test/msw/server";
import { loginAsUser } from "@/test/helpers/auth.helpers";

const notification = (overrides: Partial<AppNotification> = {}): AppNotification => ({
    notification_id: 1,
    user_id: 1,
    notification_type: "TASK_DONE",
    notification_message: 'Sample import #12 on project "Alpha" is finished.',
    task_id: 12,
    project_id: 3,
    is_read: false,
    notification_creation_utc_date_time: new Date().toISOString(),
    ...overrides,
});

/** Backend state the handlers serve and change. */
let stored: AppNotification[] = [];
const unread = () => stored.filter((n) => !n.is_read).length;

function useStoredNotifications() {
    server.use(
        http.get("*/notifications/unread_count", () => HttpResponse.json({ unread_count: unread() })),
        http.get("*/notifications", ({ request }) => {
            const url = new URL(request.url);
            const unreadOnly = url.searchParams.get("unread_only") === "true";
            const limit = Number(url.searchParams.get("limit") ?? 10);
            const items = stored.filter((n) => !unreadOnly || !n.is_read).slice(0, limit);
            return HttpResponse.json({
                notifications: items,
                search_info: { total: items.length, limit, total_on_page: items.length, page: 1, pages: 1 },
                unread_count: unread(),
            });
        }),
        http.post("*/notifications/read", () => {
            stored = stored.map((n) => ({ ...n, is_read: true }));
            return HttpResponse.json({ marked_read: 1 });
        }),
        http.post("*/notifications/:id/read", ({ params }) => {
            stored = stored.map((n) => (n.notification_id === Number(params.id) ? { ...n, is_read: true } : n));
            return HttpResponse.json({ message: "Notification marked as read" });
        }),
        http.delete("*/notifications/:id", ({ params }) => {
            stored = stored.filter((n) => n.notification_id !== Number(params.id));
            return HttpResponse.json({ message: "Notification deleted" });
        }),
    );
}

const renderBell = () =>
    renderWithRouter(
        <>
            <NotificationBell />
            <Routes>
                <Route path="/" element={<h1>Home Page</h1>} />
                <Route path="/projects/:id/tasks/:taskId" element={<h1>Task Page</h1>} />
            </Routes>
        </>,
    );

describe("NotificationBell", () => {
    beforeEach(() => {
        loginAsUser();
        stored = [];
        useStoredNotifications();
    });

    it("badges the unread count and lists the notifications", async () => {
        stored = [notification(), notification({ notification_id: 2, notification_type: "TASK_ERROR", notification_message: "Raw export #13 failed.", is_read: true })];
        const user = userEvent.setup();
        renderBell();

        const bell = await screen.findByRole("button", { name: "Notifications (1 unread)" });
        await user.click(bell);

        expect(await screen.findByText('Sample import #12 on project "Alpha" is finished.')).toBeInTheDocument();
        expect(screen.getByText("Raw export #13 failed.")).toBeInTheDocument();
    });

    it("shows an empty state", async () => {
        const user = userEvent.setup();
        renderBell();

        await user.click(await screen.findByRole("button", { name: "Notifications" }));
        expect(await screen.findByText(/No notifications yet/)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Mark all as read" })).toBeDisabled();
    });

    it("opening a notification marks it as read and goes to its task", async () => {
        stored = [notification()];
        const user = userEvent.setup();
        renderBell();

        await user.click(await screen.findByRole("button", { name: "Notifications (1 unread)" }));
        await user.click(await screen.findByText('Sample import #12 on project "Alpha" is finished.'));

        expect(await screen.findByRole("heading", { name: "Task Page" })).toBeInTheDocument();
        await waitFor(() => expect(stored[0].is_read).toBe(true));
        expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
    });

    it("marks all as read and deletes a notification", async () => {
        stored = [notification(), notification({ notification_id: 2, notification_message: "Raw export #13 is finished." })];
        const user = userEvent.setup();
        renderBell();

        await user.click(await screen.findByRole("button", { name: "Notifications (2 unread)" }));
        await user.click(await screen.findByRole("button", { name: "Mark all as read" }));
        await waitFor(() => expect(unread()).toBe(0));

        const [firstDelete] = screen.getAllByRole("button", { name: "Delete notification" });
        await user.click(firstDelete);
        await waitFor(() => expect(screen.queryByText('Sample import #12 on project "Alpha" is finished.')).not.toBeInTheDocument());
        expect(stored).toHaveLength(1);
    });

    it("pops up a notification arriving after the first load, not the ones already there", async () => {
        stored = [notification({ notification_message: "Older import is finished." })];
        const { queryClient } = renderBell();
        await screen.findByRole("button", { name: "Notifications (1 unread)" });
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();

        stored = [notification({ notification_id: 2, notification_message: "CTD import #20 is finished." }), ...stored];
        await act(() => queryClient.refetchQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY, "unread_count"] }));

        expect(await screen.findByRole("alert")).toHaveTextContent("CTD import #20 is finished.");
        expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
    });
});
