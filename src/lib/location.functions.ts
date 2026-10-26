import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { decodePolyline, parseDuration } from "./location";

export const calculateSchoolRoute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({
    origin: z.union([
      z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
      z.string().trim().min(3).max(200),
    ]),
    mode: z.enum(["DRIVE", "WALK", "BICYCLE"]),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: school, error } = await context.supabase.from("school_info").select("latitude,longitude").eq("id", 1).maybeSingle();
    if (error) throw new Error(error.message);
    if (school?.latitude == null || school.longitude == null) throw new Error("A localização da escola ainda não foi definida.");
    const key = process.env['GOOGLE_MAPS_API_KEY'];
    const auth = process.env['LOVABLE_API_KEY'];
    if (!key || !auth) throw new Error("O cálculo de rotas não está configurado. Pode abrir o trajeto no Google Maps.");
    const response = await fetch("https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes", {
      method: "POST", signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${auth}`, "X-Connection-Api-Key": key, "Content-Type": "application/json", "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.steps.navigationInstruction" },
      body: JSON.stringify({
        origin: typeof data.origin === "string" ? { address: data.origin } : { location: { latLng: data.origin } },
        destination: { location: { latLng: { latitude: school.latitude, longitude: school.longitude } } },
        travelMode: data.mode, languageCode: "pt-PT", units: "METRIC",
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error(`Google Maps [${response.status}]: ${detail}`);
      if (response.status === 403) {
        let reason: string | undefined;
        try { reason = JSON.parse(detail)?.error?.details?.find((d: { reason?: string }) => d.reason)?.reason; } catch { /* Preserve provider status if body is not JSON. */ }
        if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") throw new Error("Google Maps (403): a chave do servidor tem restrições de website. Altere-a para sem restrições de aplicação ou endereços IP no Google Cloud.");
        if (reason === "API_KEY_SERVICE_BLOCKED") throw new Error("Google Maps (403): ative e autorize a Routes API para a chave do servidor no Google Cloud.");
        throw new Error(`Google Maps (403): verifique as restrições da chave do servidor. ${detail}`);
      }
      throw new Error(`Google Maps (${response.status}): ${detail}`);
    }
    const result = await response.json() as { routes?: { duration?: string; distanceMeters?: number; polyline?: { encodedPolyline?: string }; legs?: { steps?: { navigationInstruction?: { instructions?: string } }[] }[] }[] };
    const route = result.routes?.[0];
    if (!route) throw new Error("Não foi encontrado um trajeto para este modo de transporte.");
    const seconds = parseDuration(route.duration);
    const distance = route.distanceMeters ?? 0;
    if (!Number.isFinite(distance) || distance < 0) throw new Error("Distância indisponível.");
    const path = decodePolyline(route.polyline?.encodedPolyline ?? "");
    return {
      distance: distance >= 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance} m`,
      duration: seconds < 3600 ? `${Math.max(1, Math.round(seconds / 60))} min` : `${Math.floor(seconds / 3600)} h ${Math.round((seconds % 3600) / 60)} min`,
      steps: (route.legs ?? []).flatMap((leg) => (leg.steps ?? []).flatMap((step) => step.navigationInstruction?.instructions ? [step.navigationInstruction.instructions] : [])),
      path,
    };
  });

// Sugestões de endereço para o campo "Ponto de partida" (Places API New via gateway).
export const autocompleteAddressSuggestions = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({
    input: z.string().trim().min(3).max(120),
    sessionToken: z.string().uuid(),
  }).parse(input))
  .handler(async ({ data }) => {
    const key = process.env["GOOGLE_MAPS_API_KEY"];
    const auth = process.env["LOVABLE_API_KEY"];
    if (!key || !auth) throw new Error("A pesquisa de endereços não está configurada.");
    const response = await fetch("https://connector-gateway.lovable.dev/google_maps/places/v1/places:autocomplete", {
      method: "POST", signal: AbortSignal.timeout(10000),
      headers: {
        Authorization: `Bearer ${auth}`, "X-Connection-Api-Key": key, "Content-Type": "application/json",
        "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
      },
      body: JSON.stringify({
        input: data.input, sessionToken: data.sessionToken, languageCode: "pt",
        locationBias: { circle: { center: { latitude: -25.9622, longitude: 32.4589 }, radius: 60000 } },
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error(`Google Places [${response.status}]: ${detail}`);
      if (response.status === 403) {
        let reason: string | undefined;
        try { reason = JSON.parse(detail)?.error?.details?.find((d: { reason?: string }) => d.reason)?.reason; } catch { /* Preserve provider status if body is not JSON. */ }
        if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") throw new Error("Google Maps (403): a chave do servidor tem restrições de website. Altere-a para sem restrições de aplicação ou endereços IP no Google Cloud.");
        if (reason === "API_KEY_SERVICE_BLOCKED") throw new Error("Google Maps (403): ative e autorize a Places API (New) para a chave do servidor no Google Cloud.");
        throw new Error(`Google Maps (403): verifique as restrições da chave do servidor. ${detail}`);
      }
      throw new Error(`Google Maps (${response.status}): ${detail}`);
    }
    const result = await response.json() as { suggestions?: { placePrediction?: { placeId?: string; text?: { text?: string } } }[] };
    const suggestions = (result.suggestions ?? []).flatMap((s) => {
      const prediction = s.placePrediction;
      return prediction?.placeId && prediction.text?.text ? [{ placeId: prediction.placeId, text: prediction.text.text }] : [];
    });
    return { suggestions };
  });
