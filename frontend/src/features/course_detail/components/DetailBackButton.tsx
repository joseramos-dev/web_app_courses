import { useLocation, useNavigate } from "react-router-dom";
import {
  DEFAULT_COURSE_RETURN,
  resolveReturnTo,
} from "../../../shared/types/CourseNavState";

export function DetailBackButton({
  fallbackTo = DEFAULT_COURSE_RETURN,
  label = "Back",
}: {
  fallbackTo?: string;
  label?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <button
      type="button"
      onClick={() => {
        navigate(resolveReturnTo(location.state, fallbackTo));
      }}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:shadow-md dark:hover:bg-slate-700"
    >
      <span aria-hidden>←</span>
      <span>{label}</span>
    </button>
  );
}

