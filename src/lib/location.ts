export type TravelMode = "DRIVE" | "WALK" | "BICYCLE";

export function validCoordinates(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

export function mapsDirectionsUrl(destination: string, mode: TravelMode, origin?: string) {
  const params = new URLSearchParams({ api: "1", destination, travelmode: { DRIVE: "driving", WALK: "walking", BICYCLE: "bicycling" }[mode] });
  if (origin?.trim()) params.set("origin", origin.trim());
  return `https://www.google.com/maps/dir/?${params}`;
}

export function parseDuration(value: unknown) {
  if (typeof value !== "string" || !/^\d+(\.\d+)?s$/.test(value)) throw new Error("Tempo de viagem indisponível.");
  return Number(value.slice(0, -1));
}

export function decodePolyline(encoded: string) {
  let index = 0, lat = 0, lng = 0;
  const points: { lat: number; lng: number }[] = [];
  function next() {
    let result = 0, shift = 0, byte: number;
    do {
      if (index >= encoded.length || shift > 30) throw new Error("Trajeto inválido.");
      byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) throw new Error("Trajeto inválido.");
      result |= (byte & 31) << shift; shift += 5;
    } while (byte >= 32);
    return result & 1 ? ~(result >> 1) : result >> 1;
  }
  while (index < encoded.length) { lat += next(); lng += next(); points.push({ lat: lat / 1e5, lng: lng / 1e5 }); }
  if (points.length < 2 || points.some((p) => !validCoordinates(p.lat, p.lng))) throw new Error("Trajeto indisponível.");
  return points;
}
