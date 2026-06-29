export type LessonType =
  | "text"
  | "video"
  | "test"
  | "multiple_selection"
  | "assignment";

export interface ILesson {
  id: number;
  course_id: number;
  title: string;
  lesson_type: LessonType;
  position: number;
  body?: string | null;
  video_url?: string | null;
  max_score?: number | null;
  passing_score?: number | null;
  allows_file_submission?: boolean;
  /** API field name from backend */
  create_at?: string;
  update_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ILessonCreate {
  title: string;
  lesson_type: LessonType;
  position: number;
  body?: string | null;
  video_url?: string | null;
  max_score?: number | null;
  passing_score?: number | null;
  allows_file_submission?: boolean;
}

export interface ILessonFile {
  id: number;
  lesson_id: number;
  original_filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: number;
  uploaded_at: string;
}

// ---------- Questions / answer options ----------

export interface IAnswerOptionPublic {
  id: number;
  question_id: number;
  text: string;
  position: number;
}

export interface IAnswerOptionAdmin extends IAnswerOptionPublic {
  is_correct: boolean;
}

export interface IQuestionPublic {
  id: number;
  lesson_id: number;
  prompt: string;
  position: number;
  options: IAnswerOptionPublic[];
}

export interface IQuestionAdmin {
  id: number;
  lesson_id: number;
  prompt: string;
  position: number;
  options: IAnswerOptionAdmin[];
}

export interface IAnswerOptionCreate {
  text: string;
  is_correct: boolean;
  position: number;
}

export interface IQuestionCreate {
  prompt: string;
  position: number;
  options: IAnswerOptionCreate[];
}
