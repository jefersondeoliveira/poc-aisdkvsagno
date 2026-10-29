import { describe, expect, it } from "vitest";
import { getCurrentTime, getWeather } from "./tools";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

function stubFetch(routes: Array<(url: string) => Response | undefined>) {
  const calls: string[] = [];
  const impl = (async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    for (const route of routes) {
      const res = route(url);
      if (res) return res;
    }
    return json({}, 404);
  }) as typeof fetch;
  return { impl, calls };
}

const geo = (results: unknown[] | undefined) => (url: string) =>
  url.includes("geocoding-api.open-meteo.com") ? json({ results }) : undefined;
const forecast = (status = 200) => (url: string) =>
  url.includes("api.open-meteo.com/v1/forecast")
    ? json({ current: { temperature_2m: 21.4, wind_speed_10m: 12.5 } }, status)
    : undefined;
const place = [{ name: "Lisbon", latitude: 38.7, longitude: -9.1 }];

describe("getWeather", () => {
  it("returns temperature and wind for a known city", async () => {
    const { impl } = stubFetch([geo(place), forecast()]);
    expect(await getWeather("Lisbon", impl)).toEqual({
      city: "Lisbon",
      temperatureC: 21.4,
      windKmh: 12.5,
    });
  });

  it("url-encodes São Paulo in the geocoding query", async () => {
    const { impl, calls } = stubFetch([geo(place), forecast()]);
    await getWeather("São Paulo", impl);
    expect(calls[0]).toContain("name=S%C3%A3o%20Paulo");
  });

  it("returns {error} when geocoding finds nothing", async () => {
    const { impl } = stubFetch([geo(undefined)]);
    const result = await getWeather("Xyzzyville", impl);
    expect(result).toEqual({ error: expect.stringContaining("Xyzzyville") });
  });

  it("returns {error} when the forecast response is non-200", async () => {
    const { impl } = stubFetch([geo(place), forecast(500)]);
    expect(await getWeather("Lisbon", impl)).toEqual({
      error: expect.stringContaining("500"),
    });
  });
});

describe("getCurrentTime", () => {
  it("returns the local iso time for America/Sao_Paulo", () => {
    const now = new Date("2026-01-15T15:00:00Z");
    expect(getCurrentTime("America/Sao_Paulo", now)).toEqual({
      timezone: "America/Sao_Paulo",
      iso: "2026-01-15T12:00:00-03:00",
    });
  });

  it("returns {error} for Mars/Base", () => {
    expect(getCurrentTime("Mars/Base")).toEqual({
      error: expect.stringContaining("Mars/Base"),
    });
  });
});
