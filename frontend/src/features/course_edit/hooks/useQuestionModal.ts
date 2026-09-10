import { useState } from "react";
import type { IQuestionAdmin } from "../lessonTypes";

export interface UseQuestionModalResult {
  isOpen: boolean;
  editingQuestion: IQuestionAdmin | null;
  refreshKey: number;
  openForAdd: () => void;
  openForEdit: (question: IQuestionAdmin) => void;
  close: () => void;
  handleSaved: () => void;
  handleDeleted: () => void;
}

/**
 * Orchestrates the quiz-question editor modal: which question (if any) is
 * being edited, whether the modal is open, and the refresh key used to make
 * `ExistingQuestionsPanel` re-fetch after a question is added/edited/deleted.
 */
export function useQuestionModal(): UseQuestionModalResult {
  const [isOpen, setIsOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<IQuestionAdmin | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const openForAdd = () => {
    setEditingQuestion(null);
    setIsOpen(true);
  };

  const openForEdit = (question: IQuestionAdmin) => {
    setEditingQuestion(question);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    setEditingQuestion(null);
  };

  const handleSaved = () => {
    setRefreshKey((key) => key + 1);
    setIsOpen(false);
    setEditingQuestion(null);
  };

  const handleDeleted = () => {
    setRefreshKey((key) => key + 1);
  };

  return {
    isOpen,
    editingQuestion,
    refreshKey,
    openForAdd,
    openForEdit,
    close,
    handleSaved,
    handleDeleted,
  };
}
