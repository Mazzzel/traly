# Monitoring température

Deux scripts autonomes (stdlib Python uniquement, pas de venv nécessaire) qui
partagent leur config via `/etc/temp-monitor.env` :

- **`temp_monitor.py`** — timer systemd toutes les 30s. Alerte Telegram à
  `WARN_TEMP` (def. 70°C, rappel toutes les 10 min tant que ça reste chaud),
  `shutdown -h now` immédiat à `CRITICAL_TEMP` (def. 80°C).
- **`temp_bot.py`** — service en continu (long-polling Telegram, aucun port
  entrant nécessaire) qui répond à la commande `/temp` ou au bouton
  "🌡 Température" avec la température actuelle. N'accepte des commandes que
  du `TELEGRAM_CHAT_ID` configuré, tout autre chat est ignoré.

## Installation sur le Pi

```bash
sudo cp monitoring/temp-monitor.service /etc/systemd/system/
sudo cp monitoring/temp-monitor.timer /etc/systemd/system/
sudo cp monitoring/temp-bot.service /etc/systemd/system/
sudo cp monitoring/99-temp-monitor /etc/sudoers.d/99-temp-monitor
sudo chmod 440 /etc/sudoers.d/99-temp-monitor

# Si /etc/temp-monitor.env n'existe pas encore :
sudo cp monitoring/temp-monitor.env.example /etc/temp-monitor.env
sudo nano /etc/temp-monitor.env   # renseigner TELEGRAM_TOKEN et TELEGRAM_CHAT_ID
sudo chmod 600 /etc/temp-monitor.env

sudo systemctl daemon-reload
sudo systemctl enable --now temp-monitor.timer
sudo systemctl enable --now temp-bot.service

# Vérifier
sudo systemctl status temp-monitor.timer
sudo systemctl status temp-bot.service
journalctl -u temp-bot.service -n 20
```

Tape `/temp` dans la conversation Telegram avec le bot (ou utilise le bouton
qui apparaît après le premier message du service) pour tester.

Le fichier `/etc/temp-monitor.env` contient le token Telegram — volontairement hors
du repo Git (comme `infra/.env`), créé à la main sur le Pi.
