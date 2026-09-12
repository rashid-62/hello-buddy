import { createFileRoute } from "@tanstack/react-router";

import { handleChat } from "../../lib/chat/chatHandler.js";
import { checkRateLimit } from "../../lib/chat/utils/rateLimit.js";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "Content-Type",
  "access-control-allow-methods": "POST, OPTIONS",
};

function clientIdFrom(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    "local"
  );
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      OPTIONS: () => new Response(null, { status: 204, headers: JSON_HEADERS }),
      POST: async ({ request }: { request: Request }) => {
        const rate = checkRateLimit(clientIdFrom(request));
        if (!rate.allowed) {
          return new Response(
            JSON.stringify({
              success: false,
              error: "Too many requests. Please wait a moment and try again.",
            }),
            {
              status: 429,
              headers: { ...JSON_HEADERS, "retry-after": String(rate.retryAfterSec || 60) },
            },
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ success: false, error: "Invalid JSON body." }), {
            status: 400,
            headers: JSON_HEADERS,
          });
        }

        const result = await handleChat(body);
        return new Response(JSON.stringify(result.payload), {
          status: result.statusCode,
          headers: JSON_HEADERS,
        });
      },
    },
  },
});
