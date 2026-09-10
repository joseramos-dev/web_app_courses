import { AuthLogin } from "./components/AuthLogin";
import { AuthRegister } from "./components/AuthRegister";
import { AuthForgotPassword } from "./components/AuthForgotPassword";
import { AuthResetPassword } from "./components/AuthResetPassword";
import type { AuthType } from "../../shared/types/AuthTypes";
import type { ReactNode } from "react";
import { useAuth } from "../../shared/provider/AuthContext";

export const Auth = (
    { authType = "Login", setAuthType, resetToken = "" }
        : { authType?: AuthType, setAuthType: (authType: AuthType) => void, resetToken?: string }
) => {
    const { user } = useAuth();

    const changeAuthType = (e: AuthType) => {
        setAuthType(e)
    }

    if (user) { setAuthType(null) }

    const renderForm = () => {
        switch (authType) {
            case "Login":
                return <AuthLogin changeAuthType={changeAuthType} />;
            case "Register":
                return <AuthRegister changeAuthType={changeAuthType} />;
            case "ForgotPassword":
                return <AuthForgotPassword changeAuthType={changeAuthType} />;
            case "ResetPassword":
                return (
                    <AuthResetPassword
                        changeAuthType={changeAuthType}
                        resetToken={resetToken}
                    />
                );
            default:
                return <AuthLogin changeAuthType={changeAuthType} />;
        }
    };

    return (
        <div
            onClick={() => setAuthType(null)}
            className="fixed inset-0 backdrop-blur-xs flex items-center justify-center z-50">
            <AuxCard>
                {renderForm()}
            </AuxCard>
        </div>
    )
}



/** Modal card. `sizeClassName` lets wider dialogs (e.g. the preferences
 *  onboarding, which lays out six dropdowns in two columns) reuse this shell. */
export const AuxCard = (
    { children, sizeClassName = "w-120 p-12" }
        : { children: ReactNode, sizeClassName?: string }
) => {
    return (
        <div
            onClick={(e) => e.stopPropagation()}
            className={`rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-800 ${sizeClassName}`}>
            {children}
        </div>
    )
}



