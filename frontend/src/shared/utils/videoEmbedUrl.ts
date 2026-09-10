/** Turns a video page URL into one that can actually live inside an <iframe>.
 *
 * YouTube and Vimeo refuse to be framed on their normal pages (X-Frame-Options),
 * so anything that is not converted to its /embed/ form renders as a blank or
 * broken player. Returning `null` for anything unrecognised is deliberate: the
 * caller then shows a plain link instead of framing a page that will be refused.
 *
 * The embed host is youtube-nocookie.com, which serves the same player without
 * writing tracking cookies until playback starts; browsers and extensions that
 * block third-party cookies leave it alone.
 */

const YOUTUBE_HOSTS = new Set([
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "music.youtube.com",
    "youtube-nocookie.com",
    "www.youtube-nocookie.com",
]);

// /embed/ID, /shorts/ID, /live/ID and the legacy /v/ID.
const YOUTUBE_PATH_ID = /^\/(?:embed|shorts|live|v)\/([^/?#]+)/;

function youtubeId(url: URL): string | null {
    if (url.hostname === "youtu.be") {
        return url.pathname.split("/")[1] || null;
    }
    if (!YOUTUBE_HOSTS.has(url.hostname)) return null;
    if (url.pathname === "/watch") return url.searchParams.get("v");
    return url.pathname.match(YOUTUBE_PATH_ID)?.[1] ?? null;
}

/** Reads the `t`/`start` parameter of a share link: "90", "1m30s", "1h2m3s". */
function startSeconds(url: URL): number | null {
    const raw = url.searchParams.get("start") ?? url.searchParams.get("t");
    if (!raw) return null;
    if (/^\d+$/.test(raw)) return Number(raw);
    const parts = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
    if (!parts) return null;
    const [, h, m, s] = parts;
    const total = Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
    return total > 0 ? total : null;
}

function vimeoId(url: URL): string | null {
    if (url.hostname === "vimeo.com" || url.hostname === "www.vimeo.com") {
        return url.pathname.split("/")[1] || null;
    }
    if (url.hostname === "player.vimeo.com") {
        return url.pathname.match(/^\/video\/([^/?#]+)/)?.[1] ?? null;
    }
    return null;
}

export function toEmbedUrl(rawUrl: string): string | null {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return null;
    }

    const youtube = youtubeId(url);
    if (youtube) {
        const embed = new URL(`https://www.youtube-nocookie.com/embed/${youtube}`);
        const start = startSeconds(url);
        if (start) embed.searchParams.set("start", String(start));
        return embed.toString();
    }

    const vimeo = vimeoId(url);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo}`;

    return null;
}

export function isVideoEmbedUrl(href: string | undefined): boolean {
    return !!href && toEmbedUrl(href) !== null;
}
