#!/usr/bin/env python3
"""Écoute les messages Telegram et répond à la demande avec la température
actuelle du Pi (commande /temp ou bouton "🌡 Température"). Tourne en continu
via long-polling (aucun port entrant nécessaire).

Config: TELEGRAM_TOKEN, TELEGRAM_CHAT_ID (voir temp-monitor.env.example).
Seul TELEGRAM_CHAT_ID est autorisé à déclencher une réponse.
"""

import time
from pathlib import Path

from temp_common import TELEGRAM_CHAT_ID, read_cpu_temp, send_telegram, telegram_api

OFFSET_FILE = Path("/run/temp-bot.offset")
BUTTON_LABEL = "🌡 Température"

KEYBOARD = {
    "keyboard": [[{"text": BUTTON_LABEL}]],
    "resize_keyboard": True,
    "is_persistent": True,
}


def load_offset() -> int:
    if OFFSET_FILE.exists():
        try:
            return int(OFFSET_FILE.read_text().strip())
        except ValueError:
            pass
    return 0


def save_offset(offset: int) -> None:
    OFFSET_FILE.write_text(str(offset))


def handle_message(message: dict) -> None:
    chat_id = str(message.get("chat", {}).get("id", ""))
    text = (message.get("text") or "").strip()

    if chat_id != TELEGRAM_CHAT_ID:
        # Bot privé : on ignore silencieusement tout autre chat.
        return

    if text == BUTTON_LABEL or text.startswith("/temp"):
        temp = read_cpu_temp()
        send_telegram(f"🌡 Température actuelle : {temp:.1f}°C", reply_markup=KEYBOARD)


def main() -> None:
    telegram_api("setMyCommands", {"commands": [{"command": "temp", "description": "Température actuelle du Pi"}]})
    # Affiche le bouton persistant dès le démarrage du service.
    send_telegram("Bot température prêt. Tape /temp ou utilise le bouton.", reply_markup=KEYBOARD)

    offset = load_offset()
    while True:
        result = telegram_api("getUpdates", {"offset": offset, "timeout": 30}, timeout=35)
        if not result or not result.get("ok"):
            time.sleep(5)
            continue

        for update in result.get("result", []):
            offset = update["update_id"] + 1
            message = update.get("message")
            if message:
                handle_message(message)
        save_offset(offset)


if __name__ == "__main__":
    main()
