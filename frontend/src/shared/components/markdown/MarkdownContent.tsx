import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { useTranslation } from "react-i18next";
import { isVideoEmbedUrl, toEmbedUrl } from "../../utils/videoEmbedUrl";

type Props = {
    content: string;
    className?: string;
};

function MarkdownVideoEmbed({ url }: { url: string }) {
    const { t } = useTranslation();
    const embed = toEmbedUrl(url);
    if (!embed) return null;
    return (
        <div className="my-4 overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-slate-600">
            <div className="aspect-video w-full">
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
    );
}

export function MarkdownContent({ content, className = "" }: Props) {
    return (
        <article
            className={`prose prose-sm max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-slate-100 prose-p:text-gray-800 dark:prose-p:text-slate-200 prose-a:text-green-700 dark:prose-a:text-uned-primary prose-code:rounded prose-code:bg-gray-100 prose-code:px-1 dark:prose-code:bg-slate-800 ${className}`}
        >
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={{
                    a({ href, children, ...props }) {
                        const childText = String(children ?? "");
                        if (childText === "video" || childText.startsWith("@video")) {
                            if (href && isVideoEmbedUrl(href)) {
                                return <MarkdownVideoEmbed url={href} />;
                            }
                        }
                        return (
                            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                                {children}
                            </a>
                        );
                    },
                    img({ src, alt, ...props }) {
                        if (!src) return null;
                        return (
                            <img
                                src={src}
                                alt={alt ?? ""}
                                className="max-w-full rounded-lg"
                                {...props}
                            />
                        );
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </article>
    );
}
