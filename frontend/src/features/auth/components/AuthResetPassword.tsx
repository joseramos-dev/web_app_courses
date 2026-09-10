import { useState, type SubmitEventHandler } from "react"
import { useTranslation } from "react-i18next"
import { AuthPasswordInput } from "./AuthPasswordInput"
import { API_resetPassword } from "../api"
import { XIcon } from "lucide-react"
import type { AuthType } from "../../../shared/types/AuthTypes"
import toast from "react-hot-toast"

export const AuthResetPassword = (
    { changeAuthType, resetToken }
        : { changeAuthType: (e: AuthType) => void; resetToken: string }
) => {
    const { t } = useTranslation()
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError(t("auth.errors.passwordMismatch"))
            return
        }
        if (password.length < 8) {
            setError(t("auth.errors.passwordTooShort"))
            return
        }
        setLoading(true)
        setError("")
        try {
            await API_resetPassword(resetToken, password)
            toast.success(t("auth.toast.resetSuccess"))
            changeAuthType("Login")
        } catch (err) {
            setError(err as string || t("auth.errors.resetFailed"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-row gap-4 justify-between">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">
                    {t("auth.form.resetPasswordTitle")}
                </h1>
                <button
                    className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                    type="button"
                    onClick={() => changeAuthType(null)}
                >
                    <XIcon className="w-8 h-8" />
                </button>
            </div>
            <AuthPasswordInput label={t("auth.form.password")} text={password} setText={setPassword} />
            <AuthPasswordInput
                label={t("auth.form.confirmPassword")}
                text={confirmPassword}
                setText={setConfirmPassword}
            />
            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-500 py-2 text-white transition hover:bg-blue-600 disabled:opacity-50 dark:bg-uned-primary dark:text-slate-900 dark:hover:bg-uned-accent"
            >
                {loading ? t("common.loading") : t("auth.form.resetPasswordSubmit")}
            </button>
            <button
                type="button"
                className="text-sm text-blue-500 hover:text-blue-700 dark:text-uned-primary dark:hover:text-uned-accent"
                onClick={() => changeAuthType("Login")}
            >
                {t("auth.form.backToLogin")}
            </button>
            {error && (
                <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            )}
        </form>
    )
}
