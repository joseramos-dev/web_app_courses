import type { AxiosError } from "axios";
import { api } from "../../shared/api/api"
import type { IUser } from "../../shared/interfaces/IUser"
import type { UserRoles } from "../../shared/types/UserRoles"

export const API_getUsers = async (): Promise<IUser[]> => {
    try {
        const response = await api.get<IUser[]>("/users")
        return response.data;
    } catch (error) {
        console.error("Error fetching users: ", error);
        throw error;
    }
}

export const API_deleteUser = async (userId: number): Promise<string> => {
    try {
        const response = await api.delete<{ detail: string }>(`/users/${userId}`)
        return response.data.detail

    } catch (error) {
        const axiosError = error as AxiosError<{ detail: string }>
        throw axiosError.response?.data.detail || "Error deleting user"
    }
}


export const API_updateUserRole = async (userId: number, role: UserRoles): Promise<IUser> => {
    try {
        const response = await api.patch<IUser>(`/users/${userId}/role/${role}`)
        return response.data
    } catch (error) {
        const axiosError = error as AxiosError<{ detail: string }>
        throw axiosError.response?.data.detail || "Error updating user role"
    }
}
