import type { Draft } from "./useQuestionDraft";
import type { LessonType } from "../lessonTypes";

/** Returns an i18n key describing the first validation failure, or `null`
 *  if `draft` is ready to submit for `lessonType`. */
export function validateQuestionDraft(draft: Draft, lessonType: LessonType): string | null {
    const prompt = draft.prompt.trim();
    if (!prompt) return "courseEdit.toast.promptRequired";

    const options = draft.options.filter((o) => o.text.trim().length > 0);
    if (options.length < 2) return "courseEdit.toast.minTwoOptions";

    const correct = options.filter((o) => o.is_correct).length;
    if (correct === 0) return "courseEdit.toast.correctOptionRequired";
    if (lessonType === "test" && correct !== 1) return "courseEdit.toast.testNeedsOneCorrect";
    if (lessonType === "multiple_selection" && correct < 2) {
        return "courseEdit.toast.multipleNeedsTwoCorrect";
    }

    return null;
}
