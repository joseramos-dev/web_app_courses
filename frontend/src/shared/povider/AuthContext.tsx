import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import type { IUser } from "../interfaces/IUser";
import type { IAuthContext } from "../interfaces/IAuthContext";
import type { IToken } from "../interfaces/IToken";
import { api } from "../api/api";

const AuthContext = createContext<IAuthContext | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<IUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();
    // Initialize auth from localStorage on mount
    useEffect(() => {
        const savedUser = localStorage.getItem("user");
        const savedToken = localStorage.getItem("token");

        if (savedUser && savedToken) {
            try {
                const parsedUser = JSON.parse(savedUser);
                setUser(parsedUser);
                // Set the token in the axios instance
                api.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
            } catch (error) {
                console.error("Failed to restore auth from storage:", error);
                localStorage.removeItem("user");
                localStorage.removeItem("token");
            }
        }
        setIsLoading(false);
    }, []);

    const login = (user: IUser, token: IToken) => {
        console.log(`[AuthProvider::login] - user is: ${user}`);
        setUser(user);
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("token", token.access_token);
        api.defaults.headers.common["Authorization"] = `Bearer ${token.access_token}`;
        navigate(`/`);
    }

    const logout = () => {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        delete api.defaults.headers.common["Authorization"];
        navigate(`/`);
    };

    const logoutRef = useRef(logout);
    logoutRef.current = logout;

    // Interceptor de errores para manejar el logout cuando la sesión expira
    useEffect(() => {
        const interceptorId = api.interceptors.response.use(
            (response) => response,
            (error) => {
                if (
                    axios.isAxiosError(error) &&
                    error.response?.status === 401 &&
                    error.response.data?.detail !== "Invalid current password"
                ) {
                    toast.error("Tu sesión ha expirado. Vuelve a iniciar sesión.");
                    logoutRef.current();
                }
                return Promise.reject(error);
            },
        );

        return () => {
            api.interceptors.response.eject(interceptorId);
        };
    }, []);

    const updateUser = (next: IUser) => {
        setUser(next);
        localStorage.setItem("user", JSON.stringify(next));
    };

    const isAdmin = () => {
        return user?.role == "admin"
    }

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading, isAdmin, updateUser }}>
            {children}
        </AuthContext.Provider>
    )

}

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}