import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import type { IUser } from "../interfaces/IUser";
import type { IAuthContext } from "../interfaces/IAuthContext";
import type { IToken } from "../interfaces/IToken";
import { refreshAccessTokenOnce, registerAuthHandlers, setAuthHeader } from "../api/api";
import { API_getMe, API_logoutToken, API_refreshToken } from "../../features/auth/api";
import {
    invalidateRecommendationsCache,
    pruneStaleRecommendationsCache,
} from "../utils/recommendationsCache";

const AuthContext = createContext<IAuthContext | null>(null);

/**
 * No token is ever persisted by JavaScript.
 *
 * The refresh token lives in an HttpOnly cookie that only the backend can read
 * or write, so an XSS cannot steal a long-lived session. The access token is
 * held in memory by the Axios layer and is gone on reload; the session is
 * restored on boot by exchanging the cookie for a new one.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<IUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const userRef = useRef(user);
    userRef.current = user;

    const performLogout = (showToast = true) => {
        if (showToast) {
            toast.error("Tu sesión ha expirado. Vuelve a iniciar sesión.");
        }
        setUser(null);
        setAuthHeader(null);
        invalidateRecommendationsCache();
        navigate(`/`);
    };

    const logoutRef = useRef(performLogout);
    logoutRef.current = performLogout;

    useEffect(() => {
        registerAuthHandlers(
            async () => {
                try {
                    const token = await API_refreshToken();
                    setAuthHeader(token.access_token);
                    return token.access_token;
                } catch {
                    return null;
                }
            },
            () => {
                if (userRef.current) {
                    logoutRef.current(true);
                }
            },
        );
    }, []);

    // Runs after the handlers above are registered, so the boot refresh goes
    // through the same shared promise the interceptor uses. Refreshing twice
    // concurrently would revoke the cookie the second call is still using.
    useEffect(() => {
        let cancelled = false;

        const restoreSession = async () => {
            try {
                const accessToken = await refreshAccessTokenOnce();
                if (!accessToken) throw new Error("no session");
                const me = await API_getMe();
                if (cancelled) return;
                setUser(me);
                pruneStaleRecommendationsCache(me.id);
            } catch {
                // No valid refresh cookie: the visitor is simply anonymous.
                if (!cancelled) {
                    setAuthHeader(null);
                    invalidateRecommendationsCache();
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void restoreSession();
        return () => {
            cancelled = true;
        };
    }, []);

    const login = (nextUser: IUser, token: IToken) => {
        invalidateRecommendationsCache();
        setUser(nextUser);
        setAuthHeader(token.access_token);
        navigate(`/`);
    };

    const logout = async () => {
        await API_logoutToken();
        setUser(null);
        setAuthHeader(null);
        invalidateRecommendationsCache();
        navigate(`/`);
    };

    const updateUser = (next: IUser) => {
        setUser(next);
    };

    const isAdmin = () => {
        return user?.role == "admin";
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading, isAdmin, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
};
