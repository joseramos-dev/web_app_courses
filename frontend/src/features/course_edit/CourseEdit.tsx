import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useNavigate,
  useNavigationType,
  useParams,
  useLocation,
  Navigate,
} from "react-router-dom";
import toast from "react-hot-toast";
import type { ICourses } from "../../shared/interfaces/ICourses";
import type { IUser } from "../../shared/interfaces/IUser";
import { useAuth } from "../../shared/povider/AuthContext";
import { API_getCourseDetailById } from "../course_detail/api";
import { CourseEditForm } from "./components/CourseEditForm";
import { LessonsEditor } from "./components/LessonsEditor";
import type { ILesson, ILessonCreate } from "./lessonTypes";
import {
  API_createLesson,
  API_deleteCourse,
  API_deleteLesson,
  API_getLessonsByCourse,
  API_reorderLessons,
  API_updateCourse,
  API_updateLesson,
  buildCourseCreatePayload,
  API_createCourse,
} from "./api";

function emptyDraft(user: IUser): ICourses {
  return {
    id: 0,
    title: "",
    url: "",
    site: "Academy",
    category: "Non defined",
    language: "Spanish",
    course_type: "Course",
    subcategory: null,
    intro: null,
    rating: null,
    ratings_count: 0,
    duration_seconds: null,
    difficulty: "intermediate",
    created_at: "",
    updated_at: "",
    instructor_id: user.role === "instructor" && user.id != null ? user.id : null,
    instructor_name: user.role === "instructor" ? user.name : null,
    lessons_count: 0,
  };
}

