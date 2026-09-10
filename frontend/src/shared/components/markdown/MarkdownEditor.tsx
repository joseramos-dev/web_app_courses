import { useRef, useState, type ReactNode } from "react";
import {
    Bold,
    Code,
    Eye,
    Heading2,
    Heading3,
    Image,
    Italic,
    Link,
    List,
    ListOrdered,
    Paperclip,
    Quote,
    Video,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { MarkdownContent } from "./MarkdownContent";

export type MarkdownAttachment = {
    id: number;
    label: string;
    url: string;
};

type Props = {
    value: string;
    onChange: (next: string) => void;
    disabled?: boolean;
    attachments?: MarkdownAttachment[];
};

type ToolbarAction = {
    id: string;
    icon: ReactNode;
    labelKey: string;
    insert: (selected: string) => string;
    wrap?: boolean;
};

function insertAtCursor(
    textarea: HTMLTextAreaElement,
    before: string,
    after = "",
    placeholder = "",
) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = textarea.value.slice(start, end) || placeholder;
    const next =
        textarea.value.slice(0, start) + before + selected + after + textarea.value.slice(end);
    return { next, cursor: start + before.length + selected.length + after.length };
}

export function MarkdownEditor({ value, onChange, disabled, attachments = [] }: Props) {
    const { t } = useTranslation();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [mode, setMode] = useState<"edit" | "preview">("edit");

    const applyInsert = (before: string, after = "", placeholder = "") => {
        const el = textareaRef.current;
        if (!el || disabled) return;
        const { next, cursor } = insertAtCursor(el, before, after, placeholder);
        onChange(next);
        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(cursor, cursor);
        });
    };

    const toolbar: ToolbarAction[] = [
        {
            id: "h2",
            icon: <Heading2 className="size-4" />,
            labelKey: "markdownEditor.toolbar.h2",
            insert: (s) => `## ${s}`,
        },
        {
            id: "h3",
            icon: <Heading3 className="size-4" />,
            labelKey: "markdownEditor.toolbar.h3",
            insert: (s) => `### ${s}`,
        },
        {
            id: "bold",
            icon: <Bold className="size-4" />,
            labelKey: "markdownEditor.toolbar.bold",
            insert: (s) => `**${s}**`,
            wrap: true,
        },
        {
            id: "italic",
            icon: <Italic className="size-4" />,
            labelKey: "markdownEditor.toolbar.italic",
            insert: (s) => `*${s}*`,
            wrap: true,
        },
        {
            id: "ul",
            icon: <List className="size-4" />,
            labelKey: "markdownEditor.toolbar.bulletList",
            insert: () => "- ",
        },
        {
            id: "ol",
            icon: <ListOrdered className="size-4" />,
            labelKey: "markdownEditor.toolbar.orderedList",
            insert: () => "1. ",
        },
        {
            id: "quote",
            icon: <Quote className="size-4" />,
            labelKey: "markdownEditor.toolbar.quote",
            insert: (s) => `> ${s}`,
        },
        {
            id: "code",
            icon: <Code className="size-4" />,
            labelKey: "markdownEditor.toolbar.code",
            insert: () => "```\n\n```",
        },
    ];

    const handleLink = () => {
        const url = window.prompt(t("markdownEditor.prompts.linkUrl"));
        if (!url) return;
        const label = window.prompt(t("markdownEditor.prompts.linkLabel"), url) ?? url;
        applyInsert(`[${label}](`, ")", label);
    };

    const handleImage = () => {
        const url = window.prompt(t("markdownEditor.prompts.imageUrl"));
        if (!url) return;
        const alt = window.prompt(t("markdownEditor.prompts.imageAlt"), "") ?? "";
        applyInsert(`![${alt}](`, ")", url);
    };

    const handleVideo = () => {
        const url = window.prompt(t("markdownEditor.prompts.videoUrl"));
        if (!url) return;
        applyInsert("[video](", ")", url);
    };

    const handleAttachment = (att: MarkdownAttachment) => {
        applyInsert(`[${att.label}](`, ")", att.url);
    };

    return (
        <div className="rounded-lg border border-gray-200 dark:border-slate-600">
            <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 p-2 dark:border-slate-600 dark:bg-slate-900/50">
                {toolbar.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        disabled={disabled || mode === "preview"}
                        title={t(item.labelKey)}
                        aria-label={t(item.labelKey)}
                        onClick={() => {
                            const el = textareaRef.current;
                            if (!el) return;
                            const selected =
                                el.value.slice(el.selectionStart, el.selectionEnd) ||
                                t("markdownEditor.placeholderText");
                            if (item.id === "bold") {
                                applyInsert("**", "**", selected);
                            } else if (item.id === "italic") {
                                applyInsert("*", "*", selected);
                            } else if (item.id === "code") {
                                applyInsert("```\n", "\n```", selected);
                            } else {
                                const inserted = item.insert(selected);
                                applyInsert(inserted, "");
                            }
                        }}
                        className="rounded p-1.5 text-gray-700 hover:bg-gray-200 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        {item.icon}
                    </button>
                ))}
                <button
                    type="button"
                    disabled={disabled || mode === "preview"}
                    title={t("markdownEditor.toolbar.link")}
                    onClick={handleLink}
                    className="rounded p-1.5 text-gray-700 hover:bg-gray-200 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                    <Link className="size-4" />
                </button>
                <button
                    type="button"
                    disabled={disabled || mode === "preview"}
                    title={t("markdownEditor.toolbar.image")}
                    onClick={handleImage}
                    className="rounded p-1.5 text-gray-700 hover:bg-gray-200 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                    <Image className="size-4" />
                </button>
                <button
                    type="button"
                    disabled={disabled || mode === "preview"}
                    title={t("markdownEditor.toolbar.video")}
                    onClick={handleVideo}
                    className="rounded p-1.5 text-gray-700 hover:bg-gray-200 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                    <Video className="size-4" />
                </button>
                {attachments.map((att) => (
                    <button
                        key={att.id}
                        type="button"
                        disabled={disabled || mode === "preview"}
                        title={att.label}
                        onClick={() => handleAttachment(att)}
                        className="rounded p-1.5 text-gray-700 hover:bg-gray-200 disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                        <Paperclip className="size-4" />
                    </button>
                ))}
                <div className="ml-auto flex gap-1">
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setMode("edit")}
                        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${mode === "edit" ? "bg-gray-900 text-white dark:bg-uned-primary dark:text-slate-900" : "text-gray-600 dark:text-slate-300"}`}
                    >
                        {t("markdownEditor.edit")}
                    </button>
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setMode("preview")}
                        className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${mode === "preview" ? "bg-gray-900 text-white dark:bg-uned-primary dark:text-slate-900" : "text-gray-600 dark:text-slate-300"}`}
                    >
                        <Eye className="size-3.5" />
                        {t("markdownEditor.preview")}
                    </button>
                </div>
            </div>

            {mode === "edit" ? (
                <textarea
                    ref={textareaRef}
                    value={value}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.value)}
                    rows={14}
                    placeholder={t("markdownEditor.placeholder")}
                    className="w-full resize-y rounded-b-lg border-0 bg-white px-3 py-2 font-mono text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-uned-accent/25 dark:bg-slate-900 dark:text-slate-100"
                />
            ) : (
                <div className="min-h-[280px] rounded-b-lg bg-white p-4 dark:bg-slate-900">
                    {value.trim() ? (
                        <MarkdownContent content={value} />
                    ) : (
                        <p className="text-sm text-gray-500 dark:text-slate-400">
                            {t("markdownEditor.previewEmpty")}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
