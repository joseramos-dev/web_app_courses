import { api } from "../../shared/api/api";
import type {
  INotification,
  INotificationPaginated,
  IUnreadCount,
} from "../../shared/interfaces/INotification";

export const API_listNotifications = async (
  limit = 10,
  offset = 0,
): Promise<INotificationPaginated> => {
  const { data } = await api.get<INotificationPaginated>("/notifications", {
    params: { limit, offset },
  });
  return data;
};

export const API_getUnreadCount = async (): Promise<number> => {
  const { data } = await api.get<IUnreadCount>("/notifications/unread_count");
  return data.count;
};

export const API_markNotificationRead = async (
  id: number,
): Promise<INotification> => {
  const { data } = await api.patch<INotification>(
    `/notifications/${id}/read`,
  );
  return data;
};

export const API_markAllNotificationsRead = async (): Promise<void> => {
  await api.post("/notifications/read-all");
};
