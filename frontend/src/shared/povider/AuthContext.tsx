import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { IUser } from "../interfaces/IUser";
import type { IAuthContext } from "../interfaces/IAuthContext";
import type { IToken } from "../interfaces/IToken";
import { api } from "../api/api";
import { useNavigate } from "react-router-dom";

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