import { useCallback, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
    API_getCourseCurriculum,
    API_getCourseDetailById,
    API_getMyEnrollment,
} from "../api";
import type { ICourses } from "../../../shared/interfaces/ICourses";
import type { ICourseCurriculum, ILesson } from "../../course_edit/lessonTypes";
import type {
    IEnrollmentDetail,
    LessonProgressStatus,
} from "../../../shared/interfaces/IEnrollment";
import { useAuth } from "../../../shared/provider/AuthContext";
import {
    KURSA_COURSE_ENROLLMENT_CHANGED_EVENT,
    KURSA_DASHBOARD_REFRESH_EVENT,
} from "../../../shared/constants/appEvents";
import { flattenCurriculumLessons } from "../../../shared/utils/curriculumUtils";
import { isCourseStaff } from "../../../shared/utils/lessonAccessUtils";
import { buildLessonProgressMap } from "../../../shared/utils/buildLessonProgressMap";
import { useAsyncData } from "../../../shared/hooks/useAsyncData";

export interface UseCourseDetailDataResult {
    course: ICourses | null;
    curriculum: ICourseCurriculum | null;
    enrollment: IEnrollmentDetail | null;
    isLoading: boolean;
    error: string | null;
    /** All lessons across all topics, flattened and ordered. */
    flatLessons: ILesson[];
    progressByLesson: Map<number, LessonProgressStatus>;
    pendingSet: Set<number>;
    isEnrolled: boolean;
    isStaff: boolean;
    canOpenLessons: boolean;
    continueLesson: ILesson | null;
    progressPercent: number;
    canSubmitCourseRating: boolean;
    /** Global 1-based position of each lesson within the curriculum. */
    lessonNumbers: Map<number, number>;
    refetchEnrollment: () => Promise<void>;
    refetchCourseSummary: () => Promise<void>;
}

/**
 * Owns all data fetching for the course detail page: the course, its
 * curriculum and the current user's enrollment (if any), plus the effects
 * that keep that data fresh (reload on navigation, cross-tab enrollment
 * changes). Also exposes the values purely derived from that fetched data.
 */
export function useCourseDetailData(courseId: string | undefined): UseCourseDetailDataResult {
    const { t } = useTranslation();
    const location = useLocation();
    const { user } = useAuth();

    const {
        data,
        loading: isLoading,
        error,
        setData,
        refetch,
    } = useAsyncData<{
        course: ICourses;
        curriculum: ICourseCurriculum;
        enrollment: IEnrollmentDetail | null;
    }>(
        () => {
            if (courseId == null || Number.isNaN(Number(courseId))) {
                return Promise.reject(t("courseDetail.invalidCourse"));
            }
            const id = Number(courseId);
            const enrollmentReq =
                user && user.role === "student"
                    ? API_getMyEnrollment(id)
                    : Promise.resolve(null);
            return Promise.all([
                API_getCourseDetailById(id),
                API_getCourseCurriculum(id),
                enrollmentReq,
            ]).then(([course, curriculum, enrollment]) => ({ course, curriculum, enrollment }));
        },
        [courseId, user, t, location.key],
        { errorMessage: t("courseDetail.loadError") },
    );
    const course = data?.course ?? null;
    const curriculum = data?.curriculum ?? null;
    const enrollment = data?.enrollment ?? null;

    const flatLessons = useMemo(
        () => (curriculum ? flattenCurriculumLessons(curriculum.topics) : []),
        [curriculum],
    );

    const progressByLesson = useMemo(
        () => buildLessonProgressMap(enrollment),
        [enrollment],
    );

    const pendingSet = useMemo(
        () => new Set(enrollment?.pending_review_lesson_ids ?? []),
        [enrollment],
    );

    const refetchEnrollment = useCallback(async () => {
        if (courseId == null || Number.isNaN(Number(courseId))) return;
        if (!user || user.role !== "student") return;
        const enr = await API_getMyEnrollment(Number(courseId));
        setData((prev) => (prev ? { ...prev, enrollment: enr } : prev));
        window.dispatchEvent(new Event(KURSA_DASHBOARD_REFRESH_EVENT));
    }, [courseId, user, setData]);

    const refetchCourseSummary = useCallback(async () => {
        if (courseId == null || Number.isNaN(Number(courseId))) return;
        const detail = await API_getCourseDetailById(Number(courseId));
        setData((prev) => (prev ? { ...prev, course: detail } : prev));
    }, [courseId, setData]);

    useEffect(() => {
        const id = courseId != null && !Number.isNaN(Number(courseId)) ? Number(courseId) : null;
        if (id == null) return;
        const onEnrollmentChanged = (e: Event) => {
            const detail = (e as CustomEvent<{ courseId?: number }>).detail;
            if (detail?.courseId === id) void refetch();
        };
        window.addEventListener(KURSA_COURSE_ENROLLMENT_CHANGED_EVENT, onEnrollmentChanged);
        return () =>
            window.removeEventListener(
                KURSA_COURSE_ENROLLMENT_CHANGED_EVENT,
                onEnrollmentChanged,
            );
    }, [courseId, refetch]);

    const isEnrolled = enrollment !== null;
    const isStaff = isCourseStaff(user, course);
    const canOpenLessons = isEnrolled || isStaff;

    const continueLesson = useMemo(() => {
        if (!enrollment?.current_lesson_id) return null;
        return flatLessons.find((l) => l.id === enrollment.current_lesson_id) ?? null;
    }, [enrollment, flatLessons]);

    const progressPercent = enrollment?.progress_percent ?? 0;
    const canSubmitCourseRating =
        isEnrolled &&
        (flatLessons.length === 0 || (enrollment?.completed_lessons_count ?? 0) >= 1);

    const lessonNumbers = useMemo(() => {
        if (!curriculum) return new Map<number, number>();
        const map = new Map<number, number>();
        let index = 0;
        for (const topic of [...curriculum.topics].sort((a, b) => a.position - b.position)) {
            for (const lesson of [...topic.lessons].sort((a, b) => a.position - b.position)) {
                index += 1;
                map.set(lesson.id, index);
            }
        }
        return map;
    }, [curriculum]);

    return {
        course,
        curriculum,
        enrollment,
        isLoading,
        error,
        flatLessons,
        progressByLesson,
        pendingSet,
        isEnrolled,
        isStaff,
        canOpenLessons,
        continueLesson,
        progressPercent,
        canSubmitCourseRating,
        lessonNumbers,
        refetchEnrollment,
        refetchCourseSummary,
    };
}
