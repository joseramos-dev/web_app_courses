import type { UserRoles } from "../../shared/types/UserRoles";
export interface IUserCreate {
    name: string;
    email: string;
    password: string;
    role: UserRoles;
}