Projet Trading

1. Projet

L’objectif final de ce projet est de développer un site web de type dashboard ainsi qu’un bot de trading en Python.

Site web

Dans un premier temps, je voudrais développer un site web qui fonctionne comme un journal de trading.

Il devra notamment permettre de :

* Enregistrer mes différents trades.
* Suivre l’évolution de mes différents comptes.
* Consulter mes performances.
* Voir mon ratio de trades gagnants/perdants.
* Afficher différents graphiques et statistiques.
* Ajouter progressivement d’autres outils utiles au suivi et à l’analyse de mon trading.

Le site devra également permettre d’accéder au bot et de le configurer via une page dédiée.

Bot de trading

Le bot est la partie la plus importante du projet. Nous le construirons progressivement, étape par étape.

L’objectif initial du bot sera de m’aider dans la stratégie de trading que j’utilise, notamment en :

* Identifiant les Order Blocks.
* Utilisant une logique basée sur le SMC (Smart Money Concepts).
* M’avertissant lorsqu’une configuration correspondant à ma stratégie est détectée.
* Permettant progressivement d’ajouter et d’améliorer les différentes règles de ma stratégie.
* Après une phase d’entraînement et de validation, permettant éventuellement au bot de prendre des trades automatiquement.

À terme, l’objectif serait que le bot puisse gérer automatiquement des trades et faire évoluer un capital, tout en respectant des règles strictes de gestion du risque et de stop-loss.

Le développement commencera obligatoirement sur un compte de démonstration afin de tester et valider le fonctionnement du bot avant toute utilisation éventuelle avec de l’argent réel.

Le bot devra être accessible depuis le site web, avec une interface permettant notamment de :

* Voir son état.
* Consulter les détections effectuées.
* Configurer ses paramètres.
* Activer ou désactiver certaines fonctionnalités.
* Consulter son historique et ses résultats.

⸻

2. Outils et architecture

Je souhaite que l’ensemble du projet fonctionne sur mon Raspberry Pi 4 Model B.

L’objectif est que le Raspberry Pi héberge l’ensemble des composants nécessaires :

* Le front-end du site.
* Le back-end du site.
* Le back-end Python.
* Le bot de trading.
* Les bases de données et autres services nécessaires.

Je voudrais donc déterminer quels sont les meilleurs outils, frameworks et technologies pour avoir une architecture performante, légère et adaptée aux ressources du Raspberry Pi.

J’avais initialement envisagé plusieurs solutions :

* C# avec une API REST / web ou Kotlin.
* Angular pour le front-end.

Ce sont uniquement mes premières idées. Je suis ouvert à utiliser une autre stack si elle est plus adaptée au Raspberry Pi, plus légère, plus simple à maintenir ou plus cohérente pour ce projet.

L’idée est de privilégier une architecture qui reste suffisamment simple et légère pour le Raspberry Pi tout en permettant de faire évoluer le projet progressivement.

Accès au serveur

Je souhaite utiliser Cloudflare Tunnel afin de rendre le site accessible depuis Internet sans avoir à exposer directement le Raspberry Pi.

CI/CD

Je souhaiterais également utiliser GitHub Actions pour automatiser la partie CI/CD.

L’objectif serait notamment de pouvoir :

* Déployer automatiquement les nouvelles versions.
* Éviter autant que possible les interruptions de service lors des déploiements.
* Pouvoir revenir facilement à une version précédente en cas de problème.
* Automatiser les tests et les étapes nécessaires avant un déploiement.

Il faudra donc réfléchir à une stratégie de déploiement permettant d’effectuer des mises à jour sans coupure ou avec une coupure minimale des services.

⸻

3. Environnement actuel

J’ai déjà un Raspberry Pi partiellement configuré.

J’ai notamment créé un accès SSH sécurisé avec une clé SSH, ce qui permet de me connecter directement au Raspberry Pi.

Je dispose également d’un fichier :

guide-raspberry-pi5-server-2.md

Ce fichier contient le guide que j’avais suivi pour configurer le Raspberry Pi.

Je pense m’être arrêté au niveau de la configuration ssh, j'ai du refaire la configuration donc j'ia pas pu aller plus loin mais avec ssh pibot tu peut te connecter, cependant si la passphrase est demander dis moi comment faire pour que je puisse te laisser te connecter, fair un nouveau user ou quoi que ce soit.

Le contenu de ce guide n’est peut-être plus totalement correct ou adapté à la configuration actuelle, mais il peut être utilisé comme point de départ pour :

* Comprendre ce qui avait déjà été configuré.
* Identifier les logiciels et services qui avaient été installés.
* Vérifier l’état actuel du Raspberry Pi.
* Déterminer ce qu’il reste à faire.

Concernant la connexion SSH, le nom de mon Raspberry Pi a depuis été modifié. Il ne faut donc pas se baser sur le nom présent dans le guide pour déterminer comment se connecter au Raspberry Pi.