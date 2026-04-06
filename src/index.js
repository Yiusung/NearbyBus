export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // ── ETA Proxy ────────────────────────────────
    if (url.pathname === "/api/eta") {
      return handleETA(request, ctx);
    }

    // Everything else → static assets (index.html, etc.)
    return new Response("Not Found", { status: 404 });
  },
};

async function handleETA(request, ctx) {
  const url = new URL(request.url);
  const stopId = url.searchParams.get("stop_id");

  // Validate stop_id: alphanumeric + underscore + dash, max 40 chars
  if (!stopId || !/^[a-zA-Z0-9_-]{1,40}$/.test(stopId)) {
    return json({ error: "Invalid or missing stop_id" }, 400);
  }

  // All three operators' ETAs come from the same endpoint
  const upstreamUrl = `https://data.etabus.gov.hk/v1/transport/kmb/stop-eta/${encodeURIComponent(stopId)}`;

  // Edge cache — 15 second TTL
  const cacheKey = new Request(upstreamUrl, { method: "GET" });
  const cached = await caches.default.match(cacheKey);
  if (cached) return cached;

  try {
    const resp = await fetch(upstreamUrl, {
      headers: { Accept: "application/json" },
      cf: { cacheTtl: 30, cacheEverything: true },
    });

    const response = new Response(resp.body, {
      status: resp.status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=30, s-maxage=30",
        "Access-Control-Allow-Origin": "*",
        "X-Content-Type-Options": "nosniff",
      },
    });

    ctx.waitUntil(caches.default.put(cacheKey, response.clone()));
    return response;
  } catch (err) {
    return json({ error: "Upstream fetch failed", message: err.message }, 502);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
