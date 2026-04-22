import { useState } from "react"
import { Eye, EyeOff } from 'lucide-react';


export const InputPassword = ({ text, setText }: { text: string, setText: (e: string) => void }) => {
    const [visibility, setVisibility] = useState(false)

    return (
        <div className="relative w-full">
            <input
                maxLength={70}
                type={visibility ? "text" : "password"}
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
                type="button"
                onClick={() => setVisibility(!visibility)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-blue-500"
            >
                {visibility ? (
                    <EyeOff className="h-5 w-5" />
                ) : (
                    <Eye className="h-5 w-5" />
                )}
            </button>
        </div>
    )
}