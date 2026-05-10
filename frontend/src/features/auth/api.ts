import { apiAuth, api } from "../../shared/api/api";
import type { IUserCreate } from "./IUserCreate";
import type { UserRoles } from "../../shared/types/UserRoles";
import type { IUser } from "../../shared/interfaces/IUser";
import type { IToken } from "../../shared/interfaces/IToken";
import type { AxiosError } from "axios";
import type { IAuthResponse } from "../../shared/interfaces/IAuthResponse";

export const API_register = async (
    name: string,
    email: string,
    password: string,
    role: UserRoles
): Promise<IUser> => {
    try {
        const newUser: IUserCreate = {
            name: name,
            email: email,
            password: password,
            role: role,
        }
        const response = await api.post<IUser>("/users", newUser)
        return response.data
    } catch (error) {
        console.error(error)
        const axiosError = error as AxiosError<{ detail: string }>
        throw axiosError?.response?.data?.detail || "Error al registrar el usuario"
    }
}

export const API_login = async (nameOrEmail: string, password: string): Promise<IAuthResponse> => {
    try {
        const response = await apiAuth.post<IToken>("/token", new URLSearchParams({ username: nameOrEmail, password: password }))
        const token = response.data;
        const responseMe = await api.get<IUser>("/me", {
            headers: {
                Authorization: `Bearer ${token.access_token}`,
            },
        });
        return {
            user: responseMe.data,
            token
        }
    } catch (error) {
        console.error(error)
        const axiosError = error as AxiosError<{ detail: string }>
        throw axiosError?.response?.data?.detail || "Error al obtener el token de acceso"
    }
}