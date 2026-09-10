import { useTranslation } from "react-i18next";
import { toEmbedUrl } from "../../../shared/utils/videoEmbedUrl";

export function LessonVideo({ videoUrl }: { videoUrl: string | null | undefined }) {
    const { t } = useTranslation();
    if (!videoUrl) {
        return (
            <div className="rounded-xl border border-dashed border-gray-300 bg-surface-muted p-6 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {t("lessonPage.videoEmpty")}
            </div>
        );
    }

    const embed = toEmbedUrl(videoUrl);

    // Not a platform we know how to frame: link out instead of showing a player
    // that the provider would refuse to render anyway.
    if (!embed) {
        return (
            <div className="rounded-xl border border-dashed border-gray-300 bg-surface-muted p-6 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {t("lessonPage.videoUnsupported")}{" "}
                <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-green-700 underline dark:text-uned-primary"
                >
                    {videoUrl}
                </a>
            </div>
        );
    }

    return (
        <div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-slate-600">
                <div className="mx-auto aspect-video w-full max-w-[min(100%,calc(75vh*16/9))]">
                    <iframe
                        src={embed}
                        title={t("lessonPage.videoTitle")}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                    />
                </div>
            </div>
            {/* Escape hatch: ad blockers and strict privacy settings can leave the
                frame blank, and then the lesson would be a dead end. */}
            <p className="mt-2 text-right text-xs">
                <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 underline hover:text-gray-800 dark:text-slate-400 dark:hover:text-slate-200"
                >
                    {t("lessonPage.videoOpenExternal")}
                </a>
            </p>
        </div>
    );
}