export function CourseEdit() {
  const { t } = useTranslation();
  const { courseId: courseIdParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();

  const navigationType = useNavigationType();
  const cameFromInApp = navigationType === "PUSH";

  // Static route `path="/course/new"` does not bind `:courseId`; useParams() would miss it.
  const pathNorm = location.pathname.replace(/\/+$/, "") || "/";
  const courseId = pathNorm === "/course/new" ? "new" : courseIdParam;
  const isCreateMode = courseId === "new";
  const mayAccessCreate =
    user && (user.role === "admin" || user.role === "instructor");

  const [course, setCourse] = useState<ICourses | null>(null);
  const [draft, setDraft] = useState<ICourses | null>(null);
  const [lessons, setLessons] = useState<ILesson[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isCreateMode || !mayAccessCreate || !user) return;
    const initial = emptyDraft(user);
    setCourse(initial);
    setDraft(initial);
    setLessons([]);
    setError(null);
    setIsLoading(false);
  }, [isCreateMode, mayAccessCreate, user, courseId]);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const detail = await API_getCourseDetailById(Number(courseId));
        setCourse(detail);
        setDraft(detail);
      } catch (e) {
        console.error("Error fetching course detail: ", e);
        setError(t("courseEdit.loadError"));
        setCourse(null);
        setDraft(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId && courseId !== "new") fetchCourse();
  }, [courseId]);

  useEffect(() => {
    const fetchLessons = async () => {
      if (!courseId || courseId === "new") return;
      try {
        const data = await API_getLessonsByCourse(Number(courseId));
        setLessons(data);
      } catch (e) {
        console.warn("Could not load lessons:", e);
        setLessons([]);
      }
    };
    fetchLessons();
  }, [courseId]);

  const canEdit = useMemo(() => {
    if (!user) return false;
    if (isCreateMode) return mayAccessCreate === true;
    if (!course) return false;
    if (user.role === "admin") return true;
    if (
      user.role === "instructor" &&
      course.instructor_id !== null &&
      user.id === course.instructor_id
    )
      return true;
    return false;
  }, [course, user, isCreateMode, mayAccessCreate]);

  const leaveEditor = ({ to }: { to?: string } = {}) => {
    const target =
      to ??
      (courseId && courseId !== "new" ? `/course/${courseId}` : "/courses");
    if (cameFromInApp) {
      navigate(-1);
    } else {
      navigate(target, { replace: true });
    }
  };

  if (isAuthLoading) return null;
  if (!user) return <Navigate to="/courses" replace />;

  if (isCreateMode && !mayAccessCreate) {
    return <Navigate to="/courses" replace />;
  }

  const primaryAction = async () => {
    if (!draft) return;
    if (isCreateMode) {
      if (!mayAccessCreate) return;
      if (!draft.title.trim()) {
        toast.error(t("courseEdit.toast.titleRequired"));
        return;
      }
      try {
        const created = await API_createCourse(
          buildCourseCreatePayload(draft, user.role === "admin"),
        );
        toast.success(t("courseEdit.toast.courseCreated"));
        navigate(`/course/${created.id}/edit`, { replace: true });
      } catch (e) {
        console.error(e);
        toast.error(t("courseEdit.toast.createFailed"));
      }
      return;
    }
    if (!canEdit || !courseId || courseId === "new") return;
    try {
      const updated = await API_updateCourse(Number(courseId), draft);
      setCourse(updated);
      setDraft(updated);
      toast.success(t("courseEdit.toast.courseSaved"));
      leaveEditor({ to: `/course/${updated.id}` });
    } catch (e) {
      console.error(e);
      toast.error(t("courseEdit.toast.saveFailed"));
    }
  };

  const handleDeleteCourse = async () => {
    if (isCreateMode || !canEdit || !courseId || courseId === "new" || !course) return;
    const confirmed = window.confirm(
      t("courseEdit.deleteCourseConfirm", { title: course.title }),
    );
    if (!confirmed) return;
    try {
      setIsDeleting(true);
      const { detail } = await API_deleteCourse(Number(courseId));
      toast.success(detail);
      navigate("/courses", { replace: true });
    } catch (e) {
      console.error(e);
      toast.error(t("courseEdit.toast.deleteFailed"));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isCreateMode && isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 text-sm text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {t("courseEdit.loadingCourse")}
        </div>
      </div>
    );
  }

  if (!isCreateMode && error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!isCreateMode && !course) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 text-sm text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {t("courseEdit.noCourseFound")}
        </div>
      </div>
    );
  }

  if (!isCreateMode && !canEdit) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {t("courseEdit.noPermission")}
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 text-sm text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {t("courseEdit.loadingEditor")}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => leaveEditor()}
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:shadow-md dark:hover:bg-slate-700"
        >
          {t("courseEdit.back")}
        </button>

        <div className="flex items-center gap-2">
          {!isCreateMode && canEdit ? (
            <button
              type="button"
              onClick={() => void handleDeleteCourse()}
              disabled={isDeleting}
              className="inline-flex items-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {isDeleting ? t("courseEdit.deleting") : t("courseEdit.deleteCourse")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={primaryAction}
            disabled={!canEdit || (isCreateMode && !draft.title.trim())}
            className="inline-flex items-center rounded-lg border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-500 dark:border-uned-primary dark:bg-uned-primary dark:text-slate-900 dark:shadow-md dark:hover:bg-uned-accent disabled:dark:border-slate-600 disabled:dark:bg-slate-700 disabled:dark:text-slate-500"
          >
            {isCreateMode ? t("courseEdit.createCourse") : t("courseEdit.save")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CourseEditForm
            value={draft}
            onChange={setDraft}
            isAdmin={user.role === "admin"}
            disabled={!canEdit}
          />
        </div>
        {isCreateMode ? null : (
          <div className="lg:col-span-2">
            <LessonsEditor
              courseId={Number(courseId)}
              lessons={lessons}
              disabled={!canEdit}
              onCreate={async (payload: ILessonCreate) => {
                if (!courseId || courseId === "new") {
                  throw new Error("Cannot create a lesson without a course id");
                }
                const created = await API_createLesson(Number(courseId), payload);
                setLessons((cur) => [...cur, created]);
                toast.success(t("courseEdit.toast.lessonCreated"));
                return created;
              }}
              onUpdate={async (lessonId: number, payload: ILessonCreate) => {
                const updated = await API_updateLesson(lessonId, payload);
                setLessons((cur) => cur.map((l) => (l.id === lessonId ? updated : l)));
                toast.success(t("courseEdit.toast.lessonUpdated"));
              }}
              onDelete={async (lessonId: number) => {
                await API_deleteLesson(lessonId);
                setLessons((cur) => cur.filter((l) => l.id !== lessonId));
                toast.success(t("courseEdit.toast.lessonDeleted"));
              }}
              onReorder={async (orderedLessonIds: number[]) => {
                if (!courseId || courseId === "new") return;
                const next = await API_reorderLessons(Number(courseId), orderedLessonIds);
                setLessons(next);
                toast.success(t("courseEdit.toast.lessonsReordered"));
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
