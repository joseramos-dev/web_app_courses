import type { IToken } from "./IToken";
import type { IUser } from "./IUser";

export interface IAuthResponse {
    user: IUser;
    token: IToken;
}