import { InputText } from "../../../shared/components/InputText"


export const AuthTextInput = (
    { label, text, setText }
        : { label:string, text: string, setText: (e: string) => void }) => {
    return (
        <div className="w-full flex flex-col">
            <p>{label}</p>
            <InputText text={text} setText={setText} />
        </div>
    )
}