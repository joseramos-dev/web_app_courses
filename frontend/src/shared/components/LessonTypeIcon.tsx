import {
    ClipboardCheck,
    FileText,
    ListChecks,
    PenLine,
    PlayCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { LessonType } from "../../features/course_edit/lessonTypes";
import { getLessonTypeLabels } from "../types/LessonTypes";

type Props = {
    lessonType: LessonType;
    className?: string;
};

export function LessonTypeIcon({ lessonType, className = "size-4 shrink-0 text-gray-500 dark:text-slate-400" }: Props) {
    const { t } = useTranslation();
    const labels = getLessonTypeLabels(t);
    const label = labels[lessonType];

    switch (lessonType) {
        case "text":
            return <FileText className={className} aria-label={label} />;
        case "video":
            return <PlayCircle className={className} aria-label={label} />;
        case "test":
            return <ClipboardCheck className={className} aria-label={label} />;
        case "multiple_selection":
            return <ListChecks className={className} aria-label={label} />;
        case "assignment":
            return <PenLine className={className} aria-label={label} />;
        default:
            return <FileText className={className} aria-label={label} />;
    }
}
