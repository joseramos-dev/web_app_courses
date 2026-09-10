import { type SubmitEventHandler } from "react"
import { useTranslation } from "react-i18next"
import { AuthPasswordInput } from "./AuthPasswordInput"
import { AuthModalHeader } from "./AuthModalHeader"
import { AuthSubmitButton } from "./AuthSubmitButton"
import { authLinkClassName } from "./authLinkClassName"
import { API_resetPassword } from "../api"
import type { AuthType } from "../../../shared/types/AuthTypes"
import toast from "react-hot-toast"
import { useState } from "react"
import { useAsyncSubmit } from "../../../shared/hooks/useAsyncSubmit"
import { validateResetPasswordForm } from "../validation"

export const AuthResetPassword = (
    { changeAuthType, resetToken }
        : { changeAuthType: (e: AuthType) => void; resetToken: string }
) => {
    const { t } = useTranslation()
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const { loading, error, setError, submit } = useAsyncSubmit(t("auth.errors.resetFailed"))

    const handleSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault()
        const validationKey = validateResetPasswordForm({ password, confirmPassword })
        if (validationKey) {
            setError(t(validationKey))
            return
        }
        await submit(async () => {
            await API_resetPassword(resetToken, password)
            toast.success(t("auth.toast.resetSuccess"))
            changeAuthType("Login")
        })
    }

    return (
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <AuthModalHeader title={t("auth.form.resetPasswordTitle")} onClose={() => changeAuthType(null)} />
            <AuthPasswordInput label={t("auth.form.password")} text={password} setText={setPassword} />
            <AuthPasswordInput
                label={t("auth.form.confirmPassword")}
                text={confirmPassword}
                setText={setConfirmPassword}
            />
            <AuthSubmitButton loading={loading} label={t("auth.form.resetPasswordSubmit")} />
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
