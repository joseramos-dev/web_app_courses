import { useTranslation } from "react-i18next";
import { MarkdownContent } from "../../../shared/components/markdown/MarkdownContent";

export function LessonText({ body }: { body: string | null | undefined }) {
    const { t } = useTranslation();
    if (!body) {
        return (
            <div className="rounded-xl border border-dashed border-gray-300 bg-surface-muted p-6 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {t("lessonPage.textEmpty")}
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-surface-muted p-6 dark:border-slate-600 dark:bg-slate-800">
            <MarkdownContent content={body} />
        </div>
    );
}
