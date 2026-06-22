# 🔐 Canadian Nest School — Security & Content Protection

This document explains every security and content-protection layer built into the
Canadian Nest School platform: how it works, which files implement it, and — just as
importantly — **what it does NOT protect against**. Read the "Honest Limitations"
section before promising anything to clients.

---

## 1. Authentication & Authorization

| Layer | How it works | Where |
|---|---|---|
| **Password hashing** | Passwords stored with `bcrypt` (salted, 10 rounds). Never stored in plain text. | `lib/auth/auth.ts` |
| **JWT sessions** | Signed JSON Web Tokens (`student-token` / `payload-token` cookies), 2-hour expiry, signed with `PAYLOAD_SECRET`. | `lib/auth/auth.ts` |
| **Role-based access** | Three roles — `admin`, `instructor`, `student`. Admin/API routes verify the role before allowing writes. | `lib/db/models/User.ts`, admin API routes |
| **Course ownership** | An instructor can only create/edit lessons on courses they own. | `app/api/admin/lessons/route.ts` |
| **Enrollment gate** | The course player (`/watch`) redirects to login if not authenticated, and back to the sales page if the user has no `completed` enrollment. | `app/(app)/courses/[slug]/watch/page.tsx` |

---

## 2. Video Content Protection (DIY Secure Streaming)

Recorded lesson videos can be served two ways. The system auto-detects which,
based on the lesson's **Video Source** field:

- **`http(s)://…` →** treated as an external embed (YouTube / Vimeo / any platform). Plays in an iframe.
- **anything else (e.g. `videos/lesson-1.mp4`) →** treated as a **private Cloudflare R2 object key** and streamed through the secure pipeline below.

### Secure pipeline (for private R2 videos)

| Protection | What it stops | Where |
|---|---|---|
| **Authenticated streaming** | Login + enrollment required before any byte is served. | `lib/streamGuard.ts` |
| **Server-side byte proxy** | The browser plays from `canadian-nest-school.com/api/stream/<id>/play`. The **real R2 URL is fetched server-side and never reaches the browser / devtools**. | `app/api/stream/[lessonId]/play/route.ts`, `lib/stream.ts` |
| **Short-lived authorization** | The player must pass an authorize check (`/api/stream/<id>`) before playback. A copied `/play` URL is useless without the user's auth cookie (returns `401`). | `app/api/stream/[lessonId]/route.ts` |
| **Domain restriction** | Playback requests are rejected unless the `Origin`/`Referer` matches an allowed host (stops hotlinking / embedding on other sites). | `lib/stream.ts → isAllowedOrigin()` |
| **Concurrent-device limit** | Each browser gets a persistent device id; a user may stream on at most `STREAM_MAX_DEVICES` devices at once (anti account-sharing). | `lib/db/models/WatchSession.ts`, `lib/streamGuard.ts` |
| **Range / seek support** | The proxy honours HTTP `Range` requests, so seeking works without exposing the file. | `app/api/stream/[lessonId]/play/route.ts` |

**Net effect:** blocks link-sharing, direct download, hotlinking, and account-sharing,
and hides the storage URL — while still allowing YouTube/Vimeo embeds per lesson.

---

## 3. Client-Side Anti-Piracy Deterrents

Applied on the course player page (`/watch`). These **raise the bar / discourage**
casual piracy — they are deterrents, not guarantees (see Limitations).

Implemented in `components/CoursePlayerClient.tsx` and `components/SecureVideoPlayer.tsx`:

- **Floating watermark** — the student's email drifts across the video every few seconds, so leaked recordings are traceable.
- **Focus / tab-switch blackout** — the video is covered by a black "Screen Shield" overlay when the window loses focus or the tab is hidden.
- **PrintScreen detection** — triggers the blackout and overwrites the clipboard with a notice.
- **Screenshot-shortcut detection** — common OS screenshot key combos trigger the blackout.
- **DevTools blocking** — `F12`, `Ctrl+Shift+I/J/C`, `Ctrl+U` are blocked; a size-gap heuristic blacks out the video while DevTools is open.
- **Right-click & copy disabled** on the player page.
- **Mobile protection** — long-press save menu, multi-touch gestures, and drag-out are blocked; `user-select` / `touch-callout` disabled via CSS.
- **No-download player** — native `<video>` uses `controlsList="nodownload noplaybackrate"` and `disablePictureInPicture`.

---

## 4. Configuration

Required / relevant environment variables:

```env
# JWT signing secret (keep this secret!)
PAYLOAD_SECRET=...

# Cloudflare R2 (S3-compatible) — used for private video storage
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_BUCKET=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...

# Domain restriction — comma-separated list of allowed origins.
# Empty in local dev = no restriction. Falls back to NEXT_PUBLIC_SITE_URL.
ALLOWED_STREAM_ORIGINS=https://canadian-nest-school.com,https://www.canadian-nest-school.com

# Max simultaneous streaming devices per user (default 2)
STREAM_MAX_DEVICES=2
```

**Operational checklist**
1. Keep the **R2 bucket private** (disable public access) — signed/proxied access only.
2. Set `ALLOWED_STREAM_ORIGINS` to your production domain(s).
3. Upload videos to R2 and enter the object key (e.g. `videos/lesson-1.mp4`) in the lesson's Video Source field — or paste a YouTube/Vimeo URL to embed instead.

---

## 5. ⚠️ Honest Limitations (read this)

No web platform can do everything. Be transparent with clients:

- **Screenshots & screen recording CANNOT be blocked.** OS tools (Windows Snipping Tool / `Win+Shift+S`, macOS, mobile screenshot, OBS, etc.) run outside the browser and are beyond any website's reach. The client-side deterrents above only discourage casual attempts.
- **Filming the screen with a phone** is obviously impossible to prevent.
- **A determined, logged-in, enrolled student** can still capture content, because their browser must ultimately decode and display it.
- **True screenshot/record protection requires hardware DRM** (Widevine / PlayReady) — only available through specialized providers such as **VdoCipher, Vimeo DRM, or Bunny Stream DRM**. This is not achievable with self-hosted DIY code.
- **Bandwidth note:** the byte proxy routes video through your own server. R2→server egress is free, but server→user bandwidth is billed by your host. At large scale, consider HLS + a CDN.

---

## 6. Optional Future Hardening (not yet implemented)

- **HLS + AES-128 segmented streaming** — splits videos into encrypted chunks (raises the bar against casual full-file download). Requires an `ffmpeg` transcoding step (best done locally, then uploaded to R2) plus an auth-gated key endpoint.
- **Burned-in per-user watermark** — watermark baked into the video pixels (impractical to DIY; better via a DRM provider).
- **Widevine DRM** — the only real defense against screen recording; via VdoCipher / Bunny.

---

_For implementation details of any layer, follow the file references above._
