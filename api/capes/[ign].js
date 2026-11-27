// copyright: xsyanic - all rights reserved
// GET /capes/<ign>

const IGN_REGEX = /^[A-Za-z0-9_]{3,16}$/;
const UPSTREAM = "http://capeserver.picapes.syanic.org/capes/";
const CACHE_TIME_SEC = 10 * 60; // 10 minutes

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }

  const raw = req.query.ign;
  if (typeof raw !== "string") {
    return res.status(400).end();
  }

  // ignore extensions (e.g. "Notch.png" -> "Notch")
  const ign = raw.split(".")[0];

  // 1. validate Minecraft IGN
  if (!IGN_REGEX.test(ign)) {
    return res.status(400).end();
  }

  try {
    // 2. fetch upstream (follows redirects)
    const upstream = await fetch(UPSTREAM + encodeURIComponent(ign), {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });

    // mirror upstream status on errors
    if (!upstream.ok) {
      return res.status(upstream.status).end();
    }

    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return res.status(502).end();
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());

    // 3. return image, cached on Vercel's CDN
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, s-maxage="+CACHE_TIME_SEC);
    return res.status(upstream.status).send(buffer);
  } catch (err) {
    return res.status(502).end();
  }
};
