import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import type { ILessonFile } from "../lessonTypes";
import {
  API_deleteLessonFile,
  API_getLessonFiles,
  API_uploadLessonFile,
} from "../api";
import { apiErrorMessage } from "../../../shared/utils/apiError";
import { runWithToastSaving } from "../../../shared/utils/runWithToastSaving";

export interface UseLessonAttachmentsEditorResult {
  attachments: ILessonFile[];
  isLoading: boolean;
  uploadingFile: boolean;
  handleUploadFile: (file: File) => Promise<void>;
  handleDeleteFile: (fileId: number) => Promise<void>;
}

/**
 * Owns the lesson's file-attachment list plus its upload/delete flow.
 * `lessonId` is the raw route param (string, possibly undefined while the
 * route is resolving) -- fetching starts as soon as it parses to a number,
 * independent of whether the lesson metadata itself has finished loading.
 */
export function useLessonAttachmentsEditor(
  lessonId: string | undefined,
): UseLessonAttachmentsEditorResult {
  const { t } = useTranslation();
  const [attachments, setAttachments] = useState<ILessonFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    const id = Number(lessonId);
    if (Number.isNaN(id)) return;
    const load = async () => {
      try {
        setIsLoading(true);
        const files = await API_getLessonFiles(id);
        setAttachments(files);
      } catch (e) {
        console.error(e);
        toast.error(t("courseEdit.loadError"));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [lessonId, t]);

  const handleUploadFile = async (file: File) => {
    const id = Number(lessonId);
    if (Number.isNaN(id)) return;
    const uploaded = await runWithToastSaving(
      setUploadingFile,
      () => API_uploadLessonFile(id, file),
      (e) => apiErrorMessage(e, t("courseEdit.toast.fileUploadFailed")),
    );
    if (uploaded) {
      setAttachments((prev) => [...prev, uploaded]);
      toast.success(t("courseEdit.toast.fileUploaded"));
    }
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!confirm(t("courseEdit.lessonModal.deleteFileConfirm"))) return;
    try {
      await API_deleteLessonFile(fileId);
      setAttachments((prev) => prev.filter((f) => f.id !== fileId));
      toast.success(t("courseEdit.toast.fileDeleted"));
    } catch (e) {
      console.error(e);
      toast.error(t("courseEdit.toast.fileDeleteFailed"));
    }
  };

  return { attachments, isLoading, uploadingFile, handleUploadFile, handleDeleteFile };
}
