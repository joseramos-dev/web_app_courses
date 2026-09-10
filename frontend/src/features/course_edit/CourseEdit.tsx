import { useEffect, useMemo, useState } from "react";
import {
  useNavigate,
  useNavigationType,
  useParams,
  useLocation,
  Navigate,
} from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { ICourses } from "../../shared/interfaces/ICourses";
import type { IUser } from "../../shared/interfaces/IUser";
import { useAuth } from "../../shared/provider/AuthContext";
import { API_getCourseDetailById } from "../course_detail/api";
import { CourseEditForm } from "./components/CourseEditForm";
import { CourseEditSidebar } from "./components/CourseEditSidebar";
import { TopicsEditor } from "./components/TopicsEditor";
import type { ICourseCurriculum, ILessonCreate } from "./lessonTypes";
import {
  API_createLesson,
  API_createTopic,
  API_deleteCourse,
  API_deleteLesson,
  API_deleteTopic,
  API_getCourseCurriculum,
  API_getCourseEditStats,
  API_reorderLessonsInTopic,
  API_reorderTopics,
  API_updateCourse,
  API_updateTopic,
  buildCourseCreatePayload,
  API_createCourse,
  type ICourseEditStats,
} from "./api";
import { runWithToastSaving } from "../../shared/utils/runWithToastSaving";
import { useAsyncData } from "../../shared/hooks/useAsyncData";

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
    intro_video_url: null,
    is_public: true,
    lesson_access_mode: "open",
    rating: null,
    ratings_count: 0,
    // Read-only: filled in by the API as the sum of the lesson durations.
    duration_seconds: null,
    difficulty: "intermediate",
    created_at: "",
    updated_at: "",
    instructor_id: user.role === "instructor" && user.id != null ? user.id : null,
    instructor_name: user.role === "instructor" ? user.name : null,
    lessons_count: 0,
    topics_count: 0,
    instructor_courses_count: 0,
  };
}

async function reloadCurriculum(courseId: number) {
  return API_getCourseCurriculum(courseId);
}

