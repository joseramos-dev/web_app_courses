import { XIcon } from "lucide-react"

type Props = {
    title: string
    onClose: () => void
}

export const AuthModalHeader = ({ title, onClose }: Props) => (
    <div className="flex flex-row gap-4 justify-between">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-slate-100">{title}</h1>
        <button
            type="button"
            className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
            onClick={onClose}
        >
            <XIcon className="w-8 h-8" />
        </button>
    </div>
)
