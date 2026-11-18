/**
 * Converts a YouTube or Vimeo watch/share URL into an embeddable player URL.
 * Returns null when the URL is empty or not a supported host.
 */
export function getYoutubeOrVimeoEmbedUrl(
  videoUrl: string | null | undefined,
): string | null {
  if (!videoUrl || typeof videoUrl !== 'string') return null
  const trimmed = videoUrl.trim()
  if (!trimmed) return null

  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
  )
  if (ytMatch?.[1]) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`
  }

  const vimeoMatch = trimmed.match(
    /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/,
  )
  if (vimeoMatch?.[1]) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  }

  // Already an embed URL
  if (
    /youtube\.com\/embed\//.test(trimmed) ||
    /player\.vimeo\.com\/video\//.test(trimmed)
  ) {
    return trimmed
  }

  return null
}

export function isYoutubeOrVimeoUrl(videoUrl: string | null | undefined): boolean {
  return !!getYoutubeOrVimeoEmbedUrl(videoUrl)
}


export function getYoutubePreviewUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value.trim())
    if (!['https:', 'http:'].includes(url.protocol)) return null
    const host = url.hostname.toLowerCase()
    let id: string | null = null
    if (host === 'youtu.be') id = url.pathname.slice(1)
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'www.youtube-nocookie.com'].includes(host)) {
      id = url.pathname === '/watch' ? url.searchParams.get('v') :
        /^\/(embed|shorts|live)\/([^/]+)$/.exec(url.pathname)?.[2] ?? null
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? 'https://www.youtube.com/watch?v=' + id : null
  } catch {
    return null
  }
}
