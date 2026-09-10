"""Tests de API para notificaciones in-app."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from modules.notifications.model import NotificationType
from modules.notifications.service import create_notification

from conftest import auth_headers, make_user


def test_list_notifications_only_for_current_user(client, db):
    user_a = make_user(db, name="student_a")
    user_b = make_user(db, name="student_b")

    create_notification(
        db,
        user_id=user_a.id,
        type=NotificationType.GRADE,
        title="For A",
        body="Body A",
        link="/course/1",
    )
    create_notification(
        db,
        user_id=user_b.id,
        type=NotificationType.GRADE,
        title="For B",
        body="Body B",
        link="/course/2",
    )
    db.commit()

    resp = client.get("/notifications", headers=auth_headers(client, user_a.name, "secret123"))
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["notifications"][0]["title"] == "For A"


def test_unread_count_and_mark_read(client, db):
    user = make_user(db, name="notif_user")
    create_notification(
        db,
        user_id=user.id,
        type=NotificationType.NEW_LESSON,
        title="Unread",
        body="Pending",
    )
    db.commit()

    headers = auth_headers(client, user.name, "secret123")
    count_resp = client.get("/notifications/unread_count", headers=headers)
    assert count_resp.status_code == 200
    assert count_resp.json()["count"] == 1

    list_resp = client.get("/notifications", headers=headers)
    notification_id = list_resp.json()["notifications"][0]["id"]

    read_resp = client.patch(
        f"/notifications/{notification_id}/read",
        headers=headers,
    )
    assert read_resp.status_code == 200
    assert read_resp.json()["is_read"] is True

    count_resp = client.get("/notifications/unread_count", headers=headers)
    assert count_resp.json()["count"] == 0


def test_read_all_notifications(client, db):
    user = make_user(db, name="read_all_user")
    for i in range(3):
        create_notification(
            db,
            user_id=user.id,
            type=NotificationType.SUBMISSION,
            title=f"N{i}",
            body=f"Body {i}",
        )
    db.commit()

    headers = auth_headers(client, user.name, "secret123")
    assert client.get("/notifications/unread_count", headers=headers).json()["count"] == 3

    read_all = client.post("/notifications/read-all", headers=headers)
    assert read_all.status_code == 204

    assert client.get("/notifications/unread_count", headers=headers).json()["count"] == 0


def test_cannot_mark_other_users_notification(client, db):
    owner = make_user(db, name="owner")
    other = make_user(db, name="other")
    row = create_notification(
        db,
        user_id=owner.id,
        type=NotificationType.GRADE,
        title="Private",
        body="Only owner",
    )
    db.commit()

    resp = client.patch(
        f"/notifications/{row.id}/read",
        headers=auth_headers(client, other.name, "secret123"),
    )
    assert resp.status_code == 404


def test_notification_types_use_wire_values_in_api(client, db):
    user = make_user(db, name="wire_values_user")
    for ntype in NotificationType:
        create_notification(
            db,
            user_id=user.id,
            type=ntype,
            title=f"Title {ntype.value}",
            body="Body",
        )
    db.commit()

    headers = auth_headers(client, user.name, "secret123")
    resp = client.get("/notifications", headers=headers)
    assert resp.status_code == 200
    types = {item["type"] for item in resp.json()["notifications"]}
    assert types == {"submission", "grade", "new_lesson", "lesson_removed", "course_visibility"}


def test_create_lesson_notifies_enrolled_student(client, db):
    from modules.users.model import UserRole
    from modules.topics.model import TopicModel

    from conftest import make_course, make_enrollment

    instructor = make_user(db, name="lesson_instr", role=UserRole.INSTRUCTOR)
    student = make_user(db, name="lesson_stud")
    course = make_course(db, title="Notify Course", instructor_id=instructor.id)
    make_enrollment(db, student, course)
    topic_id = (
        db.query(TopicModel).filter(TopicModel.course_id == course.id).first().id
    )

    resp = client.post(
        f"/lessons/{course.id}",
        json={
            "title": "Extra lesson",
            "lesson_type": "text",
            "topic_id": topic_id,
            "position": 1,
        },
        headers=auth_headers(client, instructor.name, "secret123"),
    )
    assert resp.status_code == 201

    notifs = client.get(
        "/notifications",
        headers=auth_headers(client, student.name, "secret123"),
    )
    assert notifs.status_code == 200
    assert notifs.json()["total"] == 1
    assert notifs.json()["notifications"][0]["type"] == "new_lesson"
    assert notifs.json()["notifications"][0]["link"] == f"/course/{course.id}/lesson/{resp.json()['id']}"


def test_delete_lesson_notifies_enrolled_student(client, db):
    from modules.users.model import UserRole

    from conftest import make_course, make_enrollment, make_lesson

    instructor = make_user(db, name="del_lesson_instr", role=UserRole.INSTRUCTOR)
    student = make_user(db, name="del_lesson_stud")
    course = make_course(db, title="Delete Notify Course", instructor_id=instructor.id)
    lesson = make_lesson(db, course, title="To remove", position=1)
    make_enrollment(db, student, course)

    resp = client.delete(
        f"/lessons/{lesson.id}",
        headers=auth_headers(client, instructor.name, "secret123"),
    )
    assert resp.status_code == 200

    notifs = client.get(
        "/notifications",
        headers=auth_headers(client, student.name, "secret123"),
    )
    assert notifs.status_code == 200
    assert notifs.json()["total"] == 1
    assert notifs.json()["notifications"][0]["type"] == "lesson_removed"
    assert notifs.json()["notifications"][0]["link"] == f"/course/{course.id}"
