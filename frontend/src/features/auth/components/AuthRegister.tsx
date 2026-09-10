import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AuthTextInput } from "./AuthTextInput"
import { AuthPasswordInput } from "./AuthPasswordInput"
import { AuthModalHeader } from "./AuthModalHeader"
import { AuthSubmitButton } from "./AuthSubmitButton"
import { authLinkClassName } from "./authLinkClassName"
import { API_register } from "../api"
import type { UserRoles } from "../../../shared/types/UserRoles"
import toast from "react-hot-toast"
import type { AuthType } from "../../../shared/types/AuthTypes"
import type { TFunction } from "i18next"
import { useAsyncSubmit } from "../../../shared/hooks/useAsyncSubmit"
import { validateRegisterForm } from "../validation"

const roles: UserRoles[] = ["student", "instructor"]

export const AuthRegister = (
    { changeAuthType }
        : { changeAuthType: (e:AuthType) => void }
) => {
    const { t } = useTranslation()
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [role, setRole] = useState<UserRoles>("student");
    const { loading, error, setError, submit } = useAsyncSubmit(t("auth.errors.registerFailed"))

    const handleSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault()
        const validationKey = validateRegisterForm({ name, email, password, confirmPassword })
        if (validationKey) {
            setError(t(validationKey))
            return
        }
        await submit(async () => {
            await API_register(name, email, password, role)
            toast.success(t("auth.toast.registerSuccess"))
            changeAuthType("Login")
        })
    }

    return (
        <form className="flex flex-col gap-4 " onSubmit={handleSubmit}>
            <AuthModalHeader title={t("auth.form.registerTitle")} onClose={() => changeAuthType(null)} />
            <AuthTextInput label={t("auth.form.name")} text={name} setText={setName} />
            <AuthTextInput label={t("auth.form.email")} text={email} setText={setEmail} />
            <AuthPasswordInput label={t("auth.form.password")} text={password} setText={setPassword} />
            <AuthPasswordInput label={t("auth.form.confirmPassword")} text={confirmPassword} setText={setConfirmPassword} />
            <AuthRoleSelect role={role} setRole={setRole} t={t} />
            <AuthSubmitButton loading={loading} label={t("auth.form.submit")} />
            <TextRegister changeAuthType={() => changeAuthType("Login")} />
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
            {t("auth.form.hasAccount")}{" "}
            <button type="button" className={authLinkClassName()} onClick={changeAuthType}>
                {t("auth.form.loginHere")}
            </button>
        </p>
    )
}

const ROLE_LABEL_KEY: Record<UserRoles, string> = {
    student: "auth.role.student",
    instructor: "auth.role.instructor",
    admin: "auth.role.instructor",
}

const AuthRoleSelect = (
    { role, setRole, t }
        : { role: UserRoles, setRole: (role: UserRoles) => void, t: TFunction }
) => {

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setRole(e.target.value as UserRoles);
    };

    return (
        <div>
            <p className="text-gray-900 dark:text-slate-200">{t("auth.form.role")}</p>
            <select value={role} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:border-uned-accent focus:outline-none focus:ring-2 focus:ring-uned-accent/25 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100">
                {roles.map((r) => (
                    <option key={r} value={r}>
                        {t(ROLE_LABEL_KEY[r])}
                    </option>
                ))}
            </select>
        </div>
    )
}
