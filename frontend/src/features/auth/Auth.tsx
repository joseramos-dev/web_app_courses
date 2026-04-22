import { useState, type ReactNode } from "react"
import { AuthLogin } from "./components/AuthLogin";
import { AuthRegister } from "./components/AuthRegister";

type AuthType = "Login" | "Register";

export const Auth = () => {

    const [authType, setAuthType] = useState<AuthType>("Login")

    const changeAuthType = () => {
        setAuthType(authType == "Login" ? "Register" : "Login")
    }

    return (
        <div className="w-full h-screen bg-blue-300 flex items-center justify-center">
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



export const AuxCard = ({ children }: { children: ReactNode }) => {
    return (
        <div className="w-120 p-14 bg-gray-200 shadow-2xl color-blue-500 rounded-t-4xl">
            {children}
        </div>
    )
}




