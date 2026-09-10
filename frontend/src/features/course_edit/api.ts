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
  ICourseCurriculum,
  ITopic,
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
  intro_video_url?: string | null;
  is_public?: boolean;
  lesson_access_mode?: "open" | "progressive";
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
  if (draft.intro_video_url != null) payload.intro_video_url = draft.intro_video_url;
  if (draft.is_public != null) payload.is_public = draft.is_public;
  if (draft.lesson_access_mode != null) payload.lesson_access_mode = draft.lesson_access_mode;
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
  // The endpoint is paginated; the picker wants every instructor at once.
  const { data } = await api.get<{ users: IUser[] }>(`/users/`, {
    params: { role: "instructor", limit: 200 },
  });
  return data.users;
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

export interface ICourseEditStats {
  enrollments_count: number;
  topics_count: number;
  lessons_count: number;
  duration_seconds: number | null;
}

export async function API_getCourseEditStats(courseId: number) {
  const { data } = await api.get<ICourseEditStats>(`/courses/${courseId}/edit-stats`);
  return data;
}

export async function API_getCourseCurriculum(courseId: number) {
  const { data } = await api.get<ICourseCurriculum>(`/courses/${courseId}/curriculum`);
  return data;
}

export async function API_createTopic(courseId: number, name: string) {
  const { data } = await api.post<ITopic>(`/courses/${courseId}/topics`, { name });
  return data;
}

export async function API_updateTopic(topicId: number, payload: { name?: string; position?: number }) {
  const { data } = await api.patch<ITopic>(`/courses/topics/${topicId}`, payload);
  return data;
}

export async function API_deleteTopic(topicId: number) {
  const { data } = await api.delete<{ detail: string }>(`/courses/topics/${topicId}`);
  return data;
}

export async function API_reorderTopics(courseId: number, orderedTopicIds: number[]) {
  const { data } = await api.post<ITopic[]>(`/courses/${courseId}/topics/reorder`, {
    ordered_topic_ids: orderedTopicIds,
  });
  return data;
}

export async function API_reorderLessonsInTopic(topicId: number, orderedLessonIds: number[]) {
  const { data } = await api.post<ILesson[]>(`/courses/topics/${topicId}/lessons/reorder`, {
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

