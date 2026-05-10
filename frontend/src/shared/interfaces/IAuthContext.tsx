import type { IUser } from "./IUser";
import type { IToken } from "./IToken";

export interface IAuthContext {
    user: IUser | null;
    isLoading: boolean;
    login: (user: IUser, token: IToken) => void;
    logout: () => void;
    isAdmin: () => boolean;
    /** Replace current user (e.g. after PATCH /me). */
    updateUser: (user: IUser) => void;
}