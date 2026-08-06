import { useState, type SubmitEventHandler } from "react"
import { useTranslation } from "react-i18next"
import { AuthTextInput } from "./AuthTextInput"
import { AuthPasswordInput } from "./AuthPasswordInput"
import { API_login } from "../api"
import { toast } from "react-hot-toast"
import { XIcon } from "lucide-react"
import type { AuthType } from "../../../shared/types/AuthTypes"
import { useAuth } from "../../../shared/povider/AuthContext"

export const AuthLogin = (
    { changeAuthType }
        : { changeAuthType: (e: AuthType) => void }
) => {
    const { t } = useTranslation()
    const [nameOrEmail, setNameOrEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const { login } = useAuth()

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { token, user } = await API_login(nameOrEmail, password)
            login(user, token)
            toast.success(t("auth.toast.loginSuccess"))
            changeAuthType(null)
        } catch (error) {
            setError(error as string || t("auth.errors.loginFailed"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <form className="flex flex-col gap-4 " onSubmit={handleSubmit}>
            <div className="flex flex-row gap-4 justify-between">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">{t("auth.form.loginTitle")}</h1>
                <button className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200" type="button" onClick={() => changeAuthType(null)}>
                    <XIcon className="w-8 h-8" />
                </button>
            </div>
            <AuthTextInput label={t("auth.form.nameOrEmail")} text={nameOrEmail} setText={setNameOrEmail} />
            <AuthPasswordInput label={t("auth.form.password")} text={password} setText={setPassword} />
            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-500 py-2 text-white transition hover:bg-blue-600 disabled:opacity-50 dark:bg-uned-primary dark:text-slate-900 dark:hover:bg-uned-accent"
            >
                {loading ? t("common.loading") : t("auth.form.submit")}
            </button>
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
            <button className="text-sm text-blue-500 hover:text-blue-700 dark:text-uned-primary dark:hover:text-uned-accent" type="button" onClick={changeAuthType}>
                {t("auth.form.registerHere")}
            </button>
        </p>
    )
}
