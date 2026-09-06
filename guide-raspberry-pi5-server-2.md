# Guide complet — Raspberry Pi 5 : Serveur self-hosted avec SSH, Docker & Cloudflare Tunnel

> **Stack cible** : Bot Python (trading OB) · PostgreSQL · Backend Kotlin · Frontend Angular · Cloudflare Tunnel
> **OS** : Raspberry Pi OS Lite 64-bit (Bookworm)

---

## Table des matières

1. [Flash de la carte SD / SSD](#1-flash-de-la-carte-sd--ssd)
2. [Premier démarrage et connexion SSH](#2-premier-démarrage-et-connexion-ssh)
3. [Sécurisation SSH (clés, désactivation mot de passe)](#3-sécurisation-ssh)
4. [Configuration système de base](#4-configuration-système-de-base)
5. [Installation Docker & Docker Compose](#5-installation-docker--docker-compose)
6. [Stack Docker Compose (PostgreSQL + Kotlin + Angular/Nginx)](#6-stack-docker-compose)
7. [Bot Python en systemd](#7-bot-python-en-systemd)
8. [Cloudflare Tunnel](#8-cloudflare-tunnel)
9. [Maintenance & commandes utiles](#9-maintenance--commandes-utiles)
10. [Migration vers un SSD externe](#10-migration-vers-un-ssd-externe)
11. [CI/CD — GitHub Actions + GHCR + déploiement automatique](#11-cicd--github-actions--ghcr--déploiement-automatique)

---

## 1. Flash de la carte SD / SSD

### Télécharger Raspberry Pi Imager

https://www.raspberrypi.com/software/

### Dans l'Imager

1. **Raspberry Pi Device** → `Raspberry Pi 5`
2. **Operating System** → `Raspberry Pi OS (other)` → `Raspberry Pi OS Lite (64-bit)`
3. **Storage** → ta carte SD ou ton SSD (via M.2 HAT)

### Paramètres avancés (icône ⚙️ ou `Ctrl+Shift+X`)

Configurer tout ici évite d'avoir à brancher écran/clavier :

| Paramètre | Valeur conseillée |
|---|---|
| Hostname | `pi5` (ou ce que tu veux) |
| Username | `pi` (ou ton choix) |
| Password | Un mot de passe fort (temporaire) |
| SSH | **Activer** |
| WiFi SSID / Password | Ton réseau si tu n'utilises pas Ethernet |
| Locale | `fr_FR.UTF-8` / `Europe/Paris` |

> **Conseil** : utilise Ethernet si possible pour le Pi serveur. Bien plus stable qu'en WiFi pour PostgreSQL et les WebSockets.

Flash, insère dans le Pi, branche l'alimentation.

---

## 2. Premier démarrage et connexion SSH

### Trouver l'IP du Pi

Depuis ton PC sur le même réseau :

```bash
# Option 1 — via le hostname (fonctionne si ton routeur supporte mDNS)
ping pi5.local

# Option 2 — scanner le réseau
nmap -sn 192.168.1.0/24 | grep -A 1 "Raspberry"

# Option 3 — interface admin de ton routeur (DHCP clients)
```

### Se connecter

```bash
ssh pi@pi5.local
# ou
ssh pi@192.168.1.XXX
```

Accepte l'empreinte (fingerprint) lors de la première connexion.

---

## 3. Sécurisation SSH

L'objectif : **désactiver l'authentification par mot de passe** et utiliser uniquement des clés SSH. C'est la pratique standard pour tout serveur.

### 3.1 Générer une paire de clés sur TON PC (pas sur le Pi)

```bash
# Sur ton PC (Linux/macOS/WSL)
ssh-keygen -t ed25519 -C "pi5-server" -f ~/.ssh/pi5_key

# Deux fichiers créés :
# ~/.ssh/pi5_key       ← clé PRIVÉE (ne jamais partager)
# ~/.ssh/pi5_key.pub   ← clé publique (à copier sur le Pi)
```

> **Windows natif** : lance PowerShell en tant qu'admin, la commande `ssh-keygen` est disponible depuis Windows 10.

### 3.2 Copier la clé publique sur le Pi

```bash
# Depuis ton PC
ssh-copy-id -i ~/.ssh/pi5_key.pub pi@pi5.local

# Si ssh-copy-id n'est pas dispo (Windows natif) :
type $env:USERPROFILE\.ssh\pi5_key.pub | ssh pi@pi5.local "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### 3.3 Tester la connexion par clé AVANT de désactiver le mot de passe

```bash
# Ouvre un NOUVEAU terminal (garde l'ancien ouvert en cas de problème)
ssh -i ~/.ssh/pi5_key pi@pi5.local
```

Si ça se connecte sans demander de mot de passe → parfait, continue.

### 3.4 Configurer le client SSH sur ton PC (confort)

Crée ou édite `~/.ssh/config` (ou `C:\Users\TOI\.ssh\config` sur Windows) :

```
Host pi5
    HostName pi5.local
    User pi
    IdentityFile ~/.ssh/pi5_key
    ServerAliveInterval 60
```

Désormais tu peux faire simplement `ssh pi5`.

### 3.5 Durcir le serveur SSH sur le Pi

```bash
# Sur le Pi
sudo nano /etc/ssh/sshd_config
```

Modifie / ajoute ces lignes :

```
# Désactiver l'authentification par mot de passe
PasswordAuthentication no

# Désactiver le login root
PermitRootLogin no

# Autoriser uniquement ton utilisateur
AllowUsers pi

# Désactiver les méthodes d'auth inutiles
ChallengeResponseAuthentication no
UsePAM no

# Garder les connexions vivantes
ClientAliveInterval 120
ClientAliveCountMax 3
```

```bash
# Vérifier la syntaxe avant de recharger
sudo sshd -t

# Recharger SSH (sans couper la session en cours)
sudo systemctl reload sshd
```

> ⚠️ **Ne ferme PAS ta session SSH existante avant d'avoir testé depuis un nouveau terminal.**

### 3.6 Firewall SSH

```bash
sudo apt install -y ufw

# Règles
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh           # port 22

# Activer (répond yes à la confirmation)
sudo ufw enable
sudo ufw status
```

---

## 4. Configuration système de base

```bash
# Mise à jour complète
sudo apt update && sudo apt full-upgrade -y

# Outils essentiels
sudo apt install -y \
  git curl wget vim htop \
  ca-certificates gnupg lsb-release \
  python3-venv python3-pip \
  tzdata

# Timezone
sudo timedatectl set-timezone Europe/Paris
timedatectl status

# Hostname (si pas fait dans l'Imager)
sudo hostnamectl set-hostname pi5
```

### Swap (important pour la JVM Kotlin)

Le Pi 5 peut manquer de RAM lors des démarrages JVM + Docker. Augmente le swap :

```bash
# Vérifier la config actuelle
sudo dphys-swapfile swapinfo

# Éditer
sudo nano /etc/dphys-swapfile
# Mettre : CONF_SWAPSIZE=2048

# Appliquer
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

### (Optionnel) Boot sur SSD NVMe

Si tu as un M.2 HAT, booter sur NVMe est fortement conseillé pour PostgreSQL :

```bash
# Vérifier que le SSD est détecté
lsblk

# Dans raspi-config → Advanced → Boot Order → NVMe/USB Boot first
sudo raspi-config
```

---

## 5. Installation Docker & Docker Compose

```bash
# Script officiel (le plus simple et fiable)
curl -sSL https://get.docker.com | sh

# Ajouter ton user au groupe docker (évite sudo à chaque commande)
sudo usermod -aG docker $USER

# ⚠️ IMPORTANT : déconnecte-toi et reconnecte-toi pour que le groupe soit actif
exit
# puis : ssh pi5

# Vérifier
docker --version
docker compose version
```

---

## 6. Préparation de la stack sur le Pi

> Cette section prépare l'environnement sur le Pi et crée les fichiers de config dans le repo. **On ne démarre pas encore la stack complète** — le backend nécessite une image Docker buildée par GitHub Actions, ce qui sera fait en section 11. Le démarrage complet est à la fin de la section 11.

---

### 6.1 🖥️ Sur le Pi — Créer les dossiers

```bash
mkdir -p ~/stack/nginx
mkdir -p ~/stack/dist
cd ~/stack
```

```
~/stack/
├── docker-compose.yml       ← synchronisé depuis trade-engine/infra/ via rsync
├── .env                     ← secrets (jamais dans git, créé manuellement ici)
├── nginx/
│   └── default.conf         ← synchronisé depuis trade-engine/infra/nginx/
└── dist/                    ← build Angular déployé par GitHub Actions
```

---

### 6.2 🖥️ Sur le Pi — Créer le fichier `.env`

Ce fichier contient les secrets. Il ne doit **jamais** être dans le repo Git — c'est pour ça qu'on le crée directement sur le Pi à la main.

```bash
nano ~/stack/.env
```

```env
POSTGRES_DB=trading
POSTGRES_USER=bot
POSTGRES_PASSWORD=CHANGE_MOI_mot_de_passe_fort
GITHUB_USERNAME=TON_USERNAME_GITHUB
```

---

### 6.3 💻 Sur ton PC — Créer le repo GitHub

C'est maintenant qu'on crée le repo, avant de créer les fichiers dedans.

**Sur GitHub** — va sur https://github.com/new et crée le repo :

| Paramètre | Valeur |
|---|---|
| Repository name | `trade-engine` |
| Visibility | Private (recommandé) |
| Initialize with README | Non (on le fait nous-mêmes) |
| Add .gitignore | Non (on le crée nous-mêmes) |

**Sur ton PC** — initialise le repo local :

```bash
mkdir trade-engine && cd trade-engine
git init
git branch -M main
```

**Crée le `.gitignore` en premier**, avant tout `git add` :

```bash
# Sur ton PC, à la racine de trade-engine/
nano .gitignore
```

Contenu du `.gitignore` :

```gitignore
# ── Secrets ────────────────────────────────────────────────
.env
.env.*
!.env.example        # on versionne l'exemple mais jamais le vrai

# ── Python (bot) ───────────────────────────────────────────
__pycache__/
*.py[cod]
*.pyo
venv/
.venv/
*.egg-info/
dist/
ob_state.json        # état runtime du bot, pas à versionner

# ── Kotlin / Gradle ────────────────────────────────────────
backend/.gradle/
backend/build/
backend/out/
*.jar
*.class

# ── Angular ────────────────────────────────────────────────
frontend/node_modules/
frontend/dist/
frontend/.angular/
frontend/*.js.map

# ── Docker ─────────────────────────────────────────────────
docker-compose.override.yml

# ── IDE ────────────────────────────────────────────────────
.idea/
.vscode/
*.iml
*.iws
*.ipr
.DS_Store
Thumbs.db

# ── Logs ───────────────────────────────────────────────────
*.log
logs/
```

Crée aussi un `.env.example` pour documenter les variables sans les valeurs réelles :

```bash
nano .env.example
```

```env
# Copier ce fichier en .env et remplir les valeurs
POSTGRES_DB=trading
POSTGRES_USER=bot
POSTGRES_PASSWORD=
GITHUB_USERNAME=
```

Puis crée la structure du repo :

```bash
mkdir -p .github/workflows backend/src/main/kotlin/com/tradeengine frontend bot infra/nginx

# Premier commit avec gitignore
git add .gitignore .env.example
git commit -m "init: gitignore et env.example"

# Lier au repo GitHub
git remote add origin https://github.com/TON_USERNAME_GITHUB/trade-engine.git
git push -u origin main
```

---

### 6.4 💻 Sur ton PC — Créer `infra/docker-compose.yml`

Ce fichier vit dans `trade-engine/infra/` et est synchronisé sur le Pi via rsync. On ne l'édite jamais directement sur le Pi.

```yaml
services:

  postgres:
    image: postgres:16-alpine
    container_name: postgres
    restart: unless-stopped
    env_file: .env
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      # ── Sans SSD (provisoire, micro SD) ───────────────────
      - pgdata:/var/lib/postgresql/data
      # ── Avec SSD : décommenter cette ligne et commenter celle du dessus (section 10)
      # - /mnt/ssd/pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    # Image buildée par GitHub Actions et poussée sur GHCR (section 11)
    # Ne pas démarrer ce service avant d'avoir fait le premier push (section 11.8)
    image: ghcr.io/${GITHUB_USERNAME}/trade-engine-backend:latest
    container_name: backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    env_file: .env
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/${POSTGRES_DB}
      DB_USER: ${POSTGRES_USER}
      DB_PASSWORD: ${POSTGRES_PASSWORD}
    # Pas de ports exposés publiquement — cloudflared s'en charge

  frontend:
    image: nginx:alpine
    container_name: frontend
    restart: unless-stopped
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    ports:
      - "127.0.0.1:4200:80"    # Local uniquement, cloudflared fait le bridge

volumes:
  pgdata:

networks:
  default:
    name: stack_net
```

---

### 6.5 💻 Sur ton PC — Créer `infra/nginx/default.conf`

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Angular routing — redirige tout vers index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API vers le backend Ktor
    location /api/ {
        proxy_pass http://backend:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }
}
```

Commite ces fichiers :

```bash
git add infra/
git commit -m "infra: docker-compose et nginx config"
git push
```

---

### 6.6 💻 Sur ton PC → 🖥️ Sur le Pi — Synchroniser les fichiers

```bash
# Sur ton PC, depuis la racine de trade-engine/
rsync -avz infra/ pi5:~/stack/
```

À refaire à chaque modification de `docker-compose.yml` ou `nginx/default.conf`.

---

### 6.7 🖥️ Sur le Pi — Démarrage partiel (PostgreSQL uniquement)

On vérifie que PostgreSQL fonctionne. Le backend et le frontend seront démarrés à la section 11 une fois l'image disponible sur GHCR.

```bash
cd ~/stack
docker compose up -d postgres
docker compose logs postgres
# ✅ Doit afficher : "database system is ready to accept connections"
```

> **Le backend ne démarre pas encore** — c'est normal. L'image `ghcr.io/.../trade-engine-backend:latest` n'existe pas tant que GitHub Actions n'a pas fait son premier build (section 11.8). Passe à la section 7.

---

## 7. Bot Python en systemd

### Structure du bot

```bash
mkdir -p ~/ob_bot
# Copier tous les fichiers du bot
rsync -avz ./ob_bot/ pi5:~/ob_bot/

# Sur le Pi
cd ~/ob_bot
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Fichier `.env` du bot

```bash
nano ~/ob_bot/.env
```

```env
TELEGRAM_TOKEN=ton_token_telegram
TELEGRAM_CHAT_ID=ton_chat_id
```

### Service systemd

```bash
sudo nano /etc/systemd/system/ob-bot.service
```

```ini
[Unit]
Description=Order Block Trading Bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/ob_bot
EnvironmentFile=/home/pi/ob_bot/.env
ExecStart=/home/pi/ob_bot/venv/bin/python main.py
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now ob-bot
sudo systemctl status ob-bot
journalctl -u ob-bot -f    # logs en direct
```

---

## 8. Cloudflare Tunnel

### Prérequis

- Un **nom de domaine** dont les nameservers pointent vers Cloudflare (plan gratuit suffit)
- Un **compte Cloudflare** gratuit

Si tu n'as pas de domaine : Cloudflare en vend à ~10€/an, ou tu peux en acheter chez n'importe quel registrar (OVH, Namecheap…) et pointer les NS vers Cloudflare.

### 8.1 Installation de cloudflared

```bash
# Ajouter le dépôt Cloudflare
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null

echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] \
  https://pkg.cloudflare.com/cloudflared any main" \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list

sudo apt update && sudo apt install -y cloudflared
cloudflared --version
```

### 8.2 Authentification

```bash
cloudflared tunnel login
```

Une URL s'affiche dans le terminal. Ouvre-la dans ton navigateur, connecte-toi à Cloudflare et sélectionne ton domaine. Un fichier `cert.pem` est créé automatiquement dans `~/.cloudflared/`.

### 8.3 Création du tunnel

```bash
# Crée le tunnel (une seule fois)
cloudflared tunnel create pi5-tunnel

# Vérifie qu'il est bien créé et note l'UUID affiché
cloudflared tunnel list
```

Un fichier JSON est créé : `~/.cloudflared/<UUID>.json` — c'est le credential du tunnel, ne le supprime pas.

### 8.4 Fichier de configuration

```bash
nano ~/.cloudflared/config.yml
```

```yaml
tunnel: <COLLE-ICI-TON-UUID>
credentials-file: /home/pi/.cloudflared/<COLLE-ICI-TON-UUID>.json

ingress:
  # Frontend Angular
  - hostname: app.tondomaine.com
    service: http://localhost:4200

  # Backend Kotlin (si tu veux exposer l'API directement)
  - hostname: api.tondomaine.com
    service: http://localhost:8080

  # Catch-all obligatoire (toujours en dernier)
  - service: http_status:404
```

> Note : le backend Kotlin est aussi accessible via `/api/` sur le frontend (Nginx proxy), donc exposer `api.tondomaine.com` est optionnel — uniquement si tu veux accéder à l'API directement.

### 8.5 Créer les entrées DNS (CNAME automatiques)

```bash
cloudflared tunnel route dns pi5-tunnel app.tondomaine.com
cloudflared tunnel route dns pi5-tunnel api.tondomaine.com
```

Chaque commande crée un enregistrement CNAME dans ton DNS Cloudflare qui pointe vers le tunnel. Tu peux vérifier dans le dashboard Cloudflare → DNS.

### 8.6 Tester avant de mettre en service

```bash
# Test manuel (Ctrl+C pour arrêter)
cloudflared tunnel run pi5-tunnel
```

Ouvre `https://app.tondomaine.com` dans ton navigateur. Tu dois voir le frontend Angular.

### 8.7 Lancer cloudflared en service systemd

```bash
# Installe le service automatiquement
sudo cloudflared --config /home/pi/.cloudflared/config.yml service install

sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
journalctl -u cloudflared -f
```

### Schéma final du trafic

```
Internet
    │
    ▼
Cloudflare Edge  (HTTPS automatique, DDoS protection)
    │  tunnel chiffré sortant
    ▼
Pi 5 — cloudflared (:4200 / :8080)
    │
    ├── Nginx (Docker) :4200
    │     ├── /         → Angular dist/
    │     └── /api/     → proxy → backend:8080
    │
    ├── Backend Kotlin (Docker) :8080
    │     └── → postgres:5432 (réseau Docker interne)
    │
    └── Bot Python (systemd)
          └── → Binance WebSocket + Telegram
```

**Aucun port n'est ouvert sur ton routeur.** Ton IP publique reste cachée derrière Cloudflare.

---

## 9. Maintenance & commandes utiles

### SSH

```bash
ssh pi5                          # connexion rapide (avec config ~/.ssh/config)
scp fichier.jar pi5:~/stack/     # copier un fichier
rsync -avz dist/ pi5:~/stack/dist/  # synchroniser le build Angular
```

### Docker

```bash
docker compose ps                # état des services
docker compose logs -f backend   # logs d'un service
docker compose restart backend   # redémarrer un service
docker compose pull              # mettre à jour les images
docker compose down && docker compose up -d  # restart complet
docker exec -it postgres psql -U bot -d trading  # accès psql
```

### Bot Python

```bash
sudo systemctl status ob-bot
sudo systemctl restart ob-bot
journalctl -u ob-bot -f          # logs en direct
journalctl -u ob-bot --since "1 hour ago"
```

### Cloudflare Tunnel

```bash
sudo systemctl status cloudflared
journalctl -u cloudflared -f
cloudflared tunnel list          # état des tunnels
cloudflared tunnel info pi5-tunnel
```

### Système

```bash
htop                             # CPU / RAM / processus
df -h                            # espace disque
free -h                          # RAM / swap
sudo dmesg | tail -20            # messages kernel récents
sudo apt update && sudo apt upgrade -y  # mise à jour système
```

### Redéployer le backend Kotlin

```bash
# Sur ton PC de dev
./gradlew bootJar  # ou shadowJar selon ton setup
scp build/libs/backend.jar pi5:~/stack/backend.jar
ssh pi5 "docker compose -f ~/stack/docker-compose.yml restart backend"
```

### Redéployer le frontend Angular

```bash
# Sur ton PC de dev
ng build --configuration production
rsync -avz dist/mon-app/ pi5:~/stack/dist/
# Nginx sert les fichiers statiques directement, pas de restart nécessaire
```

---

## Récapitulatif des ports internes

| Service | Port | Accessible depuis |
|---|---|---|
| PostgreSQL | 5432 | Réseau Docker interne uniquement |
| Backend Kotlin | 8080 | Docker interne + localhost (cloudflared) |
| Nginx/Angular | 4200 | localhost uniquement (127.0.0.1) |
| SSH | 22 | Réseau local (via ufw) |
| cloudflared | — | Connexion sortante uniquement |

Aucun port n'est ouvert publiquement sur le routeur.

---

## 10. Migration vers un SSD externe

> **Quand faire ça** : dès que tu as ton SSD. La micro SD reste pour booter, le SSD prend en charge le swap et les données PostgreSQL — les deux opérations les plus intensives en écriture.

### Ce qu'on va faire

```
Micro SD  →  système + boot (inchangé)
SSD       →  swap (2 Go) + données PostgreSQL + données Docker
```

---

### 10.1 Brancher et repérer le SSD

```bash
lsblk
```

Résultat typique :
```
NAME        MAJ:MIN RM   SIZE RO TYPE MOUNTPOINT
mmcblk0     179:0    0  29.7G  0 disk
├─mmcblk0p1 179:1    0   512M  0 part /boot/firmware
└─mmcblk0p2 179:2    0  29.2G  0 part /
sda           8:0    0 931.5G  0 disk   ← ton SSD
```

> Si tu vois `sda`, `sdb`, etc. — vérifie la taille pour identifier le bon disque.

---

### 10.2 Partitionner le SSD

On crée deux partitions :
- **sda1** : données (PostgreSQL, Docker volumes) — la majorité de l'espace
- **sda2** : swap — 4 Go suffisent largement

```bash
sudo fdisk /dev/sda
```

Dans fdisk, tape ces commandes une par une :

```
g        # nouvelle table de partition GPT
n        # nouvelle partition
1        # numéro 1
(Entrée) # début par défaut
+200G    # 200 Go pour les données (adapte selon la taille de ton SSD)
n        # nouvelle partition
2        # numéro 2
(Entrée) # début par défaut
+4G      # 4 Go pour le swap
w        # écrire et quitter
```

---

### 10.3 Formater les partitions

```bash
# Partition données en ext4
sudo mkfs.ext4 /dev/sda1

# Partition swap
sudo mkswap /dev/sda2
```

---

### 10.4 Monter la partition données

```bash
sudo mkdir -p /mnt/ssd

sudo mount /dev/sda1 /mnt/ssd

# Créer les dossiers qui vivront sur le SSD
sudo mkdir -p /mnt/ssd/pgdata
sudo mkdir -p /mnt/ssd/docker-volumes
```

---

### 10.5 Montage automatique au démarrage (fstab)

```bash
# Récupérer les UUID des deux partitions
sudo blkid /dev/sda1
sudo blkid /dev/sda2
```

Résultat exemple :
```
/dev/sda1: UUID="a1b2c3d4-..." TYPE="ext4"
/dev/sda2: UUID="e5f6g7h8-..." TYPE="swap"
```

```bash
sudo nano /etc/fstab
```

Ajoute ces deux lignes à la fin (remplace les UUID par les tiens) :

```
UUID=a1b2c3d4-...  /mnt/ssd  ext4  defaults,noatime  0  2
UUID=e5f6g7h8-...  none      swap  sw                0  0
```

> `noatime` = ne pas écrire la date d'accès à chaque lecture de fichier. Réduit les écritures sur le SSD inutilement.

```bash
# Tester sans redémarrer
sudo mount -a
# Si aucune erreur → fstab est correct
```

---

### 10.6 Activer le swap sur le SSD

```bash
# Désactiver l'ancien swap sur la SD
sudo dphys-swapfile swapoff
sudo systemctl disable dphys-swapfile

# Activer le swap de la partition SSD
sudo swapon /dev/sda2

# Vérifier
free -h
swapon --show
```

---

### 10.7 Pointer Docker vers le SSD

Par défaut Docker stocke tout dans `/var/lib/docker` sur la SD. On le redirige vers le SSD :

```bash
# Arrêter Docker s'il tourne
sudo systemctl stop docker

# Copier les données existantes (si Docker était déjà utilisé)
sudo rsync -avz /var/lib/docker/ /mnt/ssd/docker-volumes/

# Configurer Docker pour utiliser le nouveau chemin
sudo nano /etc/docker/daemon.json
```

```json
{
  "data-root": "/mnt/ssd/docker-volumes"
}
```

```bash
sudo systemctl start docker
docker info | grep "Docker Root Dir"
# Doit afficher : Docker Root Dir: /mnt/ssd/docker-volumes
```

---

### 10.8 Pointer PostgreSQL vers le SSD

Dans ton `docker-compose.yml`, change le volume PostgreSQL :

```yaml
  postgres:
    image: postgres:16-alpine
    volumes:
      - /mnt/ssd/pgdata:/var/lib/postgresql/data   # ← SSD au lieu du volume Docker
```

```bash
cd ~/stack
docker compose down
docker compose up -d postgres
docker compose logs postgres  # vérifier que PostgreSQL démarre bien
```

---

### 10.9 Vérification finale

```bash
# Tout ce qui est monté
df -h

# Swap actif
swapon --show

# Vérifier que PostgreSQL écrit bien sur le SSD
ls /mnt/ssd/pgdata/

# Utilisation du SSD en temps réel
iostat -x 1   # (apt install sysstat si manquant)
```

Résultat attendu de `df -h` :
```
Filesystem      Size  Used Avail Use% Mounted on
/dev/mmcblk0p2   29G  3.5G   24G  13% /          ← SD : système
/dev/sda1       197G  1.2G  186G   1% /mnt/ssd   ← SSD : données
```

---

### Récapitulatif SD vs SSD

| Élément | Stockage | Raison |
|---|---|---|
| Système (OS, services) | Micro SD | Lectures majoritairement, peu d'écritures |
| Boot | Micro SD | Obligatoire |
| Swap | SSD (partition) | Écritures fréquentes → SSD bien plus rapide |
| PostgreSQL data | SSD | I/O intensif, critique pour les perfs |
| Docker volumes | SSD | Images, containers, volumes applicatifs |
| Bot Python | Micro SD | Peu d'I/O disque |

---

## 11. CI/CD — GitHub Actions + GHCR + déploiement automatique

> **Objectif** : à chaque push sur `main`, GitHub Actions build une image Docker du backend Ktor, la pousse sur GitHub Container Registry (GHCR), puis le Pi télécharge la nouvelle image et redémarre le container automatiquement.

---

### 11.1 Structure du mono-repo

```bash
# Sur ton PC de dev
mkdir trade-engine && cd trade-engine
git init
```

Structure cible :

```
trade-engine/
├── .github/
│   └── workflows/
│       ├── backend.yml      # CI/CD backend Ktor
│       └── frontend.yml     # CI/CD frontend Angular
├── backend/                 # Ktor
│   ├── Dockerfile
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   └── src/
├── frontend/                # Angular
│   ├── Dockerfile
│   └── src/
├── bot/                     # Bot Python (déployé via SSH séparément)
│   └── ...
├── infra/
│   ├── docker-compose.yml   # Stack Pi
│   └── nginx/
│       └── default.conf
└── .gitignore
```

```bash
mkdir -p .github/workflows backend frontend bot infra/nginx
```

---

### 11.2 Projet Ktor minimal

```bash
cd backend
```

**`settings.gradle.kts`**

```kotlin
rootProject.name = "trade-engine-backend"
```

**`build.gradle.kts`**

```kotlin
plugins {
    kotlin("jvm") version "2.0.0"
    id("io.ktor.plugin") version "2.3.12"
}

group = "com.tradeengine"
version = "0.0.1"

application {
    mainClass.set("com.tradeengine.ApplicationKt")
}

repositories {
    mavenCentral()
}

dependencies {
    implementation("io.ktor:ktor-server-core")
    implementation("io.ktor:ktor-server-netty")
    implementation("io.ktor:ktor-server-content-negotiation")
    implementation("io.ktor:ktor-serialization-kotlinx-json")
    implementation("ch.qos.logback:logback-classic:1.4.14")

    // PostgreSQL
    implementation("org.postgresql:postgresql:42.7.3")
    implementation("org.jetbrains.exposed:exposed-core:0.51.1")
    implementation("org.jetbrains.exposed:exposed-jdbc:0.51.1")
}
```

**`src/main/kotlin/com/tradeengine/Application.kt`**

```kotlin
package com.tradeengine

import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.response.*
import io.ktor.server.routing.*

fun main() {
    embeddedServer(Netty, port = 8080, host = "0.0.0.0") {
        routing {
            get("/health") {
                call.respondText("OK")
            }
        }
    }.start(wait = true)
}
```

---

### 11.3 Dockerfile du backend

**`backend/Dockerfile`**

```dockerfile
# ── Étape 1 : build ──────────────────────────────────────────
FROM gradle:8.7-jdk21-alpine AS builder
WORKDIR /app
COPY . .
RUN gradle shadowJar --no-daemon

# ── Étape 2 : image finale légère ────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Créer un user non-root
RUN addgroup -S ktor && adduser -S ktor -G ktor
USER ktor

COPY --from=builder /app/build/libs/*-all.jar app.jar

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/health || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]
```

> Le build en deux étapes (multi-stage) : la première image contient Gradle + JDK (lourde, ~500 Mo), la seconde contient uniquement le JRE + le JAR final (~180 Mo). C'est la deuxième qui est poussée sur GHCR.

---

### 11.4 GitHub Actions — pipeline backend

**`.github/workflows/backend.yml`**

```yaml
name: Backend CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'          # Se déclenche uniquement si le backend change
  workflow_dispatch:          # Permet de lancer manuellement depuis GitHub

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository_owner }}/trade-engine-backend

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write         # Nécessaire pour pousser sur GHCR

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}  # Token auto-généré par GitHub

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-          # Tag unique par commit (ex: sha-a1b2c3d)
            type=raw,value=latest         # Tag latest toujours à jour

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          # Cache des layers Docker entre les builds (plus rapide)
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deploy on Pi via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PI_HOST }}
          username: ${{ secrets.PI_USER }}
          key: ${{ secrets.PI_SSH_KEY }}
          script: |
            cd ~/stack
            # Télécharger la nouvelle image
            docker pull ghcr.io/${{ env.IMAGE_NAME }}:latest
            # Redémarrer uniquement le backend (les autres services continuent)
            docker compose up -d --no-deps backend
            # Nettoyer les anciennes images
            docker image prune -f
```

---

### 11.5 Configurer les secrets GitHub

Sur GitHub → ton repo `trade-engine` → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Valeur |
|---|---|
| `PI_HOST` | `192.168.1.74` (ou ton domaine Cloudflare si accessible depuis internet) |
| `PI_USER` | `Raspberry-Bot-Trading` (ton username Pi) |
| `PI_SSH_KEY` | Contenu de `~/.ssh/pi5_key` (la clé **privée**) |

Pour récupérer la clé privée :

```bash
# Sur ton PC
cat ~/.ssh/pi5_key
# Copie tout le contenu (-----BEGIN OPENSSH PRIVATE KEY----- ... -----END OPENSSH PRIVATE KEY-----)
```

> `GITHUB_TOKEN` est automatiquement fourni par GitHub, pas besoin de le créer.

---

### 11.6 Mettre à jour docker-compose.yml

Dans `infra/docker-compose.yml`, le backend pointe maintenant vers l'image GHCR :

```yaml
services:

  postgres:
    image: postgres:16-alpine
    container_name: postgres
    restart: unless-stopped
    env_file: .env
    volumes:
      - /mnt/ssd/pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: ghcr.io/TON_USERNAME_GITHUB/trade-engine-backend:latest
    container_name: backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    env_file: .env
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/${POSTGRES_DB}
      DB_USER: ${POSTGRES_USER}
      DB_PASSWORD: ${POSTGRES_PASSWORD}
    # Pas de ports exposés publiquement, cloudflared s'en charge

  frontend:
    image: nginx:alpine
    container_name: frontend
    restart: unless-stopped
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
    ports:
      - "127.0.0.1:4200:80"

volumes:
  pgdata:
```

---

### 11.7 Autoriser le Pi à télécharger depuis GHCR

Par défaut les images GHCR d'un repo privé nécessitent une authentification :

```bash
# Sur le Pi — créer un Personal Access Token GitHub
# GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
# Scopes nécessaires : read:packages

echo "TON_GITHUB_TOKEN" | docker login ghcr.io -u TON_USERNAME_GITHUB --password-stdin
```

Si ton repo est **public**, cette étape n'est pas nécessaire.

---

### 11.8 Premier push et démarrage complet de la stack

C'est ici qu'on finalise ce qui a été préparé en section 6. Suis les étapes dans l'ordre.

**Étape 1 — Pousser le repo sur GitHub**

```bash
# Sur ton PC, depuis la racine de trade-engine/
git add .
git commit -m "init: mono-repo trade-engine"
git branch -M main
git remote add origin https://github.com/TON_USERNAME_GITHUB/trade-engine.git
git push -u origin main
```

**Étape 2 — Surveiller le pipeline GitHub Actions**

Va sur `https://github.com/TON_USERNAME_GITHUB/trade-engine/actions`

Tu verras le workflow **Backend CI/CD** se déclencher automatiquement. Il doit passer par ces étapes :
```
✅ Checkout
✅ Log in to GHCR
✅ Extract metadata
✅ Build and push Docker image
✅ Deploy on Pi via SSH
```

Le build prend ~3-5 minutes la première fois (téléchargement des dépendances Gradle). Les suivants seront plus rapides grâce au cache.

**Étape 3 — Vérifier que l'image est disponible sur GHCR**

```bash
# Sur le Pi
docker pull ghcr.io/TON_USERNAME_GITHUB/trade-engine-backend:latest
# ✅ Doit télécharger l'image sans erreur
```

**Étape 4 — Démarrage complet de la stack**

```bash
# Sur le Pi
cd ~/stack

# Démarrer tous les services (postgres tourne déjà depuis la section 6)
docker compose up -d

# Vérifier que tout est UP
docker compose ps
```

Résultat attendu :
```
NAME        IMAGE                                          STATUS
postgres    postgres:16-alpine                             healthy
backend     ghcr.io/.../trade-engine-backend:latest        running
frontend    nginx:alpine                                   running
```

**Étape 5 — Vérifier les logs**

```bash
docker compose logs -f backend
# ✅ Doit afficher le démarrage Ktor : "Application started"

docker compose logs -f postgres
# ✅ "database system is ready to accept connections"
```

**Étape 6 — Tester le healthcheck**

```bash
# Sur le Pi
curl http://localhost:8080/health
# ✅ Doit répondre : OK
```

Si tout répond correctement, ta stack est opérationnelle. Passe à la section 8 pour Cloudflare Tunnel.

---

### 11.9 Workflow au quotidien

```
Tu modifies le backend sur ton PC
        │
        ▼
git push origin main
        │
        ▼
GitHub Actions (ubuntu-latest)
  → gradle shadowJar
  → docker build (multi-stage)
  → docker push ghcr.io/.../trade-engine-backend:latest + :sha-abc123
        │
        ▼ (SSH vers le Pi)
Pi
  → docker pull ghcr.io/.../trade-engine-backend:latest
  → docker compose up -d --no-deps backend
  → ancien container remplacé (~2-3s de coupure)
  → docker image prune
```

### Rollback en cas de problème

```bash
# Sur le Pi — revenir à un commit précédent
# Trouve le tag sha- dans GitHub Packages ou les logs Actions
docker compose stop backend
docker compose run --rm -e IMAGE_TAG=sha-abc123 backend
# ou directement dans docker-compose.yml : changer :latest en :sha-abc123
docker compose up -d --no-deps backend
```
