export type WeatherResult =
  | { city: string; temperatureC: number; windKmh: number }
  | { error: string };

export type TimeResult = { timezone: string; iso: string } | { error: string };

export async function getWeather(
  city: string,
  fetchImpl: typeof fetch = fetch,
): Promise<WeatherResult> {
  try {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
    const geoRes = await fetchImpl(geoUrl);
    if (!geoRes.ok) return { error: `Geocoding failed with status ${geoRes.status}` };
    const place = (await geoRes.json()).results?.[0];
    if (!place) return { error: `City not found: ${city}` };

    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,wind_speed_10m`;
    const res = await fetchImpl(forecastUrl);
    if (!res.ok) return { error: `Forecast failed with status ${res.status}` };
    const { current } = await res.json();
    return {
      city: place.name,
      temperatureC: current.temperature_2m,
      windKmh: current.wind_speed_10m,
    };
  } catch (e) {
    return { error: `Weather lookup failed: ${(e as Error).message}` };
  }
}

export function getCurrentTime(timezone: string, now: Date = new Date()): TimeResult {
  try {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hourCycle: "h23",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "longOffset",
      })
        .formatToParts(now)
        .map((p) => [p.type, p.value]),
    );
    const offset = parts.timeZoneName === "GMT" ? "+00:00" : parts.timeZoneName.replace("GMT", "");
    return {
      timezone,
      iso: `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${offset}`,
    };
  } catch {
    return { error: `Invalid timezone: ${timezone}` };
  }
}
