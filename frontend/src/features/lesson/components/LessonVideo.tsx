function toEmbedUrl(rawUrl: string): string {
    try {
        const url = new URL(rawUrl);
        // YouTube watch URLs -> embed
        if (
            (url.hostname === "www.youtube.com" || url.hostname === "youtube.com") &&
            url.pathname === "/watch"
        ) {
            const id = url.searchParams.get("v");
            if (id) return `https://www.youtube.com/embed/${id}`;
        }
        // youtu.be short links
        if (url.hostname === "youtu.be") {
            const id = url.pathname.replace("/", "");
            if (id) return `https://www.youtube.com/embed/${id}`;
        }
        // Vimeo
        if (url.hostname === "vimeo.com") {
            const id = url.pathname.replace("/", "");
            if (id) return `https://player.vimeo.com/video/${id}`;
        }
        return rawUrl;
    } catch {
        return rawUrl;
    }
}

export function LessonVideo({ videoUrl }: { videoUrl: string | null | undefined }) {
    if (!videoUrl) {
        return (
            <div className="rounded-xl border border-dashed border-gray-300 bg-surface-muted p-6 text-sm text-gray-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400">
                Esta lección aún no tiene vídeo configurado.
            </div>
        );
    }

    const embed = toEmbedUrl(videoUrl);

    return (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-slate-600">
            <div className="aspect-video w-full">
                <iframe
                    src={embed}
                    title="Lesson video"
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        </div>
    );
}
