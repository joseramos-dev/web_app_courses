import { AuthLogin } from "./components/AuthLogin";
import { AuthRegister } from "./components/AuthRegister";
import type { AuthType } from "../../shared/types/AuthTypes";
import type { ReactNode } from "react";
import { useAuth } from "../../shared/povider/AuthContext";

export const Auth = (
    { authType = "Login", setAuthType }
        : { authType?: AuthType, setAuthType: (authType: AuthType) => void }
) => {
    const { user } = useAuth();

    const changeAuthType = (e: AuthType) => {
        setAuthType(e)
    }

    if (user) { setAuthType(null) }
    return (
        <div
            onClick={() => setAuthType(null)}
            className="fixed inset-0 backdrop-blur-xs flex items-center justify-center z-50">
            <AuxCard>
                {
                    authType == "Login" ?
                        <AuthLogin changeAuthType={changeAuthType} />
                        :
                        <AuthRegister changeAuthType={changeAuthType} />
                }

            </AuxCard>
        </div>
    )
}



export const AuxCard = (
    { children }
        : { children: ReactNode }
) => {
    return (
        <div
            onClick={(e) => e.stopPropagation()}
            className="w-120 rounded-2xl border border-gray-200 bg-white p-12 shadow-2xl dark:border-slate-600 dark:bg-slate-800">
            {children}
        </div>
    )
}




