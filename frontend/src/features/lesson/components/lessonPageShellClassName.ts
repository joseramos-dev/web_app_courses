export function lessonPageShellClassName(lessonType?: string): string {
  if (lessonType === "video") {
    return "w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-12";
  }
  return "mx-auto max-w-3xl px-4 py-6";
}
