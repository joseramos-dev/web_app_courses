

export const InputText = (
    { text, setText }
        : { text: string, setText: (e: string) => void }) => {
    return (
        <input
            maxLength={70}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:ring-uned-primary"
        />
    )
}