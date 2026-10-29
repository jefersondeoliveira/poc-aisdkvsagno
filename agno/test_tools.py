from datetime import datetime, timezone

import httpx
import pytest

import tools

PLACE = {"results": [{"name": "Lisbon", "latitude": 38.7, "longitude": -9.1}]}
FORECAST = {"current": {"temperature_2m": 21.4, "wind_speed_10m": 12.5}}


def fake_fetch(geo, forecast, calls=None):
    def fetch(url):
        if calls is not None:
            calls.append(url)
        if "geocoding-api.open-meteo.com" in url:
            return geo
        if isinstance(forecast, Exception):
            raise forecast
        return forecast

    return fetch


def test_weather_known_city(monkeypatch):
    monkeypatch.setattr(tools, "_fetch_json", fake_fetch(PLACE, FORECAST))
    assert tools.get_weather("Lisbon") == "Lisbon: 21.4°C, wind 12.5 km/h"


def test_weather_url_encodes_sao_paulo(monkeypatch):
    calls = []
    monkeypatch.setattr(tools, "_fetch_json", fake_fetch(PLACE, FORECAST, calls))
    tools.get_weather("São Paulo")
    assert "name=S%C3%A3o%20Paulo" in calls[0]


def test_weather_city_not_found_returns_error(monkeypatch):
    monkeypatch.setattr(tools, "_fetch_json", fake_fetch({}, FORECAST))
    result = tools.get_weather("Xyzzyville")
    assert result.startswith("Error:") and "Xyzzyville" in result


def test_weather_http_failure_returns_error(monkeypatch):
    boom = httpx.HTTPError("status 500")
    monkeypatch.setattr(tools, "_fetch_json", fake_fetch(PLACE, boom))
    result = tools.get_weather("Lisbon")
    assert result.startswith("Error:") and "500" in result


def test_time_valid_zone(monkeypatch):
    monkeypatch.setattr(
        tools, "_now", lambda: datetime(2026, 1, 15, 15, 0, tzinfo=timezone.utc)
    )
    assert (
        tools.get_current_time("America/Sao_Paulo")
        == "America/Sao_Paulo: 2026-01-15T12:00:00-03:00"
    )


def test_time_invalid_zone_returns_error():
    result = tools.get_current_time("Mars/Base")
    assert result.startswith("Error:") and "Mars/Base" in result
