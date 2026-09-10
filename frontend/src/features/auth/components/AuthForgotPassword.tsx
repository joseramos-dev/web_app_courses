import { useState, type SubmitEventHandler } from "react"
import { useTranslation } from "react-i18next"
import { AuthTextInput } from "./AuthTextInput"
import { AuthModalHeader } from "./AuthModalHeader"
import { AuthSubmitButton } from "./AuthSubmitButton"
import { authLinkClassName } from "./authLinkClassName"
import { API_forgotPassword } from "../api"
import type { AuthType } from "../../../shared/types/AuthTypes"
import { useAsyncSubmit } from "../../../shared/hooks/useAsyncSubmit"
import { validateForgotPasswordForm } from "../validation"

export const AuthForgotPassword = (
    { changeAuthType }
        : { changeAuthType: (e: AuthType) => void }
) => {
    const { t } = useTranslation()
    const [email, setEmail] = useState("")
    const [sent, setSent] = useState(false)
    const { loading, error, setError, submit } = useAsyncSubmit(t("auth.errors.forgotFailed"))

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault()
        const validationKey = validateForgotPasswordForm({ email })
        if (validationKey) {
            setError(t(validationKey))
            return
        }
        await submit(async () => {
            await API_forgotPassword(email)
            setSent(true)
        })
    }

    return (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <AuthModalHeader title={t("auth.form.forgotPasswordTitle")} onClose={() => changeAuthType(null)} />
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
                <AuthSubmitButton loading={loading} label={t("auth.form.sendResetLink")} />
            )}
            <button
                type="button"
                className={authLinkClassName()}
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
