export interface IToken {
    /** Kept in memory only. The refresh token never reaches JavaScript: it
     *  lives in an HttpOnly cookie managed by the backend. */
    access_token: string;
    token_type: "bearer";
}
