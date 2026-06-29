import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import type { IUser } from "../interfaces/IUser";
import type { IAuthContext } from "../interfaces/IAuthContext";
import type { IToken } from "../interfaces/IToken";
import { registerAuthHandlers, setAuthHeader } from "../api/api";
import { API_logoutToken, API_refreshToken } from "../../features/auth/api";

const AuthContext = createContext<IAuthContext | null>(null);

const REFRESH_TOKEN_KEY = "refresh_token";
const ACCESS_TOKEN_KEY = "token";
const USER_KEY = "user";

function persistSession(user: IUser, token: IToken) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(ACCESS_TOKEN_KEY, token.access_token);
    localStorage.setItem(REFRESH_TOKEN_KEY, token.refresh_token);
    setAuthHeader(token.access_token);
}

function clearSessionStorage() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setAuthHeader(null);
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<IUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const userRef = useRef(user);
    userRef.current = user;

    useEffect(() => {
        const savedUser = localStorage.getItem(USER_KEY);
        const savedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        const savedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);

        if (savedUser && savedToken && savedRefresh) {
            try {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
                setAuthHeader(savedToken);
            } catch (error) {
                console.error("Failed to restore auth from storage:", error);
                clearSessionStorage();
            }
        }
        setIsLoading(false);
    }, []);

    const performLogout = (showToast = true) => {
        if (showToast) {
            toast.error("Tu sesión ha expirado. Vuelve a iniciar sesión.");
        }
        setUser(null);
        clearSessionStorage();
        navigate(`/`);
    };

    const logoutRef = useRef(performLogout);
    logoutRef.current = performLogout;

    useEffect(() => {
        registerAuthHandlers(
            async () => {
                const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
                if (!refreshToken) return null;
                try {
                    const token = await API_refreshToken(refreshToken);
                    localStorage.setItem(ACCESS_TOKEN_KEY, token.access_token);
                    localStorage.setItem(REFRESH_TOKEN_KEY, token.refresh_token);
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

    const login = (nextUser: IUser, token: IToken) => {
        setUser(nextUser);
        persistSession(nextUser, token);
        navigate(`/`);
    };

    const logout = async () => {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        if (refreshToken) {
            await API_logoutToken(refreshToken);
        }
        setUser(null);
        clearSessionStorage();
        navigate(`/`);
    };

    const updateUser = (next: IUser) => {
        setUser(next);
        localStorage.setItem(USER_KEY, JSON.stringify(next));
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
