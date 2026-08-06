import { useState } from "react"
import { useTranslation } from "react-i18next"
import { AuthTextInput } from "./AuthTextInput"
import { AuthPasswordInput } from "./AuthPasswordInput"
import { API_register } from "../api"
import type { UserRoles } from "../../../shared/types/UserRoles"
import toast from "react-hot-toast"
import type { AuthType } from "../../../shared/types/AuthTypes"
import { XIcon } from "lucide-react"
import type { TFunction } from "i18next"

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
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setError(t("auth.errors.passwordMismatch"))
            return
        }
        if (name.length < 3) {
            setError(t("auth.errors.nameTooShort"))
            return
        }
        if (!email.includes("@")) {
            setError(t("auth.errors.invalidEmail"))
            return
        }
        setLoading(true)
        setError("")
        try {
            await API_register(name, email, password, role)
            setLoading(false)
            toast.success(t("auth.toast.registerSuccess"))
            changeAuthType("Login")
        } catch (error) {
            setLoading(false)
            setError(error as string || t("auth.errors.registerFailed"))
        }
    }

    return (
        <form className="flex flex-col gap-4 " onSubmit={handleSubmit}>
            <div className="flex flex-row gap-4 justify-between">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">{t("auth.form.registerTitle")}</h1>
                <button type="button" className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200" onClick={() => changeAuthType(null)}>
                    <XIcon className="w-8 h-8" />
                </button>
            </div>
            <AuthTextInput label={t("auth.form.name")} text={name} setText={setName} />
            <AuthTextInput label={t("auth.form.email")} text={email} setText={setEmail} />
            <AuthPasswordInput label={t("auth.form.password")} text={password} setText={setPassword} />
            <AuthPasswordInput label={t("auth.form.confirmPassword")} text={confirmPassword} setText={setConfirmPassword} />
            <AuthRoleSelect role={role} setRole={setRole} t={t} />
            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-500 py-2 text-white transition hover:bg-blue-600 disabled:opacity-50 dark:bg-uned-primary dark:text-slate-900 dark:hover:bg-uned-accent"
            >
                {loading ? t("common.loading") : t("auth.form.submit")}
            </button>
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
            <button type="button" className="text-sm text-blue-500 hover:text-blue-700 dark:text-uned-primary dark:hover:text-uned-accent" onClick={changeAuthType}>
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
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-uned-primary">
                {roles.map((r) => (
                    <option key={r} value={r}>
                        {t(ROLE_LABEL_KEY[r])}
                    </option>
                ))}
            </select>
        </div>
    )
}
