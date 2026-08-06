import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../shared/povider/AuthContext";
import type { ICourses } from "../../../shared/interfaces/ICourses";
import type {
  IEnrollmentDetail,
} from "../../../shared/interfaces/IEnrollment";
import type { ILesson } from "../../course_edit/lessonTypes";
import {
  API_completeEnrollmentWithoutLessons,
  API_enrollInCourse,
} from "../api";
import {
  DEFAULT_COURSE_RETURN,
  type CourseNavState,
} from "../../../shared/types/CourseNavState";

type ActionKind =
  | "enroll"
  | "continue"
  | "review"
  | "edit"
  | "none"
  | null;

function pickNextLesson(
  lessons: ILesson[],
  enrollment: IEnrollmentDetail | null,
): ILesson | null {
  if (lessons.length === 0) return null;
  const sorted = [...lessons].sort((a, b) => a.position - b.position);
  if (!enrollment) return sorted[0];
  const completedSet = new Set(
    enrollment.lesson_progress
      .filter((lp) => lp.status === "completed")
      .map((lp) => lp.lesson_id),
  );
  const next = sorted.find((l) => !completedSet.has(l.id));
  return next ?? sorted[0];
}

type Props = {
  course: ICourses | null;
  lessons: ILesson[];
  enrollment: IEnrollmentDetail | null;
  onEnrolled: () => void;
  lessonNavState?: CourseNavState;
};

export function DetailActionButton({
  course,
  lessons,
  enrollment,
  onEnrolled,
  lessonNavState = { returnTo: DEFAULT_COURSE_RETURN },
}: Props) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [isCompletingEmpty, setIsCompletingEmpty] = useState(false);

  const action = useMemo<ActionKind>(() => {
    if (!user) return "none";
    if (!course) return "none";
    if (user.role === "admin") return "edit";
    if (user.role === "instructor") {
      if (course.instructor_id === null) return null;
      if (user.id === course.instructor_id) return "edit";
      return null;
    }
    if (user.role === "student") {
      if (!enrollment) return "enroll";
      if (enrollment.status === "completed") return "review";
      return "continue";
    }
    return "none";
  }, [course, user, enrollment]);

  if (action === "none") {
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500"
      >
        {t("courseDetail.loginToEnroll")}
      </button>
    );
  }

  if (action === null) return null;

  const handleEnroll = async () => {
    if (!course) return;
    try {
      setIsEnrolling(true);
      await API_enrollInCourse(course.id);
      toast.success(t("courseDetail.toast.enrolled"));
      onEnrolled();
    } catch (e) {
      console.error(e);
      toast.error(t("courseDetail.toast.enrollFailed"));
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleContinue = async () => {
    if (!course) return;
    if (lessons.length === 0) {
      if (!enrollment) {
        toast(t("courseDetail.toast.noLessons"));
        return;
      }
      if (enrollment.status === "completed") {
        toast(t("courseDetail.toast.noLessonsToReview"));
        return;
      }
      try {
        setIsCompletingEmpty(true);
        await API_completeEnrollmentWithoutLessons(course.id);
        toast.success(t("courseDetail.toast.courseCompleted"));
        onEnrolled();
      } catch (e) {
        console.error(e);
        toast.error(t("courseDetail.toast.completeFailed"));
      } finally {
        setIsCompletingEmpty(false);
      }
      return;
    }
    const next = pickNextLesson(lessons, enrollment);
    if (!next) {
      toast(t("courseDetail.toast.noLessonsYet"));
      return;
    }
    navigate(`/course/${course.id}/lesson/${next.id}`, {
      state: lessonNavState,
    });
  };

  if (action === "edit") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(`/course/${course?.id}/students`)}
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          {t("courseDetail.viewStudents")}
        </button>
        <button
          type="button"
          onClick={() => navigate(`/course/${course?.id}/edit`)}
          className="inline-flex items-center rounded-lg border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 dark:border-uned-primary dark:bg-uned-primary dark:text-slate-900 dark:shadow-md dark:hover:bg-uned-accent"
        >
          {t("courseDetail.edit")}
        </button>
      </div>
    );
  }

  if (action === "enroll") {
    return (
      <button
        type="button"
        onClick={handleEnroll}
        disabled={isEnrolling}
        className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:bg-green-300"
      >
        {isEnrolling ? t("courseDetail.enrolling") : t("courseDetail.enroll")}
      </button>
    );
  }

  if (action === "continue") {
    const emptyCourse = lessons.length === 0;
    return (
      <button
        type="button"
        onClick={() => void handleContinue()}
        disabled={isCompletingEmpty}
        className="inline-flex items-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500 disabled:bg-green-300"
      >
        {isCompletingEmpty
          ? t("courseDetail.completing")
          : emptyCourse
            ? t("courseDetail.completeCourse")
            : t("courseDetail.continue")}
      </button>
    );
  }

  // action === "review"
  return (
    <button
      type="button"
      onClick={handleContinue}
      className="inline-flex items-center rounded-lg border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 dark:border-uned-primary dark:bg-uned-primary dark:text-slate-900 dark:shadow-md dark:hover:bg-uned-accent"
    >
      {t("courseDetail.review")}
    </button>
  );
}
