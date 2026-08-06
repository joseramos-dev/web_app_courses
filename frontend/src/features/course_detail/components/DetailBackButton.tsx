import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  DEFAULT_COURSE_RETURN,
  resolveReturnTo,
} from "../../../shared/types/CourseNavState";

export function DetailBackButton({
  fallbackTo = DEFAULT_COURSE_RETURN,
  label,
}: {
  fallbackTo?: string;
  label?: string;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const resolvedLabel = label ?? t("courseDetail.backButton");

  return (
    <button
      type="button"
      onClick={() => {
        navigate(resolveReturnTo(location.state, fallbackTo));
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:shadow-md dark:hover:bg-slate-700"
    >
      <span aria-hidden>←</span>
      <span>{resolvedLabel}</span>
    </button>
  );
}

