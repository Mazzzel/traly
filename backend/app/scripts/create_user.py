"""Crée un utilisateur directement en base. Pas de formulaire d'inscription :
c'est le seul moyen de créer un compte.

Usage (depuis backend/, venv activé) :
    python -m app.scripts.create_user alice@example.com
"""

import argparse
import datetime
import getpass

from app.auth import hash_password
from app.db import SessionLocal
from app.models import User


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("email")
    parser.add_argument("--admin", action="store_true")
    args = parser.parse_args()

    password = getpass.getpass("Mot de passe temporaire : ")

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == args.email).first():
            raise SystemExit(f"Un utilisateur avec l'email {args.email} existe déjà.")

        user = User(
            email=args.email,
            password_hash=hash_password(password),
            must_change_password=True,
            is_admin=args.admin,
            created_at=datetime.datetime.now(datetime.timezone.utc),
        )
        db.add(user)
        db.commit()
        print(f"Utilisateur {args.email} créé (id={user.id}). Il devra changer son mot de passe à la première connexion.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
