from datetime import datetime, timezone
from urllib.parse import quote
from zoneinfo import ZoneInfo

import httpx


def _fetch_json(url: str) -> dict:
    response = httpx.get(url, timeout=10)
    response.raise_for_status()
    return response.json()


def _now() -> datetime:
    return datetime.now(timezone.utc)


def get_weather(city: str) -> str:
    """Get the current weather for a city.

    Args:
        city: City name, e.g. "São Paulo".
    """
    try:
        geo = _fetch_json(
            f"https://geocoding-api.open-meteo.com/v1/search?name={quote(city)}&count=1"
        )
        results = geo.get("results")
        if not results:
            return f"Error: city not found: {city}"
        place = results[0]
        forecast = _fetch_json(
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={place['latitude']}&longitude={place['longitude']}"
            "&current=temperature_2m,wind_speed_10m"
        )
        current = forecast["current"]
        return (
            f"{place['name']}: {current['temperature_2m']}°C, "
            f"wind {current['wind_speed_10m']} km/h"
        )
    except Exception as e:
        return f"Error: weather lookup failed: {e}"


def get_current_time(timezone: str) -> str:
    """Get the current time in an IANA timezone.

    Args:
        timezone: IANA timezone name, e.g. "Asia/Tokyo".
    """
    try:
        local = _now().astimezone(ZoneInfo(timezone))
    except Exception:
        return f"Error: invalid timezone: {timezone}"
    return f"{timezone}: {local.isoformat(timespec='seconds')}"
