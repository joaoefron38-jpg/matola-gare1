import { describe, it as test } from "node:test";
import assert from "node:assert/strict";
import { decodePolyline, mapsDirectionsUrl, parseDuration, validCoordinates } from "./location";

describe("location", () => {
  test("rejects coordinates outside geographic bounds", () => {
    assert.equal(validCoordinates(-25.9689, 32.4589), true);
    assert.equal(validCoordinates(91, 32), false);
    assert.equal(validCoordinates(-25, 181), false);
    assert.equal(validCoordinates(NaN, 32), false);
  });
  test("preserves decimal travel duration and rejects missing results", () => {
    assert.equal(parseDuration("12.5s"), 12.5);
    assert.throws(() => parseDuration(undefined));
  });
  test("encodes manual origin and selected transport in navigation link", () => {
    const url = new URL(mapsDirectionsUrl("-25.9689,32.4589", "WALK", "Matola & Maputo"));
    assert.equal(url.searchParams.get("origin"), "Matola & Maputo");
    assert.equal(url.searchParams.get("travelmode"), "walking");
    assert.equal(url.searchParams.get("destination"), "-25.9689,32.4589");
  });
  test("decodes standard route geometry and rejects incomplete geometry", () => {
    assert.deepEqual(decodePolyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@"), [{ lat: 38.5, lng: -120.2 }, { lat: 40.7, lng: -120.95 }, { lat: 43.252, lng: -126.453 }]);
    assert.throws(() => decodePolyline("_"));
  });
});
