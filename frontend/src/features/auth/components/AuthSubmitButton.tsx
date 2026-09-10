import { useTranslation } from "react-i18next"

type Props = {
    loading: boolean
    label: string
}

export const AuthSubmitButton = ({ loading, label }: Props) => {
    const { t } = useTranslation()
    return (
        <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-500 py-2 text-white transition hover:bg-blue-600 disabled:opacity-50 dark:bg-uned-primary dark:text-slate-900 dark:hover:bg-uned-accent"
        >
            {loading ? t("common.loading") : label}
        </button>
    )
}
