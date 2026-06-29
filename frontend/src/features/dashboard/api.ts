import { api } from "../../shared/api/api";
import type {
    IAdminDashboard,
    IInstructorDashboard,
    IPublicStats,
    IStudentDashboard,
} from "../../shared/interfaces/IDashboard";
import type { PublicStatsPeriod } from "../../shared/types/LessonTypes";

export const API_getStudentDashboard = async (): Promise<IStudentDashboard> => {
    const { data } = await api.get<IStudentDashboard>("/dashboard/student/me");
    return data;
};

export const API_getInstructorDashboard = async (): Promise<IInstructorDashboard> => {
    const { data } = await api.get<IInstructorDashboard>(
        "/dashboard/instructor/me",
    );
    return data;
};

export const API_getAdminDashboard = async (): Promise<IAdminDashboard> => {
    const { data } = await api.get<IAdminDashboard>("/dashboard/admin");
    return data;
};

export const API_getPublicStats = async (
    period: PublicStatsPeriod = "week",
): Promise<IPublicStats> => {
    const { data } = await api.get<IPublicStats>("/dashboard/public", {
        params: { period },
    });
    return data;
};
