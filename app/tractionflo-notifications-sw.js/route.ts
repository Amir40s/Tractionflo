const serviceWorkerSource = `
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const fallbackUrl = "/";
  const targetUrl = event.notification.data?.url || fallbackUrl;
  const absoluteUrl = new URL(targetUrl, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === absoluteUrl && "focus" in client) {
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(absoluteUrl);
      }

      return undefined;
    })
  );
});
`.trim();

export const dynamic = "force-static";

export function GET() {
  return new Response(serviceWorkerSource, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
    },
  });
}
