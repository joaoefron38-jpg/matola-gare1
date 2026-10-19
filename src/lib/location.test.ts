import { describe, expect, test } from "bun:test";
import { decodePolyline, mapsDirectionsUrl, parseDuration, validCoordinates } from "./location";

describe("location", () => {
  test("rejects coordinates outside geographic bounds", () => {
    expect(validCoordinates(-25.9689, 32.4589)).toBe(true);
    expect(validCoordinates(91, 32)).toBe(false);
    expect(validCoordinates(-25, 181)).toBe(false);
    expect(validCoordinates(NaN, 32)).toBe(false);
  });
  test("preserves decimal travel duration and rejects missing results", () => {
    expect(parseDuration("12.5s")).toBe(12.5);
    expect(() => parseDuration(undefined)).toThrow();
  });
  test("encodes manual origin and selected transport in navigation link", () => {
    const url = new URL(mapsDirectionsUrl("-25.9689,32.4589", "WALK", "Matola & Maputo"));
    expect(url.searchParams.get("origin")).toBe("Matola & Maputo");
    expect(url.searchParams.get("travelmode")).toBe("walking");
    expect(url.searchParams.get("destination")).toBe("-25.9689,32.4589");
  });
  test("decodes standard route geometry and rejects incomplete geometry", () => {
    expect(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")).toEqual([{ lat: 38.5, lng: -120.2 }, { lat: 40.7, lng: -120.95 }, { lat: 43.252, lng: -126.453 }]);
    expect(() => decodePolyline("_")).toThrow();
  });
});
