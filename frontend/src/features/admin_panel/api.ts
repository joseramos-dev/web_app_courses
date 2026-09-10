import type { AxiosError } from "axios";
import { api, apiArray } from "../../shared/api/api"
import type { IUser } from "../../shared/interfaces/IUser"
import type { UserRoles } from "../../shared/types/UserRoles"

export interface IPaginatedUsers {
    users: IUser[]
    total: number
    limit: number
    offset: number
}

export interface IUserQuery {
    search?: string
    /** Repeated in the query string, so several roles can be combined. */
    role?: UserRoles[]
    limit?: number
    offset?: number
}

export const API_getUsers = async (params: IUserQuery = {}): Promise<IPaginatedUsers> => {
    try {
        // apiArray serialises repeated params (role=student&role=admin).
        const response = await apiArray.get<IPaginatedUsers>("/users", { params })
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
