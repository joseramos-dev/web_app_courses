import type { ICourseCurriculum, ILesson, ITopicWithLessons } from "../../features/course_edit/lessonTypes";

export function flattenCurriculumLessons(topics: ITopicWithLessons[]): ILesson[] {
    const sorted = [...topics].sort((a, b) => a.position - b.position);
    const out: ILesson[] = [];
    for (const topic of sorted) {
        const lessons = [...topic.lessons].sort((a, b) => a.position - b.position);
        out.push(...lessons);
    }
    return out;
}

export function getLessonGlobalIndex(
    lessons: ILesson[],
    lessonId: number,
): number {
    const idx = lessons.findIndex((l) => l.id === lessonId);
    return idx === -1 ? 0 : idx + 1;
}

export function findTopicForLesson(
    curriculum: ICourseCurriculum,
    lessonId: number,
): ITopicWithLessons | null {
    for (const topic of curriculum.topics) {
        if (topic.lessons.some((l) => l.id === lessonId)) return topic;
    }
    return null;
}
