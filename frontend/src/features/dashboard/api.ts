import { api } from "../../shared/api/api";
import type {
    IAdminDashboard,
    IInstructorDashboard,
    IStudentDashboard,
} from "../../shared/interfaces/IDashboard";

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
