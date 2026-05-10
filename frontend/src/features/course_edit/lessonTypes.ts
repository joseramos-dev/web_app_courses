export type LessonType = "text" | "video" | "test" | "multiple_selection";

export interface ILesson {
  id: number;
  course_id: number;
  title: string;
  lesson_type: LessonType;
  position: number;
  body?: string | null;
  video_url?: string | null;
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
