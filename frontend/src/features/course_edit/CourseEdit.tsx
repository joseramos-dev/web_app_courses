import { useEffect, useMemo, useState } from "react";
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
    created_at: "",
    updated_at: "",
    instructor_id: user.role === "instructor" && user.id != null ? user.id : null,
    instructor_name: user.role === "instructor" ? user.name : null,
    lessons_count: 0,
  };
}

export function CourseEdit() {
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
        setError("Could not load course.");
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
        toast.error("El título es obligatorio");
        return;
      }
      try {
        const created = await API_createCourse(
          buildCourseCreatePayload(draft, user.role === "admin"),
        );
        toast.success("Curso creado");
        navigate(`/course/${created.id}/edit`, { replace: true });
      } catch (e) {
        console.error(e);
        toast.error("No se pudo crear el curso");
      }
      return;
    }
    if (!canEdit || !courseId || courseId === "new") return;
    try {
      const updated = await API_updateCourse(Number(courseId), draft);
      setCourse(updated);
      setDraft(updated);
      toast.success("Course saved");
      leaveEditor({ to: `/course/${updated.id}` });
    } catch (e) {
      console.error(e);
      toast.error("Could not save course");
    }
  };

  if (!isCreateMode && isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 text-sm text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Loading course...
        </div>
      </div>
    );
  }

  if (!isCreateMode && error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </div>
      </div>
    );
  }

  if (!isCreateMode && !course) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 text-sm text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          No course found.
        </div>
      </div>
    );
  }

  if (!isCreateMode && !canEdit) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
          You don’t have permission to edit this course.
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="rounded-xl border border-gray-200 bg-surface-muted p-4 text-sm text-gray-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          Loading editor...
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => leaveEditor()}
          className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:shadow-md dark:hover:bg-slate-700"
        >
          Back
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={primaryAction}
            disabled={!canEdit || (isCreateMode && !draft.title.trim())}
            className="inline-flex items-center rounded-lg border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-500 dark:border-uned-primary dark:bg-uned-primary dark:text-slate-900 dark:shadow-md dark:hover:bg-uned-accent disabled:dark:border-slate-600 disabled:dark:bg-slate-700 disabled:dark:text-slate-500"
          >
            {isCreateMode ? "Crear curso" : "Save"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CourseEditForm
            value={draft}
            onChange={setDraft}
            isAdmin={user.role === "admin"}
            disabled={!canEdit}
          />
        </div>
        {isCreateMode ? null : (
          <LessonsEditor
            courseId={Number(courseId)}
            lessons={lessons}
            disabled={!canEdit}
            onUpdate={async (lessonId: number, payload: ILessonCreate) => {
              const updated = await API_updateLesson(lessonId, payload);
              setLessons((cur) => cur.map((l) => (l.id === lessonId ? updated : l)));
              toast.success("Lesson updated");
            }}
            onDelete={async (lessonId: number) => {
              await API_deleteLesson(lessonId);
              setLessons((cur) => cur.filter((l) => l.id !== lessonId));
              toast.success("Lesson deleted");
            }}
            onReorder={async (orderedLessonIds: number[]) => {
              if (!courseId || courseId === "new") return;
              const next = await API_reorderLessons(Number(courseId), orderedLessonIds);
              setLessons(next);
              toast.success("Lessons reordered");
            }}
          />
        )}
      </div>
    </div>
  );
}
