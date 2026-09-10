import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { ILesson, ILessonCreate, LessonType } from "../lessonTypes";
import { API_updateLesson } from "../api";
import { runWithToastSaving } from "../../../shared/utils/runWithToastSaving";

/** Minutes typed by the author -> seconds stored by the API. Blank or invalid
 *  input means "not declared", which counts as 0 in the totals. */
function minutesToSeconds(minutes: string): number | null {
  const raw = minutes.trim();
  if (raw === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(value * 60);
}

export interface UseLessonFormResult {
  lessonTitle: string;
  setLessonTitle: Dispatch<SetStateAction<string>>;
  lessonType: LessonType;
  setLessonType: Dispatch<SetStateAction<LessonType>>;
  body: string;
  setBody: Dispatch<SetStateAction<string>>;
  videoUrl: string;
  setVideoUrl: Dispatch<SetStateAction<string>>;
  durationMinutes: string;
  setDurationMinutes: Dispatch<SetStateAction<string>>;
  maxScore: string;
  setMaxScore: Dispatch<SetStateAction<string>>;
  passingScore: number;
  setPassingScore: Dispatch<SetStateAction<number>>;
  allowsFileSubmission: boolean;
  setAllowsFileSubmission: Dispatch<SetStateAction<boolean>>;
  canSubmit: boolean;
  isQuiz: boolean;
  isAssignment: boolean;
  isSaving: boolean;
  handleSave: () => Promise<void>;
}

/**
 * Owns the lesson-metadata form (title, type, position-derived fields, body,
 * video url, duration, scoring) plus its save handler. `lesson` is the
 * already-fetched record (or `null` while it's loading) -- the hook seeds
 * its fields whenever a new lesson object arrives.
 */
export function useLessonForm(lesson: ILesson | null): UseLessonFormResult {
  const { t } = useTranslation();
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonType, setLessonType] = useState<LessonType>("text");
  const [body, setBody] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [maxScore, setMaxScore] = useState("100");
  const [passingScore, setPassingScore] = useState(70);
  const [allowsFileSubmission, setAllowsFileSubmission] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!lesson) return;
    setLessonTitle(lesson.title);
    setLessonType(lesson.lesson_type);
    setBody(lesson.body ?? "");
    setVideoUrl(lesson.video_url ?? "");
    setDurationMinutes(
      lesson.duration_seconds != null
        ? String(Math.round(lesson.duration_seconds / 60))
        : "",
    );
    setMaxScore(String(lesson.max_score ?? 100));
    setPassingScore(lesson.passing_score ?? 70);
    setAllowsFileSubmission(lesson.allows_file_submission ?? false);
  }, [lesson]);

  const canSubmit = useMemo(
    () => lessonTitle.trim().length > 0,
    [lessonTitle],
  );

  const isQuiz = lessonType === "test" || lessonType === "multiple_selection";
  const isAssignment = lessonType === "assignment";

  const buildPayload = (): ILessonCreate => ({
    title: lessonTitle.trim(),
    lesson_type: lessonType,
    topic_id: lesson!.topic_id,
    position: lesson!.position,
    body: lessonType === "text" || lessonType === "assignment" ? body : null,
    video_url: lessonType === "video" ? videoUrl.trim() || null : null,
    duration_seconds: minutesToSeconds(durationMinutes),
    max_score:
      isAssignment || isQuiz ? Number(maxScore) || 100 : null,
    passing_score:
      isAssignment || isQuiz ? passingScore : null,
    allows_file_submission: isAssignment ? allowsFileSubmission : false,
  });

  const handleSave = async () => {
    if (!lesson || !canSubmit) return;
    const updated = await runWithToastSaving(
      setIsSaving,
      () => API_updateLesson(lesson.id, buildPayload()),
      t("courseEdit.toast.saveFailed"),
    );
    if (updated) {
      toast.success(t("courseEdit.toast.lessonUpdated"));
      navigate(`/course/${courseId}/edit`);
    }
  };

  return {
    lessonTitle,
    setLessonTitle,
    lessonType,
    setLessonType,
    body,
    setBody,
    videoUrl,
    setVideoUrl,
    durationMinutes,
    setDurationMinutes,
    maxScore,
    setMaxScore,
    passingScore,
    setPassingScore,
    allowsFileSubmission,
    setAllowsFileSubmission,
    canSubmit,
    isQuiz,
    isAssignment,
    isSaving,
    handleSave,
  };
}
