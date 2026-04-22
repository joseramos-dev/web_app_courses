import type { UserRoles } from "../types/UserRoles";

export interface IUser {
    id: number | null;
    name: string;
    email: string;
    role: UserRoles;
    time_creation: Date | null;
}