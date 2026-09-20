// Turn a shared video page into something an <iframe> or <video> element can
// play in place. Pure (no network, no DOM) so it can be unit-checked.

export type Embed =
  | { kind: "youtube"; src: string }
  | { kind: "vimeo"; src: string }
  | { kind: "dailymotion"; src: string }
  | { kind: "twitch"; src: string }
  | { kind: "file"; src: string }
  | { kind: "page"; src: string };

// `parent` is the site's hostname, which Twitch insists on so an embed only
// plays where it is shown. Pass window.location.hostname where available.
export function embedSource(url: string, parent = ""): Embed | null {
  const raw = (url || "").trim();
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;

  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  const path = u.pathname || "";

  // YouTube: youtu.be/ID, /watch?v=ID, /shorts/ID, /embed/ID, /live/ID
  if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) {
    const id = youtubeId(host, path, u.searchParams.get("v"));
    if (id) return { kind: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}` };
  }

  // Vimeo: vimeo.com/123456789 (with or without a trailing slug)
  if (host === "vimeo.com") {
    const m = path.match(/^\/+(\d+)/);
    if (m) return { kind: "vimeo", src: `https://player.vimeo.com/video/${m[1]}` };
  }

  // Dailymotion: dailymotion.com/video/ID, dailymotion.com/ID, dai.ly/ID
  if (host === "dailymotion.com" || host === "dai.ly") {
    const m = path.match(/^\/+(?:video\/)?([^/?#]+)/);
    if (m) return { kind: "dailymotion", src: `https://www.dailymotion.com/embed/video/${m[1]}` };
  }

  // Twitch: /videos/ID (past broadcast) or /channel (live stream)
  if (host === "twitch.tv" || host === "m.twitch.tv") {
    const m = path.match(/^\/+videos\/(\d+)/);
    if (m) return { kind: "twitch", src: `https://player.twitch.tv/?video=${m[1]}&parent=${parent}` };
    const channel = path.replace(/^\/+/, "").split("/")[0].toLowerCase();
    if (channel) return { kind: "twitch", src: `https://player.twitch.tv/?channel=${channel}&parent=${parent}` };
  }

  // Direct video file → a plain <video> player.
  if (/\.(mp4|webm|ogv|ogg|mov|m4v)$/i.test(path)) return { kind: "file", src: raw };

  // Anything else https(s) gets an iframe. Most platforms need their own
  // /embed/ URL, so editors can paste that if the plain page is refused.
  return { kind: "page", src: raw };
}

function youtubeId(host: string, path: string, v: string | null): string | null {
  if (v) return v;
  const m = path.match(/^\/+(?:shorts|embed|live)\/([^/?#]+)/);
  if (m) return m[1];
  if (host === "youtu.be") return path.replace(/^\/+/, "").split("/")[0] || null;
  return null;
}