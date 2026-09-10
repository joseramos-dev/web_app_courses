import { useState, type SubmitEventHandler } from "react"
import { useTranslation } from "react-i18next"
import { AuthTextInput } from "./AuthTextInput"
import { API_forgotPassword } from "../api"
import { XIcon } from "lucide-react"
import type { AuthType } from "../../../shared/types/AuthTypes"

export const AuthForgotPassword = (
    { changeAuthType }
        : { changeAuthType: (e: AuthType) => void }
) => {
    const { t } = useTranslation()
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [sent, setSent] = useState(false)

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault()
        if (!email.includes("@")) {
            setError(t("auth.errors.invalidEmail"))
            return
        }
        setLoading(true)
        setError("")
        try {
            await API_forgotPassword(email)
            setSent(true)
        } catch (err) {
            setError(err as string || t("auth.errors.forgotFailed"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-row gap-4 justify-between">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">
                    {t("auth.form.forgotPasswordTitle")}
                </h1>
                <button
                    className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                    type="button"
                    onClick={() => changeAuthType(null)}
                >
                    <XIcon className="w-8 h-8" />
                </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">
                {t("auth.form.forgotPasswordDescription")}
            </p>
            {sent ? (
                <p className="text-sm text-green-600 dark:text-uned-primary">
                    {t("auth.form.forgotPasswordSent")}
                </p>
            ) : (
                <AuthTextInput label={t("auth.form.email")} text={email} setText={setEmail} />
            )}
            {!sent && (
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-blue-500 py-2 text-white transition hover:bg-blue-600 disabled:opacity-50 dark:bg-uned-primary dark:text-slate-900 dark:hover:bg-uned-accent"
                >
                    {loading ? t("common.loading") : t("auth.form.sendResetLink")}
                </button>
            )}
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
