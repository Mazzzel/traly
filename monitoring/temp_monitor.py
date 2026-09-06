#!/usr/bin/env python3
"""Surveille la température du CPU du Pi. Alerte Telegram à WARN_TEMP,
arrêt propre du système à CRITICAL_TEMP. Aucune dépendance tierce
(stdlib uniquement) pour ne pas avoir besoin d'un venv sur le Pi.

Config via variables d'environnement (voir temp-monitor.env.example) :
  TELEGRAM_TOKEN, TELEGRAM_CHAT_ID, WARN_TEMP (def. 70), CRITICAL_TEMP (def. 80)

Pensé pour tourner en oneshot via un timer systemd (toutes les 30s).
"""

import json
import os
import subprocess
import time
import urllib.request
from pathlib import Path

WARN_TEMP = float(os.environ.get("WARN_TEMP", "70"))
CRITICAL_TEMP = float(os.environ.get("CRITICAL_TEMP", "80"))
TELEGRAM_TOKEN = os.environ["TELEGRAM_TOKEN"]
TELEGRAM_CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]

STATE_FILE = Path("/run/temp-monitor.state.json")
WARN_RENOTIFY_SECONDS = 10 * 60


def read_cpu_temp() -> float:
    try:
        out = subprocess.check_output(["vcgencmd", "measure_temp"], text=True)
        # format: "temp=53.8'C"
        return float(out.strip().split("=")[1].split("'")[0])
    except (subprocess.CalledProcessError, FileNotFoundError, IndexError, ValueError):
        raw = Path("/sys/class/thermal/thermal_zone0/temp").read_text().strip()
        return int(raw) / 1000


def send_telegram(message: str) -> None:
    url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    data = json.dumps({"chat_id": TELEGRAM_CHAT_ID, "text": message}).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            resp.read()
    except Exception as e:  # noqa: BLE001 -- on ne veut jamais planter le monitor pour un souci réseau
        print(f"Échec d'envoi Telegram: {e}")


def load_state() -> dict:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except json.JSONDecodeError:
            pass
    return {"last_warn_notify": 0}


def save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state))


def main() -> None:
    temp = read_cpu_temp()
    now = time.time()
    state = load_state()

    if temp >= CRITICAL_TEMP:
        send_telegram(
            f"🔥 Pi à {temp:.1f}°C (seuil critique {CRITICAL_TEMP}°C) — "
            "extinction immédiate pour protéger le matériel."
        )
        subprocess.run(["sudo", "/sbin/shutdown", "-h", "now"], check=False)
        return

    if temp >= WARN_TEMP:
        if now - state.get("last_warn_notify", 0) >= WARN_RENOTIFY_SECONDS:
            send_telegram(f"⚠️ Pi à {temp:.1f}°C (seuil d'alerte {WARN_TEMP}°C).")
            state["last_warn_notify"] = now
            save_state(state)
    else:
        if state.get("last_warn_notify", 0) != 0:
            send_telegram(f"✅ Température du Pi revenue à {temp:.1f}°C.")
        state["last_warn_notify"] = 0
        save_state(state)


if __name__ == "__main__":
    main()
