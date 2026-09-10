import toast from "react-hot-toast";

import { apiErrorMessage } from "../../../shared/utils/apiError";

export async function runWithSubmitting<T>(
  setSubmitting: (next: boolean) => void,
  action: () => Promise<T>,
  fallbackErrorMessage: string,
): Promise<T | undefined> {
  try {
    setSubmitting(true);
    return await action();
  } catch (e) {
    console.error(e);
    toast.error(apiErrorMessage(e, fallbackErrorMessage));
    return undefined;
  } finally {
    setSubmitting(false);
  }
}
