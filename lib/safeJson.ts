 
/**
 * Parses a fetch Response as JSON safely. Returns a readable error instead of
 * crashing with "Unexpected token <" or "Unexpected end of JSON input" when
 * a reverse proxy returns an HTML error page or an empty body.
 */
export async function parseJsonResponse(res: Response): Promise<any> {
  const text = await res.text();

  if (!text || !text.trim()) {
    throw new Error(
      res.ok
        ? 'Server returned an empty response. Please try again.'
        : `Server error (${res.status}). Please try again.`,
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    if (text.trimStart().startsWith('<')) {
      throw new Error(
        `Server error (${res.status}). The gateway returned an unexpected HTML page — please try again or contact support.`,
      );
    }
    throw new Error(
      `Unexpected server response (${res.status}). Please try again.`,
    );
  }
}
