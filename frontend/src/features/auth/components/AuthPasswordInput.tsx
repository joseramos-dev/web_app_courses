import { InputPassword } from "../../../shared/components/InputPassword"

export const AuthPasswordInput = (
    { label, text, setText }
        : { label:string, text: string, setText: (e: string) => void }) => {
    return (
        <div className="w-full flex flex-col">
            <p>{label}</p>
            <InputPassword text={text} setText={setText} />
        </div>
    )
}