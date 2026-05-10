import { InputPassword } from "../../../shared/components/InputPassword"

export const AuthPasswordInput = (
    { label, text, setText }
        : { label:string, text: string, setText: (e: string) => void }) => {
    return (
        <div className="w-full flex flex-col">
            <p className="text-gray-900 dark:text-slate-200">{label}</p>
            <InputPassword text={text} setText={setText} />
        </div>
    )
}