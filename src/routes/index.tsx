import { createFileRoute } from "@tanstack/react-router";

import landingHtml from "../legacy/index.html?raw";

export const Route = createFileRoute("/")({
  server: {
    handlers: {
      GET: () =>
        new Response(landingHtml, {
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    },
  },
});
