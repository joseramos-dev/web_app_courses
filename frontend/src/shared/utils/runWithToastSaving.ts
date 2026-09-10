import toast from "react-hot-toast";
import { resolveErrorMessage, type ErrorMessage } from "./resolveErrorMessage";

/**
 * Runs `action`, flipping a "busy" flag on for its duration and showing an
 * error toast if it rejects.
 *
 * Plain boolean busy flag:
 *   await runWithToastSaving(setSaving, () => save(), "Could not save");
 *
 * Busy state keyed by something other than a boolean -- an id, a union of
 * "which action is running", etc. -- pass the busy and idle values
 * explicitly as the 2nd/3rd arguments:
 *   await runWithToastSaving(setBusy, "courses", null, () => seed(), "Failed");
 *
 * `fallbackErrorMessage` is shown unless the thrown value is itself a
 * string, or it can be a function of the caught error -- e.g. to surface a
 * backend-provided detail message -- instead of a plain string.
 */
export async function runWithToastSaving<T>(
  setSaving: (next: boolean) => void,
  action: () => Promise<T>,
  fallbackErrorMessage: ErrorMessage,
): Promise<T | undefined>;
export async function runWithToastSaving<T, B>(
  setBusy: (next: B) => void,
  busyValue: B,
  idleValue: B,
  action: () => Promise<T>,
  fallbackErrorMessage: ErrorMessage,
): Promise<T | undefined>;
export async function runWithToastSaving<T, B = boolean>(
  setBusy: (next: B) => void,
  actionOrBusyValue: (() => Promise<T>) | B,
  fallbackOrIdleValue: ErrorMessage | B,
  maybeAction?: () => Promise<T>,
  maybeFallbackErrorMessage?: ErrorMessage,
): Promise<T | undefined> {
  const isShortForm = typeof actionOrBusyValue === "function";
  const busyValue = isShortForm ? ((true as unknown) as B) : (actionOrBusyValue as B);
  const idleValue = isShortForm ? ((false as unknown) as B) : (fallbackOrIdleValue as B);
  const action = (isShortForm ? actionOrBusyValue : maybeAction) as () => Promise<T>;
  const fallbackErrorMessage = (
    isShortForm ? fallbackOrIdleValue : maybeFallbackErrorMessage
  ) as ErrorMessage;

  try {
    setBusy(busyValue);
    return await action();
  } catch (e) {
    console.error(e);
    toast.error(resolveErrorMessage(e, fallbackErrorMessage));
    return undefined;
  } finally {
    setBusy(idleValue);
  }
}
