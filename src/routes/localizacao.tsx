import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { calculateSchoolRoute, searchPlaceCoordinates } from "@/lib/location.functions";
import { mapsDirectionsUrl, validCoordinates, type TravelMode } from "@/lib/location";
import { MapPin, Navigation, ExternalLink, Clock, Car, Footprints, Bike, Copy, Share2, LocateFixed, Locate, Loader2, RotateCcw, Layers, Phone, Search } from "lucide-react";
import { toast } from "sonner";

declare global { interface Window { google: any; initMatolaMap?: () => void } }

export const Route = createFileRoute("/localizacao")({
  head: () => ({ meta: [
    { title: "Localização e trajetos — Matola Gare" },
    { name: "description", content: "Encontre a Escola Secundária da Matola Gare e escolha como chegar de carro, a pé ou de bicicleta." },
    { property: "og:title", content: "Localização e trajetos — Matola Gare" },
    { property: "og:description", content: "Endereço, mapa e opções de chegada à escola." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: Localizacao,
});

const MODES = [{ value: "DRIVE", label: "Carro", icon: Car }, { value: "WALK", label: "A pé", icon: Footprints }, { value: "BICYCLE", label: "Bicicleta", icon: Bike }] as const;
const REFERENCE_ADDRESS = "Alemony Wochanhama & Filhos, Matola, Moçambique";

function Localizacao() {
  const { user } = useAuth();
  const { data: school, isPending, isError, refetch } = useQuery({
    queryKey: ["school_info"], queryFn: async () => {
      const { data, error } = await supabase.from("school_info").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const calculate = useServerFn(calculateSchoolRoute);
  const findPlace = useServerFn(searchPlaceCoordinates);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const autoLocatedRef = useRef(false);
  const fallbackOriginRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mode, setMode] = useState<TravelMode>("DRIVE");
  const [satellite, setSatellite] = useState(false);
  const [locating, setLocating] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [route, setRoute] = useState<Awaited<ReturnType<typeof calculate>> | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const lat = school?.latitude, lng = school?.longitude;
  const hasCoordinates = lat != null && lng != null && validCoordinates(lat, lng);
  const destination = hasCoordinates ? `${lat},${lng}` : `${school?.name || "Escola Secundária da Matola Gare"}, Matola Gare, Moçambique`;
  const navigationHref = mapsDirectionsUrl(destination, mode);
  const address = school?.address || "Matola Gare · Cidade da Matola · Província de Maputo · Moçambique";

  useEffect(() => {
    if (window.google?.maps) { setLoaded(true); return; }
    const key = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY'];
    const tracking = import.meta.env['VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID'];
    if (!key) { setMapError(true); return; }
    window.initMatolaMap = () => setLoaded(true);
    let script = document.getElementById("matola-map-script") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script"); script.id = "matola-map-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=initMatolaMap${tracking ? `&channel=${tracking}` : ""}`;
      script.async = true; script.onerror = () => setMapError(true); document.head.appendChild(script);
    }
    const timer = window.setTimeout(() => { if (!window.google?.maps) setMapError(true); }, 15000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loaded || !mapRef.current || lat == null || lng == null || !hasCoordinates) return;
    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat, lng }, zoom: 16, clickableIcons: false, mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
    });
    mapInstance.current = map;
    new window.google.maps.Marker({ position: { lat, lng }, map, title: school?.name });
    return () => { mapInstance.current = null; };
  }, [loaded, lat, lng, hasCoordinates, school?.name]);

  // Posição exata do utilizador no mapa: marcador + círculo de precisão.
  useEffect(() => {
    userMarkerRef.current?.setMap(null);
    accuracyCircleRef.current?.setMap(null);
    userMarkerRef.current = null;
    accuracyCircleRef.current = null;
    if (!userLocation || !loaded || !mapInstance.current) return;
    const center = { lat: userLocation.latitude, lng: userLocation.longitude };
    accuracyCircleRef.current = new window.google.maps.Circle({
      map: mapInstance.current, center, radius: Math.max(5, userLocation.accuracy), clickable: false,
      fillColor: "#1a73e8", fillOpacity: 0.15, strokeColor: "#1a73e8", strokeOpacity: 0.6, strokeWeight: 1,
    });
    userMarkerRef.current = new window.google.maps.Marker({
      map: mapInstance.current, position: center, title: "A minha posição", zIndex: 10,
      icon: { path: window.google.maps.SymbolPath.CIRCLE, scale: 7, fillColor: "#1a73e8", fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 },
    });
  }, [userLocation, loaded, hasCoordinates]);

  useEffect(() => { mapInstance.current?.setMapTypeId(satellite ? "satellite" : "roadmap"); }, [satellite, loaded]);

  useEffect(() => {
    polylineRef.current?.setMap(null);
    if (!route || !mapInstance.current || !loaded) return;
    const color = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    polylineRef.current = new window.google.maps.Polyline({ path: route.path, map: mapInstance.current, strokeColor: color, strokeWeight: 5 });
    const bounds = new window.google.maps.LatLngBounds(); route.path.forEach((p) => bounds.extend(p)); mapInstance.current.fitBounds(bounds, 40);
    return () => polylineRef.current?.setMap(null);
  }, [route, loaded]);

  // A plataforma tenta mostrar a localização do utilizador automaticamente.
  function locate(silent = false) {
    if (!navigator.geolocation) { if (!silent) toast.error("O dispositivo não permite obter a localização."); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition((pos) => {
      setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy });
      setLocating(false);
      if (!silent) toast.success("Localização obtida");
      if (route) setRoute(null);
    }, (error) => {
      setLocating(false);
      if (!silent) toast.error(error.code === 1 ? "Localização não autorizada. Toque em «Encontrar a Escola» para continuar." : "Não foi possível obter a localização.");
    }, { timeout: 12000, maximumAge: 60000, enableHighAccuracy: true });
  }

  useEffect(() => {
    if (autoLocatedRef.current || !navigator.geolocation) return;
    autoLocatedRef.current = true;
    try {
      navigator.permissions?.query({ name: "geolocation" as PermissionName })
        .then((status) => { if (status.state === "granted") locate(true); else locate(true); })
        .catch(() => { locate(true); });
    } catch { locate(true); }
    // Sem API de permissões: tenta mesmo assim; o navegador pede autorização.
  }, []);

  // Botão principal: parte da posição automática; se não houver, usa o endereço de referência.
  async function findSchool() {
    const origin: { latitude: number; longitude: number } | string = userLocation
      ? { latitude: userLocation.latitude, longitude: userLocation.longitude }
      : (fallbackOriginRef.current ?? REFERENCE_ADDRESS);
    if (!user) { window.open(navigationHref, "_blank", "noopener,noreferrer"); return; }
    setCalculating(true); setRouteError("");
    try {
      if (typeof origin === "string" && !fallbackOriginRef.current) {
        const found = await findPlace({ data: { query: REFERENCE_ADDRESS } });
        if (found) {
          fallbackOriginRef.current = found;
          setRoute(await calculate({ data: { origin: found, mode } }));
        } else {
          setRoute(await calculate({ data: { origin: REFERENCE_ADDRESS, mode } }));
        }
      } else {
        setRoute(await calculate({ data: { origin, mode } }));
      }
    } catch (e) { setRouteError(e instanceof Error ? e.message : "Não foi possível calcular o trajeto."); }
    finally { setCalculating(false); }
  }

  async function shareLocation() {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
    try {
      if (navigator.share) await navigator.share({ title: school?.name || "Matola Gare", text: address, url });
      else { await navigator.clipboard.writeText(`${address}\n${url}`); toast.success("Localização copiada"); }
    } catch (e) { if (!(e instanceof Error && e.name === "AbortError")) toast.error("Não foi possível partilhar a localização."); }
  }

  return <AppShell><div className="mx-auto max-w-6xl px-4 py-8">
    <header className="mb-6"><p className="mb-2 flex items-center gap-2 text-sm text-primary"><MapPin className="h-4 w-4" /> Matola Gare · Maputo</p><h1 className="text-3xl font-bold">Localização da Escola</h1><p className="mt-2 text-muted-foreground">{school?.name || "Escola Secundária da Matola Gare"}</p></header>
    {isError ? <div className="py-8 text-sm text-destructive">Não foi possível carregar a localização. <Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button></div> : isPending ? <div className="grid h-80 place-items-center"><Loader2 className="animate-spin text-primary" /></div> : <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="min-w-0">
        <div className="relative h-80 overflow-hidden rounded-lg border border-border bg-surface-variant sm:h-[480px]">
          <div ref={mapRef} className="h-full w-full" />
          {(!loaded || !hasCoordinates || mapError) && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-variant p-6 text-center text-muted-foreground"><MapPin className="h-8 w-8 text-primary" /><p>{!hasCoordinates ? "Localização exata ainda não definida pela escola." : mapError ? "O mapa está indisponível neste momento." : "A carregar mapa…"}</p><Button asChild variant="outline"><a href={navigationHref} target="_blank" rel="noreferrer">Ver no Google Maps <ExternalLink /></a></Button></div>}
          {loaded && hasCoordinates && !mapError && <div className="absolute bottom-3 left-3 flex gap-2"><Button variant="secondary" size="icon" title="Centrar na escola" aria-label="Centrar na escola" onClick={() => { mapInstance.current?.setCenter({ lat, lng }); mapInstance.current?.setZoom(16); }}><LocateFixed /></Button><Button variant="secondary" size="icon" title="Centrar em mim" aria-label="Centrar em mim" disabled={!userLocation} onClick={() => { if (!userLocation) return; mapInstance.current?.setCenter({ lat: userLocation.latitude, lng: userLocation.longitude }); mapInstance.current?.setZoom(Math.max(mapInstance.current.getZoom() ?? 15, 16)); }}><Locate /></Button><Button variant="secondary" title="Vista de satélite" aria-pressed={satellite} onClick={() => setSatellite((s) => !s)}><Layers /> {satellite ? "Mapa" : "Satélite"}</Button></div>}
        </div>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-semibold">Endereço</h2><p className="mt-1 text-sm text-muted-foreground">{address}</p>{hasCoordinates && <p className="mt-1 text-xs text-muted-foreground">{lat.toFixed(5)}, {lng.toFixed(5)}</p>}</div><div className="flex gap-1"><Button size="icon" variant="ghost" title="Copiar endereço" aria-label="Copiar endereço" onClick={async () => { try { await navigator.clipboard.writeText(address); toast.success("Endereço copiado"); } catch { toast.error("Não foi possível copiar."); } }}><Copy /></Button><Button size="icon" variant="ghost" title="Partilhar localização" aria-label="Partilhar localização" onClick={shareLocation}><Share2 /></Button></div></div>
        {userLocation && <div className="mt-3 rounded-lg border border-border bg-surface-variant p-3 text-sm"><p className="font-medium">A minha posição</p><p className="mt-1 text-xs text-muted-foreground">{userLocation.latitude.toFixed(5)}, {userLocation.longitude.toFixed(5)} · precisão ~{Math.round(userLocation.accuracy)} m</p></div>}
        {school?.phone && <Button asChild variant="link" className="mt-2 px-0"><a href={`tel:${school.phone}`}><Phone /> {school.phone}</a></Button>}
      </section>
      <section className="min-w-0 border-border lg:border-l lg:pl-6"><h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Navigation className="h-5 w-5 text-primary" /> Como chegar</h2>
        <div className="mb-5 grid grid-cols-3 gap-1 rounded-lg bg-surface-variant p-1" role="group" aria-label="Transporte">{MODES.map(({ value, label, icon: Icon }) => <Button key={value} variant={mode === value ? "default" : "ghost"} className="h-14 flex-col gap-1 px-1 text-xs" aria-pressed={mode === value} onClick={() => { setMode(value); setRoute(null); }}><Icon />{label}</Button>)}</div>
        <Button className="h-12 w-full" disabled={calculating || locating} onClick={findSchool}>{calculating ? <Loader2 className="animate-spin" /> : locating ? <Loader2 className="animate-spin" /> : <Search />}{calculating ? "A calcular…" : locating ? "A obter a sua posição…" : "Encontrar a Escola"}</Button>
        <p className="mt-2 text-xs text-muted-foreground">{userLocation ? "Parte da sua posição atual." : "Sem posição automática: parte do ponto de referência mais próximo (Alemony Wochanhama & Filhos)."}</p>
        <Button type="button" variant="outline" className="mt-3 w-full" disabled={locating} onClick={() => locate(false)}>{locating ? <Loader2 className="animate-spin" /> : <LocateFixed />} Atualizar a minha posição</Button>
        <Button asChild variant="secondary" className="mt-3 w-full"><a href={navigationHref} target="_blank" rel="noreferrer"><ExternalLink /> Abrir no Google Maps</a></Button>
        {routeError && <p role="alert" className="mt-4 break-words text-sm text-destructive">{routeError}</p>}
        {route && <div className="mt-6 border-t border-border pt-4"><div className="mb-4 grid grid-cols-2 gap-3"><div><p className="text-xs text-muted-foreground">Distância</p><strong>{route.distance}</strong></div><div><p className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" /> Duração estimada</p><strong>{route.duration}</strong></div></div><ol className="max-h-80 space-y-3 overflow-y-auto text-sm">{route.steps.map((step, i) => <li key={i} className="flex gap-2"><span className="font-medium text-primary">{i + 1}.</span><span>{step.replace(/<[^>]*>/g, "")}</span></li>)}</ol><Button variant="ghost" className="mt-3" onClick={() => { setRoute(null); setRouteError(""); }}><RotateCcw /> Limpar trajeto</Button></div>}
        {school?.schedule && <div className="mt-6 border-t border-border pt-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><Clock className="h-4 w-4 text-primary" /> Horário</h3><p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{school.schedule}</p></div>}
      </section>
    </div>}
  </div></AppShell>;
}
