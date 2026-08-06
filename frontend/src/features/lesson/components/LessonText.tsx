import { useTranslation } from "react-i18next";

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
        <article className="rounded-xl border border-gray-200 bg-surface-muted p-6 dark:border-slate-600 dark:bg-slate-800">
            {/*
                Render plain text preserving whitespace. A markdown renderer
                (e.g. react-markdown) can be plugged in later without changing
                the API contract.
            */}
            <pre className="wrap-break-word font-sans text-sm leading-6 whitespace-pre-wrap text-gray-800 dark:text-slate-200">
                {body}
            </pre>
        </article>
    );
}
