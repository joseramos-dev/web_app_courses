import toast from "react-hot-toast";

export async function runWithToastSaving<T>(
  setSaving: (next: boolean) => void,
  action: () => Promise<T>,
  fallbackErrorMessage: string,
): Promise<T | undefined> {
  try {
    setSaving(true);
    return await action();
  } catch (e) {
    console.error(e);
    toast.error(typeof e === "string" ? e : fallbackErrorMessage);
    return undefined;
  } finally {
    setSaving(false);
  }
}
