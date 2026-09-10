import { useEffect, useState } from "react";
import type { IQuestionAdmin, LessonType } from "../lessonTypes";

export type DraftOption = {
    text: string;
    is_correct: boolean;
    position: number;
};

export type Draft = {
    prompt: string;
    options: DraftOption[];
};

const emptyDraft: Draft = {
    prompt: "",
    options: [
        { text: "", is_correct: false, position: 1 },
        { text: "", is_correct: false, position: 2 },
    ],
};

function cloneEmptyDraft(): Draft {
    return {
        ...emptyDraft,
        options: emptyDraft.options.map((o) => ({ ...o })),
    };
}

function questionToDraft(q: IQuestionAdmin): Draft {
    return {
        prompt: q.prompt,
        options: q.options.map((o) => ({
            text: o.text,
            is_correct: o.is_correct,
            position: o.position,
        })),
    };
}

/**
 * Owns the editable draft of a question form: the prompt/options state,
 * resynced whenever `question` changes (switching between "add" and "edit
 * this question"), plus its mutators.
 */
export function useQuestionDraft(question: IQuestionAdmin | null, lessonType: LessonType) {
    const isSingleChoice = lessonType === "test";
    const [draft, setDraft] = useState<Draft>(() =>
        question ? questionToDraft(question) : cloneEmptyDraft(),
    );

    useEffect(() => {
        setDraft(question ? questionToDraft(question) : cloneEmptyDraft());
    }, [question]);

    const updateOption = (idx: number, patch: Partial<DraftOption>) => {
        setDraft((d) => ({
            ...d,
            options: d.options.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
        }));
    };

    const addOption = () => {
        setDraft((d) => ({
            ...d,
            options: [
                ...d.options,
                { text: "", is_correct: false, position: d.options.length + 1 },
            ],
        }));
    };

    const removeOption = (idx: number) => {
        setDraft((d) => ({
            ...d,
            options: d.options
                .filter((_, i) => i !== idx)
                .map((o, i) => ({ ...o, position: i + 1 })),
        }));
    };

    /** In a single-choice question, ticking one option unticks the rest, which
     *  is what keeps the answer key answerable. */
    const setCorrect = (idx: number, checked: boolean) => {
        if (!isSingleChoice) {
            updateOption(idx, { is_correct: checked });
            return;
        }
        setDraft((prev) => ({
            ...prev,
            options: prev.options.map((opt, i) => ({ ...opt, is_correct: i === idx })),
        }));
    };

    return { draft, setDraft, isSingleChoice, updateOption, addOption, removeOption, setCorrect };
}
