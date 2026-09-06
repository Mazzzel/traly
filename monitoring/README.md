# Monitoring température

Script autonome (stdlib Python uniquement, pas de venv nécessaire) qui vérifie la
température CPU du Pi toutes les 30s via un timer systemd :

- `WARN_TEMP` (def. 70°C) : alerte Telegram, puis rappel toutes les 10 min tant que ça reste chaud.
- `CRITICAL_TEMP` (def. 80°C) : alerte Telegram + `shutdown -h now` immédiat.

## Installation sur le Pi

```bash
sudo cp monitoring/temp-monitor.service /etc/systemd/system/
sudo cp monitoring/temp-monitor.timer /etc/systemd/system/
sudo cp monitoring/99-temp-monitor /etc/sudoers.d/99-temp-monitor
sudo chmod 440 /etc/sudoers.d/99-temp-monitor

sudo cp monitoring/temp-monitor.env.example /etc/temp-monitor.env
sudo nano /etc/temp-monitor.env   # renseigner TELEGRAM_TOKEN et TELEGRAM_CHAT_ID
sudo chmod 600 /etc/temp-monitor.env

sudo systemctl daemon-reload
sudo systemctl enable --now temp-monitor.timer

# Vérifier
sudo systemctl status temp-monitor.timer
sudo systemctl start temp-monitor.service   # déclenche un check immédiat
journalctl -u temp-monitor.service -n 20
```

Le fichier `/etc/temp-monitor.env` contient le token Telegram — volontairement hors
du repo Git (comme `infra/.env`), créé à la main sur le Pi.
