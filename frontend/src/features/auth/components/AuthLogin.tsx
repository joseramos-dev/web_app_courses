import { useState, type SubmitEventHandler } from "react"
import { useTranslation } from "react-i18next"
import { AuthTextInput } from "./AuthTextInput"
import { AuthPasswordInput } from "./AuthPasswordInput"
import { AuthModalHeader } from "./AuthModalHeader"
import { AuthSubmitButton } from "./AuthSubmitButton"
import { authLinkClassName } from "./authLinkClassName"
import { API_login } from "../api"
import { toast } from "react-hot-toast"
import type { AuthType } from "../../../shared/types/AuthTypes"
import { useAuth } from "../../../shared/provider/AuthContext"
import { useAsyncSubmit } from "../../../shared/hooks/useAsyncSubmit"

export const AuthLogin = (
    { changeAuthType }
        : { changeAuthType: (e: AuthType) => void }
) => {
    const { t } = useTranslation()
    const [nameOrEmail, setNameOrEmail] = useState("")
    const [password, setPassword] = useState("")

    const { login } = useAuth()
    const { loading, error, submit } = useAsyncSubmit(t("auth.errors.loginFailed"))

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault()
        await submit(async () => {
            const { token, user } = await API_login(nameOrEmail, password)
            login(user, token)
            toast.success(t("auth.toast.loginSuccess"))
            changeAuthType(null)
        })
    }

    return (
        <form className="flex flex-col gap-4 " onSubmit={handleSubmit}>
            <AuthModalHeader title={t("auth.form.loginTitle")} onClose={() => changeAuthType(null)} />
            <AuthTextInput label={t("auth.form.nameOrEmail")} text={nameOrEmail} setText={setNameOrEmail} />
            <AuthPasswordInput label={t("auth.form.password")} text={password} setText={setPassword} />
            <button
                type="button"
                className="text-sm text-left text-blue-500 hover:text-blue-700 dark:text-uned-primary dark:hover:text-uned-accent"
                onClick={() => changeAuthType("ForgotPassword")}
            >
                {t("auth.form.forgotPasswordLink")}
            </button>
            <AuthSubmitButton loading={loading} label={t("auth.form.submit")} />
            <TextRegister changeAuthType={() => changeAuthType("Register")} />
            {error && (
                <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            )}
        </form>
    )
}

const TextRegister = (
    { changeAuthType }
        : { changeAuthType: () => void }
) => {
    const { t } = useTranslation()
    return (
        <p className="text-sm text-gray-500 dark:text-slate-400">
            {t("auth.form.noAccount")}{" "}
            <button className={authLinkClassName()} type="button" onClick={changeAuthType}>
                {t("auth.form.registerHere")}
            </button>
        </p>
    )
}
