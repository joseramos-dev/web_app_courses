import { useState } from "react"
import { AuthTextInput } from "./AuthTextInput"
import { AuthPasswordInput } from "./AuthPasswordInput"
import { register } from "../api"
import type { UserRoles } from "../../../shared/types/UserRoles"
import toast from "react-hot-toast"

const roles: UserRoles[] = ["student", "instructor"]

export const AuthRegister = (
    { changeAuthType }
        : { changeAuthType: () => void }
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
            await register(name, email, password, role)
            setLoading(false)
            
            toast.success("User registered successfully")
            changeAuthType()
        } catch (error) {
            toast.error(error as string || "Error al registrar el usuario")
            setLoading(false)
            setError(error as string)
        }
    }

    return (
        <form className="flex flex-col gap-4 " onSubmit={handleSubmit}>
            <h1 className="text-4xl font-bold">Register</h1>
            <AuthTextInput label={"name"} text={name} setText={setName} />
            <AuthTextInput label={"email"} text={email} setText={setEmail} />
            <AuthPasswordInput label={"Password"} text={password} setText={setPassword} />
            <AuthPasswordInput label={"Confirmar contraseña"} text={confirmPassword} setText={setConfirmPassword} />
            <AuthRoleSelect role={role} setRole={setRole} />
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
                {loading ? "Cargando..." : "Iniciar sesión"}
            </button>
            <TextRegister changeAuthType={changeAuthType} />
            {error && (
                <p className="text-red-500 text-sm">{error}</p>
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
            <p className="text-sm text-gray-500">You  have an account? <button className="text-sm text-blue-500 hover:text-blue-700" onClick={changeAuthType}> Loging here </button></p>
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
            <p>Role</p>
            <select value={role} onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                {roles.map((r) => (
                    <option key={r} value={r}>
                        {r}
                    </option>
                ))}
            </select>
        </div>
    )
}