/**
 * Parses a fetch Response as JSON, but fails with a clear, user-readable
 * error instead of a raw "Unexpected token < in JSON" crash when the server
 * (or a reverse proxy in front of it) returns an HTML error page instead of
 * JSON — which happens on gateway timeouts for slow/large uploads.
 */
export async function parseJsonResponse(res: Response): Promise<any> {
  const text = await res.text()

  try {
    return JSON.parse(text)
  } catch {
    if (!res.ok) {
      throw new Error(
        `Upload failed (server returned ${res.status}). This usually happens when the file is large and the connection is slow — try a smaller file or a faster connection, then try again.`
      )
    }
    throw new Error('Received an unexpected response from the server. Please try again.')
  }
}
