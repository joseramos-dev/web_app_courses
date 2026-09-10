export type NotificationType = "submission" | "grade" | "new_lesson" | "lesson_removed" | "course_visibility";

export interface INotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
  is_read: boolean;
}

export interface INotificationPaginated {
  notifications: INotification[];
  total: number;
  limit: number;
  offset: number;
}

export interface IUnreadCount {
  count: number;
}