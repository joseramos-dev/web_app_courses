from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, computed_field

from modules.notifications.model import NotificationType


class NotificationSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: NotificationType
    title: str
    body: str
    link: Optional[str] = None
    read_at: Optional[datetime] = None
    created_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_read(self) -> bool:
        return self.read_at is not None


class NotificationPaginatedSchema(BaseModel):
    notifications: List[NotificationSchema]
    total: int
    limit: int
    offset: int


class UnreadCountSchema(BaseModel):
    count: int
