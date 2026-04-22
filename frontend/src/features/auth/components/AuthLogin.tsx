import { useState } from "react"
import { AuthTextInput } from "./AuthTextInput"
import { AuthPasswordInput } from "./AuthPasswordInput"
import { login } from "../api"
import type { IToken } from "../../../shared/interfaces/IToken"
import { toast } from "react-hot-toast"
import { useNavigate } from "react-router-dom"

export const AuthLogin = (
    { changeAuthType }
        : { changeAuthType: () => void }
) => {
    const [nameOrEmail, setNameOrEmail] = useState("")
    const [password, setPassword] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { access_token }: IToken = await login(nameOrEmail, password)
            localStorage.setItem("token", access_token)
            toast.success("Login successful")
            navigate("/courses", { replace: true })
        } catch (error) {
            setLoading(false)
            setError(error as string || "Error al iniciar sesión")
        }
    }

    return (
        <form className="flex flex-col gap-4 " onSubmit={handleSubmit}>
            <h1 className="text-4xl font-bold">Login</h1>
            <AuthTextInput label={"Name or email"} text={nameOrEmail} setText={setNameOrEmail} />
            <AuthPasswordInput label={"Password"} text={password} setText={setPassword} />
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
            >
                {loading ? "Loading..." : "Submit"}
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
            <p className="text-sm text-gray-500">You don't have an account? <button className="text-sm text-blue-500 hover:text-blue-700" onClick={changeAuthType}> register here </button></p>
    )
}
