"""Utilitaires partagés entre temp_monitor.py (checks périodiques) et
temp_bot.py (écoute des commandes Telegram). Stdlib uniquement.
"""

import json
import os
import subprocess
import urllib.request
from pathlib import Path

TELEGRAM_TOKEN = os.environ["TELEGRAM_TOKEN"]
TELEGRAM_CHAT_ID = os.environ["TELEGRAM_CHAT_ID"]

API_BASE = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"


def read_cpu_temp() -> float:
    try:
        out = subprocess.check_output(["vcgencmd", "measure_temp"], text=True)
        # format: "temp=53.8'C"
        return float(out.strip().split("=")[1].split("'")[0])
    except (subprocess.CalledProcessError, FileNotFoundError, IndexError, ValueError):
        raw = Path("/sys/class/thermal/thermal_zone0/temp").read_text().strip()
        return int(raw) / 1000


def telegram_api(method: str, payload: dict, timeout: int = 10) -> dict | None:
    url = f"{API_BASE}/{method}"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read())
    except Exception as e:  # noqa: BLE001 -- ne jamais planter pour un souci réseau ponctuel
        print(f"Échec d'appel Telegram ({method}): {e}")
        return None


def send_telegram(message: str, chat_id: str | None = None, reply_markup: dict | None = None) -> None:
    payload = {"chat_id": chat_id or TELEGRAM_CHAT_ID, "text": message}
    if reply_markup:
        payload["reply_markup"] = reply_markup
    telegram_api("sendMessage", payload)
