import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { TASKS_QUERY_KEY } from "@/features/projects/hooks/useTasksTable";
import {
    type AppNotification,
    deleteNotification,
    getNotifications,
    getUnreadNotificationCount,
    markAllNotificationsRead,
    markNotificationRead,
} from "../api/notifications.api";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"] as const;

/** How often the bell asks for the unread count while the tab is visible. */
export const NOTIFICATIONS_POLL_MS = 30_000;

/** Number of notifications listed in the bell menu. */
export const NOTIFICATIONS_MENU_SIZE = 20;

/** Unread count of the logged user, polled while `enabled` (signed in). */
export function useUnreadNotificationCount(enabled: boolean) {
    return useQuery({
        queryKey: [...NOTIFICATIONS_QUERY_KEY, "unread_count"],
        queryFn: getUnreadNotificationCount,
        enabled,
        refetchInterval: NOTIFICATIONS_POLL_MS,
        refetchOnWindowFocus: true,
    });
}

/** The latest notifications, loaded while the bell menu is open. */
export function useNotificationList(enabled: boolean) {
    return useQuery({
        queryKey: [...NOTIFICATIONS_QUERY_KEY, "list"],
        queryFn: () => getNotifications({ limit: NOTIFICATIONS_MENU_SIZE }),
        enabled,
    });
}

/** Read / read-all / delete, each refreshing the count and the list. */
export function useNotificationActions() {
    const queryClient = useQueryClient();
    const onSettled = () => queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY] });

    const markRead = useMutation({ mutationFn: markNotificationRead, onSettled });
    const markAllRead = useMutation({ mutationFn: markAllNotificationsRead, onSettled });
    const remove = useMutation({ mutationFn: deleteNotification, onSettled });

    return {
        markRead: (id: number) => markRead.mutate(id),
        markAllRead: () => markAllRead.mutate(),
        remove: (id: number) => remove.mutate(id),
    };
}

/**
 * The newest unread notification, each time the unread count goes up after the
 * first load (so the notifications already there when the page opens never pop up).
 * A new notification means a task ended: the task lists are refreshed too.
 */
export function useIncomingNotification(unreadCount: number | undefined) {
    const queryClient = useQueryClient();
    const previous = useRef<number | undefined>(undefined);
    const [incoming, setIncoming] = useState<AppNotification | null>(null);

    useEffect(() => {
        const before = previous.current;
        previous.current = unreadCount;
        if (unreadCount === undefined || before === undefined || unreadCount <= before) return;

        void queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY, "list"] });
        void queryClient.invalidateQueries({ queryKey: [...TASKS_QUERY_KEY] });
        getNotifications({ limit: 1, unreadOnly: true })
            .then(({ notifications }) => {
                if (notifications[0]) setIncoming(notifications[0]);
            })
            // Best effort: the badge already shows there is something new.
            .catch(() => undefined);
    }, [unreadCount, queryClient]);

    return { incoming, dismissIncoming: () => setIncoming(null) };
}
