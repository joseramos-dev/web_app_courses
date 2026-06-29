import { api, API_BASE_URL } from "../../shared/api/api";
import type { ICourses } from "../../shared/interfaces/ICourses";
import type { IUser } from "../../shared/interfaces/IUser";
import type {
  CategoryTypes,
  CourseTypeTypes,
  DifficultyTypes,
  LanguageTypes,
  SiteTypes,
} from "../../shared/types/CourseTypes";
import type {
  ILesson,
  ILessonCreate,
  ILessonFile,
  IQuestionAdmin,
  IQuestionCreate,
} from "./lessonTypes";

export type ICourseUpdate = Omit<ICourses, "id" | "created_at" | "updated_at">;

export type ICourseCreatePayload = {
  title: string;
  url?: string;
  site: SiteTypes;
  category: CategoryTypes;
  language: LanguageTypes;
  course_type: CourseTypeTypes;
  difficulty?: DifficultyTypes;
  subcategory?: string | null;
  intro?: string | null;
  duration_seconds?: number | null;
  instructor_id?: number | null;
};

export function buildCourseCreatePayload(draft: ICourses, isAdmin: boolean): ICourseCreatePayload {
  const payload: ICourseCreatePayload = {
    title: draft.title.trim(),
    site: draft.site,
    category: draft.category,
    language: draft.language,
    course_type: draft.course_type,
    difficulty: draft.difficulty,
  };
  const url = draft.url.trim();
  if (url) payload.url = url;
  if (draft.subcategory != null) payload.subcategory = draft.subcategory;
  if (draft.intro != null) payload.intro = draft.intro;
  if (draft.duration_seconds != null) payload.duration_seconds = draft.duration_seconds;
  if (isAdmin) payload.instructor_id = draft.instructor_id;
  return payload;
}

export async function API_createCourse(payload: ICourseCreatePayload) {
  const { data } = await api.post<ICourses>("/courses/create", payload);
  return data;
}

export async function API_updateCourse(courseId: number, payload: Partial<ICourseUpdate>) {
  const { data } = await api.put<ICourses>(`/courses/${courseId}`, payload);
  return data;
}

export async function API_deleteCourse(courseId: number) {
  const { data } = await api.delete<{ detail: string }>(`/courses/${courseId}`);
  return data;
}

// Used by the admin-only instructor picker inside CourseEditForm. Returns
// only users with role=instructor so the dropdown stays small and focused.
export async function API_getInstructors() {
  const { data } = await api.get<IUser[]>(`/users/`, {
    params: { role: "instructor" },
  });
  return data;
}

export async function API_getLessonsByCourse(courseId: number) {
  const { data } = await api.get<ILesson[]>(`/courses/${courseId}/lessons`);
  return data;
}

export async function API_createLesson(courseId: number, payload: ILessonCreate) {
  const { data } = await api.post<ILesson>(`/lessons/${courseId}`, payload);
  return data;
}

export async function API_updateLesson(lessonId: number, payload: Partial<ILessonCreate>) {
  const { data } = await api.patch<ILesson>(`/lessons/${lessonId}`, payload);
  return data;
}

export async function API_deleteLesson(lessonId: number) {
  const { data } = await api.delete<{ detail: string }>(`/lessons/${lessonId}`);
  return data;
}

export async function API_reorderLessons(courseId: number, orderedLessonIds: number[]) {
  const { data } = await api.post<ILesson[]>(`/courses/${courseId}/lessons/reorder`, {
    ordered_lesson_ids: orderedLessonIds,
  });
  return data;
}

// ---------- Questions ----------

export async function API_getLessonQuestionsAdmin(lessonId: number) {
  const { data } = await api.get<IQuestionAdmin[]>(
    `/lessons/${lessonId}/questions/admin`,
  );
  return data;
}

export async function API_createQuestion(
  lessonId: number,
  payload: IQuestionCreate,
) {
  const { data } = await api.post<IQuestionAdmin>(
    `/lessons/${lessonId}/questions`,
    payload,
  );
  return data;
}

export async function API_updateQuestion(
  lessonId: number,
  questionId: number,
  payload: Partial<IQuestionCreate>,
) {
  const { data } = await api.put<IQuestionAdmin>(
    `/lessons/${lessonId}/questions/${questionId}`,
    payload,
  );
  return data;
}

export async function API_deleteQuestion(lessonId: number, questionId: number) {
  const { data } = await api.delete<{ detail: string }>(
    `/lessons/${lessonId}/questions/${questionId}`,
  );
  return data;
}

// ---------- Lesson file attachments ----------

export async function API_getLessonFiles(lessonId: number) {
  const { data } = await api.get<ILessonFile[]>(`/lessons/${lessonId}/files`);
  return data;
}

export async function API_uploadLessonFile(lessonId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<ILessonFile>(
    `/lessons/${lessonId}/files`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function API_uploadLessonSubmissionFile(lessonId: number, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await api.post<ILessonFile>(
    `/lessons/${lessonId}/submission-files`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return data;
}

export async function API_deleteLessonFile(fileId: number) {
  const { data } = await api.delete<{ detail: string }>(
    `/lessons/files/${fileId}`,
  );
  return data;
}

export function getLessonFileDownloadUrl(fileId: number): string {
  const base = API_BASE_URL.replace(/\/?$/, "/");
  return `${base}lessons/files/${fileId}/download`;
}

