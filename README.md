# Trading Journal & Bot

Journal de trading (dashboard) + bot Python (SMC / Order Blocks) hébergés sur un Raspberry Pi 4, exposés via Cloudflare Tunnel.

## Structure

- `backend/` — API FastAPI (trades, comptes, stats)
- `frontend/` — Dashboard React + Vite
- `bot/` — Bot de trading Python (à venir)
- `infra/` — Docker Compose, config Nginx, Cloudflare Tunnel
- `docs/` — Guide de setup du Raspberry Pi et notes d'architecture

Voir le plan d'architecture complet dans `.claude/plans` (feuille de route par phases).

## Développement local

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Nécessite une base PostgreSQL locale (voir `infra/docker-compose.yml` pour la config, ou un Postgres local avec les mêmes identifiants dans `backend/.env`).

Appliquer les migrations avant de démarrer l'API :

```bash
alembic upgrade head
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Stack complète via Docker Compose

```bash
cd infra
cp .env.example .env   # renseigner les mots de passe
docker compose up -d --build
```

## Comptes utilisateurs

Pas d'inscription publique : chaque compte est créé à la main, avec un mot de passe
temporaire que l'utilisateur devra changer à sa première connexion.

```bash
# Sur le Pi, ou en local avec le venv backend activé
docker compose exec backend python -m app.scripts.create_user alice@example.com
# demande un mot de passe temporaire, puis crée l'utilisateur
```

Ajouter `--admin` pour un compte administrateur (pas encore utilisé par l'API, réservé
pour de futures fonctionnalités d'administration).

## Déploiement

Un runner GitHub Actions self-hosted tourne en service systemd sur le Pi
(`~/actions-runner`). À chaque push sur `main`, après que les jobs CI (build
backend/frontend) passent, le job `deploy` s'exécute directement sur le Pi :
`git pull` + `docker compose up -d --build` + nettoyage des anciennes images.
Aucun accès SSH entrant n'est nécessaire — le runner va chercher le job chez
GitHub en sortant.
