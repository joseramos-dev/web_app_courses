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
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pr-11 text-gray-900 focus:border-uned-accent focus:outline-none focus:ring-2 focus:ring-uned-accent/25 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
            />
            <button
                type="button"
                onClick={() => setVisibility(!visibility)}
                className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-gray-500 hover:text-uned-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-uned-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-slate-400 dark:hover:text-uned-accent dark:focus-visible:ring-offset-slate-900"
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