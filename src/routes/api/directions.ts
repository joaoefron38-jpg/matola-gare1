import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/directions")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as { origin?: string; destination?: string };
          if (!body.origin || !body.destination) {
            return new Response(JSON.stringify({ error: "origin and destination required" }), { status: 400, headers: { "Content-Type": "application/json" } });
          }
          const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
          const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
          if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) {
            return new Response(JSON.stringify({ error: "maps not configured" }), { status: 500, headers: { "Content-Type": "application/json" } });
          }
          const res = await fetch("https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
              "Content-Type": "application/json",
              "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters",
            },
            body: JSON.stringify({
              origin: { location: coordsFrom(body.origin) },
              destination: { location: coordsFrom(body.destination) },
              travelMode: "DRIVE",
              languageCode: "pt-PT",
              units: "METRIC",
            }),
          });
          if (!res.ok) {
            const t = await res.text();
            return new Response(JSON.stringify({ error: `provider ${res.status}`, detail: t }), { status: 502, headers: { "Content-Type": "application/json" } });
          }
          const data = await res.json();
          const route = data.routes?.[0];
          if (!route) return new Response(JSON.stringify({ error: "no route" }), { status: 404, headers: { "Content-Type": "application/json" } });
          const distanceMeters: number = route.distanceMeters ?? 0;
          const durationSec: number = parseInt(String(route.duration ?? "0").replace("s", ""), 10);
          const steps: string[] = (route.legs?.[0]?.steps ?? [])
            .map((s: any) => s.navigationInstruction?.instructions)
            .filter(Boolean);
          return new Response(JSON.stringify({
            distance: distanceMeters >= 1000 ? `${(distanceMeters / 1000).toFixed(1)} km` : `${distanceMeters} m`,
            duration: humanDuration(durationSec),
            steps,
          }), { headers: { "Content-Type": "application/json" } });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { "Content-Type": "application/json" } });
        }
      },
    },
  },
});

function coordsFrom(s: string): { latLng: { latitude: number; longitude: number } } {
  const [lat, lng] = s.split(",").map(Number);
  return { latLng: { latitude: lat, longitude: lng } };
}
function humanDuration(sec: number): string {
  if (!sec) return "—";
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60); const rem = m % 60;
  return `${h}h ${rem}min`;
}
