import { useState } from "react";
import { Download, FileText } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { ILessonFile } from "../../course_edit/lessonTypes";
import { api } from "../../../shared/api/api";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  files: ILessonFile[];
  loading?: boolean;
};

export function LessonAttachments({ files, loading }: Props) {
  const { t } = useTranslation();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownload = async (file: ILessonFile) => {
    try {
      setDownloadingId(file.id);
      const { data } = await api.get<Blob>(
        `/lessons/files/${file.id}/download`,
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.original_filename;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      toast.error(t("lessonPage.attachments.downloadFailed"));
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
          {t("lessonPage.attachments.title")}
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          {t("lessonPage.attachments.loading")}
        </p>
      </section>
    );
  }

  if (files.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-surface-muted p-4 dark:border-slate-600 dark:bg-slate-800">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
        {t("lessonPage.attachments.title")}
      </h2>
      <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
        {t("lessonPage.attachments.subtitle")}
      </p>
      <ul className="mt-3 space-y-2">
        {files.map((file) => (
          <li key={file.id}>
            <button
              type="button"
              onClick={() => void handleDownload(file)}
              disabled={downloadingId === file.id}
              className="flex w-full items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-sm shadow-sm transition hover:bg-gray-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:hover:bg-slate-700/80"
            >
              <FileText
                className="size-4 shrink-0 text-gray-400 dark:text-slate-500"
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate font-medium text-gray-900 dark:text-slate-100">
                {file.original_filename}
              </span>
              <span className="shrink-0 text-xs text-gray-500 dark:text-slate-400">
                {formatFileSize(file.size_bytes)}
              </span>
              <Download
                className="size-4 shrink-0 text-gray-400 dark:text-slate-500"
                aria-hidden
              />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
