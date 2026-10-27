import { useState, type MouseEvent } from "react";
import {
    Alert,
    Badge,
    Box,
    Button,
    CircularProgress,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Popover,
    Snackbar,
    Tooltip,
    Typography,
} from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import CancelIcon from "@mui/icons-material/Cancel";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";

import { compactScreen } from "@/theme";
import { type AppNotification, type NotificationType, notificationLink } from "../api/notifications.api";
import {
    useIncomingNotification,
    useNotificationActions,
    useNotificationList,
    useUnreadNotificationCount,
} from "../hooks/useNotifications";
import { formatRelativeTime } from "../utils/formatRelativeTime";

const TYPE_STYLE: Record<NotificationType, { severity: "success" | "error" | "info"; Icon: typeof CheckCircleIcon }> = {
    TASK_DONE: { severity: "success", Icon: CheckCircleIcon },
    TASK_ERROR: { severity: "error", Icon: ErrorIcon },
    TASK_CANCELLED: { severity: "info", Icon: CancelIcon },
};

const styleOf = (type: NotificationType) => TYPE_STYLE[type] ?? TYPE_STYLE.TASK_CANCELLED;

/**
 * NotificationBell — top-bar bell of a signed-in user: a badge with the unread
 * count (polled), a menu listing the latest notifications, and a toast when a new
 * one arrives (e.g. "Sample import #12 on project "Alpha" is finished.").
 * Opening a notification marks it as read and goes to its task.
 */
export default function NotificationBell() {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const open = Boolean(anchorEl);

    const { data: unreadCount } = useUnreadNotificationCount(true);
    const list = useNotificationList(open);
    const { markRead, markAllRead, remove } = useNotificationActions();
    const { incoming, dismissIncoming } = useIncomingNotification(unreadCount);

    const openNotification = (notification: AppNotification) => {
        if (!notification.is_read) markRead(notification.notification_id);
        setAnchorEl(null);
        dismissIncoming();
        const link = notificationLink(notification);
        if (link) navigate(link);
    };

    const notifications = list.data?.notifications ?? [];

    return (
        <>
            <Tooltip title="Notifications">
                <IconButton
                    onClick={(event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget)}
                    sx={{ color: "common.white" }}
                    aria-label={unreadCount ? `Notifications (${unreadCount} unread)` : "Notifications"}
                >
                    <Badge badgeContent={unreadCount ?? 0} color="error" max={99}>
                        <NotificationsIcon sx={{ [compactScreen]: { fontSize: 22 } }} />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                transformOrigin={{ vertical: "top", horizontal: "right" }}
                slotProps={{ paper: { sx: { width: 380, maxWidth: "calc(100vw - 32px)" } } }}
            >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1 }}>
                    <Typography fontWeight={600}>Notifications</Typography>
                    <Button size="small" onClick={markAllRead} disabled={!unreadCount}>
                        Mark all as read
                    </Button>
                </Box>
                <Divider />

                {list.isLoading ? (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : list.isError ? (
                    <Alert severity="error" sx={{ m: 2 }}>Cannot load the notifications.</Alert>
                ) : notifications.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 2, py: 3, textAlign: "center" }}>
                        No notifications yet. You will be told here when your imports and exports end.
                    </Typography>
                ) : (
                    <List dense disablePadding sx={{ maxHeight: 420, overflowY: "auto" }}>
                        {notifications.map((notification) => {
                            const { severity, Icon } = styleOf(notification.notification_type);
                            return (
                                <ListItem
                                    key={notification.notification_id}
                                    disablePadding
                                    secondaryAction={
                                        <IconButton
                                            edge="end"
                                            size="small"
                                            aria-label="Delete notification"
                                            onClick={() => remove(notification.notification_id)}
                                        >
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    }
                                    sx={{ bgcolor: notification.is_read ? undefined : "action.hover" }}
                                >
                                    <ListItemButton onClick={() => openNotification(notification)}>
                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                            <Icon fontSize="small" color={severity} />
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={notification.notification_message}
                                            secondary={formatRelativeTime(notification.notification_creation_utc_date_time)}
                                            slotProps={{
                                                primary: { sx: { fontWeight: notification.is_read ? 400 : 600 } },
                                                secondary: {
                                                    title: new Date(notification.notification_creation_utc_date_time).toLocaleString(),
                                                },
                                            }}
                                        />
                                    </ListItemButton>
                                </ListItem>
                            );
                        })}
                    </List>
                )}
            </Popover>

            <Snackbar
                open={incoming !== null}
                autoHideDuration={8000}
                onClose={(_, reason) => {
                    if (reason !== "clickaway") dismissIncoming();
                }}
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            >
                {incoming ? (
                    <Alert
                        severity={styleOf(incoming.notification_type).severity}
                        variant="filled"
                        onClose={dismissIncoming}
                        action={
                            notificationLink(incoming) ? (
                                <Button color="inherit" size="small" onClick={() => openNotification(incoming)}>
                                    View
                                </Button>
                            ) : undefined
                        }
                    >
                        {incoming.notification_message}
                    </Alert>
                ) : undefined}
            </Snackbar>
        </>
    );
}