export function CourseEdit() {
  const { t } = useTranslation();
  const { courseId: courseIdParam } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigationType = useNavigationType();
  const cameFromInApp = navigationType === "PUSH";

  const pathNorm = location.pathname.replace(/\/+$/, "") || "/";
  const courseId = pathNorm === "/course/new" ? "new" : courseIdParam;
  const isCreateMode = courseId === "new";
  const mayAccessCreate =
    user && (user.role === "admin" || user.role === "instructor");

  const [draft, setDraft] = useState<ICourses | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data,
    loading: isLoading,
    error,
    setData,
  } = useAsyncData<{
    course: ICourses;
    curriculum: ICourseCurriculum | null;
    stats: ICourseEditStats | null;
  } | null>(
    () => {
      if (isCreateMode) {
        return Promise.resolve(
          user ? { course: emptyDraft(user), curriculum: null, stats: null } : null,
        );
      }
      if (!courseId || courseId === "new") return Promise.resolve(null);
      const id = Number(courseId);
      return Promise.all([
        API_getCourseDetailById(id),
        API_getCourseCurriculum(id),
        API_getCourseEditStats(id),
      ]).then(([course, curriculum, stats]) => ({ course, curriculum, stats }));
    },
    [isCreateMode, mayAccessCreate, user, courseId, t],
    { errorMessage: t("courseEdit.loadError") },
  );
  const course = data?.course ?? null;
  const curriculum = data?.curriculum ?? null;
  const stats = data?.stats ?? null;

  // Seeds/resyncs the editable draft whenever a fresh course object loads
  // (create mode's synthetic empty course, or a real fetch).
  useEffect(() => {
    if (data?.course) setDraft(data.course);
  }, [data]);

  const refreshCurriculum = async (id: number) => {
    const curriculumData = await reloadCurriculum(id);
    setData((prev) => (prev ? { ...prev, curriculum: curriculumData } : prev));
  };

  const canEdit = useMemo(() => {
    if (!user) return false;
    if (isCreateMode) return mayAccessCreate === true;
    if (!course) return false;
    if (user.role === "admin") return true;
    return (
      user.role === "instructor" &&
      course.instructor_id !== null &&
      user.id === course.instructor_id
    );
  }, [course, user, isCreateMode, mayAccessCreate]);

  const leaveEditor = ({ to }: { to?: string } = {}) => {
    const target =
      to ?? (courseId && courseId !== "new" ? `/course/${courseId}` : "/courses");
    if (cameFromInApp) navigate(-1);
    else navigate(target, { replace: true });
  };

  if (isAuthLoading) return null;
  if (!user) return <Navigate to="/courses" replace />;
  if (isCreateMode && !mayAccessCreate) return <Navigate to="/courses" replace />;

  const primaryAction = async () => {
    if (!draft) return;
    if (isCreateMode) {
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
      setData((prev) => (prev ? { ...prev, course: updated } : prev));
      setDraft(updated);
      toast.success(t("courseEdit.toast.courseSaved"));
      navigate(`/course/${courseId}`, { replace: true });
    } catch (e) {
      console.error(e);
      toast.error(t("courseEdit.toast.saveFailed"));
    }
  };

  const handleDeleteCourse = async () => {
    if (isCreateMode || !canEdit || !courseId || courseId === "new" || !course) return;
    if (!window.confirm(t("courseEdit.deleteCourseConfirm", { title: course.title }))) return;
    const result = await runWithToastSaving(
      setIsDeleting,
      () => API_deleteCourse(Number(courseId)),
      t("courseEdit.toast.deleteFailed"),
    );
    if (result) {
      toast.success(result.detail);
      navigate("/courses", { replace: true });
    }
  };

  if (!isCreateMode && isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-gray-600 dark:text-slate-300">
        {t("courseEdit.loadingCourse")}
      </div>
    );
  }

  if (!isCreateMode && error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-red-700">{error}</div>
    );
  }

  if (!isCreateMode && !course) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-gray-600">
        {t("courseEdit.noCourseFound")}
      </div>
    );
  }

  if (!isCreateMode && !canEdit) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-red-700">
        {t("courseEdit.noPermission")}
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-gray-600">
        {t("courseEdit.loadingEditor")}
      </div>
    );
  }

  const numericCourseId = Number(courseId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => leaveEditor()}
          className="rounded-lg border px-3 py-2 text-sm font-semibold"
        >
          {t("courseEdit.back")}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CourseEditForm
            value={draft}
            onChange={setDraft}
            isAdmin={user.role === "admin"}
            disabled={!canEdit}
          />
        </div>

        <CourseEditSidebar
          isCreateMode={isCreateMode}
          draft={draft}
          course={course}
          stats={stats}
          canEdit={canEdit}
          isDeleting={isDeleting}
          onChange={setDraft}
          onSave={primaryAction}
          onDelete={handleDeleteCourse}
        />
      </div>

      {!isCreateMode && curriculum ? (
        <div className="mt-6">
          <TopicsEditor
            courseId={numericCourseId}
            curriculum={curriculum}
            disabled={!canEdit}
            onCurriculumChange={(next) =>
              setData((prev) => (prev ? { ...prev, curriculum: next } : prev))
            }
            onCreateLesson={async (payload: ILessonCreate) => {
              const created = await API_createLesson(numericCourseId, payload);
              await refreshCurriculum(numericCourseId);
              return created;
            }}
            onDeleteLesson={async (lessonId) => {
              await API_deleteLesson(lessonId);
              await refreshCurriculum(numericCourseId);
            }}
            onCreateTopic={async (name) => {
              await API_createTopic(numericCourseId, name);
              await refreshCurriculum(numericCourseId);
            }}
            onUpdateTopic={async (topicId, name) => {
              await API_updateTopic(topicId, { name });
              await refreshCurriculum(numericCourseId);
            }}
            onDeleteTopic={async (topicId) => {
              await API_deleteTopic(topicId);
              await refreshCurriculum(numericCourseId);
            }}
            onReorderTopics={async (ids) => {
              await API_reorderTopics(numericCourseId, ids);
              await refreshCurriculum(numericCourseId);
            }}
            onReorderLessons={async (topicId, ids) => {
              await API_reorderLessonsInTopic(topicId, ids);
              await refreshCurriculum(numericCourseId);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
