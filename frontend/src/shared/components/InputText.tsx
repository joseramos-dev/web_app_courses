

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
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    )
}