import { http } from "@/shared/api/http";

// ============================================================================
// NOTIFICATIONS API
// ============================================================================
// Notifications addressed to the logged user, created by the backend (e.g. when
// one of their tasks ends: "Sample import #12 on project "Alpha" is finished.").
//
// Backend endpoints (all cookie-authed via http()):
//  - GET    /notifications?page&limit&unread_only → a page, newest first, + unread count
//  - GET    /notifications/unread_count           → { unread_count } (polled by the bell)
//  - POST   /notifications/read                   → mark all as read
//  - POST   /notifications/:id/read               → mark one as read
//  - DELETE /notifications/:id                    → delete one
// ============================================================================

export type NotificationType = "TASK_DONE" | "TASK_ERROR" | "TASK_CANCELLED";

export interface AppNotification {
    notification_id: number;
    user_id: number;
    notification_type: NotificationType;
    notification_message: string;
    // Null once the task (or its project) is deleted.
    task_id: number | null;
    project_id: number | null;
    is_read: boolean;
    notification_creation_utc_date_time: string; // ISO
}

export interface NotificationPage {
    notifications: AppNotification[];
    search_info: { total: number; limit: number; total_on_page: number; page: number; pages: number };
    unread_count: number;
}

export async function getNotifications(
    { page = 1, limit = 10, unreadOnly = false }: { page?: number; limit?: number; unreadOnly?: boolean } = {},
): Promise<NotificationPage> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit), unread_only: String(unreadOnly) });
    return http<NotificationPage>(`/notifications?${params}`);
}

export async function getUnreadNotificationCount(): Promise<number> {
    const { unread_count } = await http<{ unread_count: number }>("/notifications/unread_count");
    return unread_count;
}

export async function markNotificationRead(notificationId: number): Promise<void> {
    await http<{ message: string }>(`/notifications/${notificationId}/read`, { method: "POST" });
}

export async function markAllNotificationsRead(): Promise<void> {
    await http<{ marked_read: number }>("/notifications/read", { method: "POST" });
}

export async function deleteNotification(notificationId: number): Promise<void> {
    await http<{ message: string }>(`/notifications/${notificationId}`, { method: "DELETE" });
}

/** Where a notification leads: its task, inside its project when it has one. */
export function notificationLink(notification: AppNotification): string | null {
    if (notification.task_id === null) {
        return notification.project_id === null ? null : `/projects/${notification.project_id}`;
    }
    return notification.project_id === null
        ? `/tasks/${notification.task_id}`
        : `/projects/${notification.project_id}/tasks/${notification.task_id}`;
}
