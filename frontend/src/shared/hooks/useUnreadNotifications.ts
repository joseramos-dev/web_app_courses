import { useCallback, useEffect, useState } from "react";
import { API_getUnreadCount } from "../../features/notifications/api";
import { useAuth } from "../provider/AuthContext";

const POLL_MS = 30_000;

export function useUnreadNotifications() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }
    try {
      const n = await API_getUnreadCount();
      setCount(n);
    } catch {
      // Ignore transient polling failures.
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    refresh();
    const id = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(id);
  }, [user, refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  return { count, refresh };
}
