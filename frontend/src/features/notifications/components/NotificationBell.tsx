import { Bell } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  API_listNotifications,
  API_markAllNotificationsRead,
  API_markNotificationRead,
} from "../api";
import type { INotification } from "../../../shared/interfaces/INotification";
import { useUnreadNotifications } from "../../../shared/hooks/useUnreadNotifications";
import { useClickOutside } from "../../../shared/hooks/useClickOutside";

function formatRelativeTime(iso: string, locale: string): string {
  const date = new Date(iso);
  const diffMs = date.getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60_000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHours = Math.round(diffMin / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, "day");
}

type NotificationBellProps = {
  variant?: "desktop" | "mobile";
};

export function NotificationBell({ variant = "desktop" }: NotificationBellProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { count, refresh } = useUnreadNotifications();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<INotification[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      await refresh();
      const data = await API_listNotifications(10, 0);
      setItems(data.notifications);
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      loadList();
    }
  };

  useClickOutside(containerRef, () => setOpen(false), open);

  const handleItemClick = async (notification: INotification) => {
    if (!notification.is_read) {
      await API_markNotificationRead(notification.id);
    }
    setOpen(false);
    await refresh();
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAll = async () => {
    await API_markAllNotificationsRead();
    await loadList();
  };

  const buttonClass =
    variant === "mobile"
      ? "relative rounded-full p-2 text-header-foreground transition-colors hover:bg-white/10"
      : "relative rounded-full p-2 text-header-foreground/90 transition hover:bg-white/10 hover:text-header-foreground";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={buttonClass}
        aria-label={t("notifications.unreadAria", { count })}
        aria-expanded={open}
      >
        <Bell className="size-5" />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={`absolute z-50 mt-2 w-80 rounded-lg border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-slate-800 ${
            variant === "mobile" ? "right-0" : "right-0"
          }`}
        >
          <div className="border-b border-black/5 px-4 py-3 dark:border-white/10">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t("notifications.title")}
            </h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {t("common.loading")}
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {t("notifications.empty")}
              </p>
            ) : (
              <ul className="divide-y divide-black/5 dark:divide-white/10">
                {items.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(notification)}
                      className={`block w-full px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-700/60 ${
                        notification.is_read ? "opacity-75" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!notification.is_read ? (
                          <span
                            className="mt-1.5 size-2 shrink-0 rounded-full bg-emerald-500"
                            aria-hidden
                          />
                        ) : (
                          <span className="mt-1.5 size-2 shrink-0" aria-hidden />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                            {notification.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                            {notification.body}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                            {formatRelativeTime(
                              notification.created_at,
                              i18n.language,
                            )}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {items.length > 0 ? (
            <div className="border-t border-black/5 p-2 dark:border-white/10">
              <button
                type="button"
                onClick={handleMarkAll}
                className="w-full rounded-md px-3 py-2 text-center text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              >
                {t("notifications.markAllRead")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
