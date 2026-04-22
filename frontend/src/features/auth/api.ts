import { apiAuth, api } from "../../shared/api/api";
import type { IUserCreate } from "./IUserCreate";
import type { UserRoles } from "../../shared/types/UserRoles";
import type { IUser } from "../../shared/interfaces/IUser";
import type { IToken } from "../../shared/interfaces/IToken";

export const register = async (
    name: string, email: string, password: string, role: UserRoles): Promise<IUser> => {
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
        throw error?.response?.data?.detail || "Error al registrar el usuario"
    }
}

export const login = async (nameOrEmail: string, password: string): Promise<IToken> => {
    try {
        const response = await apiAuth.post<IToken>("/token", new URLSearchParams({ username: nameOrEmail, password: password }))
        return response.data
    } catch (error) {
        console.error(error)
        throw error?.response?.data?.detail || "Error al obtener el token de acceso"
    }
}