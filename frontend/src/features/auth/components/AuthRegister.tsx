import { useState } from "react"
import { AuthTextInput } from "./AuthTextInput"
import { AuthPasswordInput } from "./AuthPasswordInput"
import { API_register } from "../api"
import type { UserRoles } from "../../../shared/types/UserRoles"
import toast from "react-hot-toast"
import type { AuthType } from "../../../shared/types/AuthTypes"
import { XIcon } from "lucide-react"

const roles: UserRoles[] = ["student", "instructor"]

export const AuthRegister = (
    { changeAuthType }
        : { changeAuthType: (e:AuthType) => void }
) => {
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
            setError("Passwords do not match")
            return
        }
        if (name.length < 3) {
            setError("Name must be at least 3 characters")
            return
        }
        if (!email.includes("@")) {
            setError("Email must be a valid email")
            return
        }
        setLoading(true)
        setError("")
        try {
            await API_register(name, email, password, role)
            setLoading(false)
            toast.success("User registered successfully")
            changeAuthType("Login")
        } catch (error) {
            setLoading(false)
            setError(error as string || "Error al registrar el usuario")
        }
    }

    return (
        <form className="flex flex-col gap-4 " onSubmit={handleSubmit}>
            <div className="flex flex-row gap-4 justify-between">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">Register</h1>
                <button type="button" className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200" onClick={() => changeAuthType(null)}>
                    <XIcon className="w-8 h-8" />
                </button>
            </div>
            <AuthTextInput label={"name"} text={name} setText={setName} />
            <AuthTextInput label={"email"} text={email} setText={setEmail} />
            <AuthPasswordInput label={"Password"} text={password} setText={setPassword} />
            <AuthPasswordInput label={"Confirmar contraseña"} text={confirmPassword} setText={setConfirmPassword} />
            <AuthRoleSelect role={role} setRole={setRole} />
            <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-blue-500 py-2 text-white transition hover:bg-blue-600 disabled:opacity-50 dark:bg-uned-primary dark:text-slate-900 dark:hover:bg-uned-accent"
            >
                {loading ? "Cargando..." : "Iniciar sesión"}
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
    return (
        <>
            <p className="text-sm text-gray-500 dark:text-slate-400">You  have an account? <button type="button" className="text-sm text-blue-500 hover:text-blue-700 dark:text-uned-primary dark:hover:text-uned-accent" onClick={changeAuthType}> Loging here </button></p>
        </>

    )
}

const AuthRoleSelect = (
    { role, setRole }
        : { role: UserRoles, setRole: (role: UserRoles) => void }
) => {

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setRole(e.target.value as UserRoles);
    };

    return (
        <div>
            <p className="text-gray-900 dark:text-slate-200">Role</p>
            <select value={role} onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-uned-primary">
                {roles.map((r) => (
                    <option key={r} value={r}>
                        {r}
                    </option>
                ))}
            </select>
        </div>
    )
}