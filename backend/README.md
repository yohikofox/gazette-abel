# Registre partagé du Choixpeau

La Gazette reste hébergée sur GitHub Pages. Cette stack ajoute une petite API SQLite au Homelab pour partager les résultats de la cérémonie entre téléphones.

## Portainer

Le fichier `compose.yaml` est destiné à l'environnement `local` de Portainer. Copier `server.py` et `people.json` dans le chemin `GAZETTE_BACKEND_DIR` sur le Homelab, puis importer les variables de `.env.example` dans la stack. Le port de diagnostic est lié à `127.0.0.1` ; le conteneur rejoint aussi le réseau Docker externe `nginx_proxy`. Dans NPM, la destination sera `gazette-abel-api:8000` pour `gazette-api.yolo.yt` en HTTPS. Aucun secret Portainer n'est incorporé à ces fichiers.

## API

- `GET /health` : disponibilité.
- `GET /v1/assignments` : révision globale et résultats partagés.
- `GET /admin/conflicts` : page de suivi des résultats contradictoires, dans la même stack. Elle n’est pas liée depuis la Gazette, mais reste accessible à qui connaît son URL.
- `PUT /v1/assignments/{person_id}` : créer ou remplacer le résultat d'une personne. Corps : `result` au format de la cérémonie, `mutationId` stable pour les tentatives répétées et `baseRevision` (`null` pour un ancien résultat local sans marqueur de synchronisation).

Le premier résultat enregistré pour un prénom est accepté. Un remplacement nécessite la révision courante de ce prénom. Un conflit est enregistré dans le journal de suivi et la réponse HTTP 200 renvoie le résultat commun. Le téléphone garde une copie de son ancien résultat dans son stockage local ; aucun avertissement ne s’affiche dans la cérémonie. Une répétition avec le même `mutationId` est sans effet.

La lecture et l'écriture sont ouvertes conformément au choix du propriétaire. L'API valide les identifiants et le contenu, limite la taille des requêtes et n'accepte les appels depuis le navigateur que pour les origines configurées. L'absence d'authentification n'empêche pas un client HTTP externe d'écrire.

## Synchronisation des téléphones

Le site conserve le format historique `abelSortingCeremonyV1`. Le module `sorting_sync.js` crée un second enregistrement local `abelSortingSyncV1` avec un identifiant d'appareil, les mutations non envoyées, les révisions connues et la dernière synchronisation réussie. Sans marqueur, il propose tous les anciens verdicts au serveur une fois. Il réessaie après une coupure réseau, au retour sur l'onglet et toutes les 45 secondes. Après un conflit, il conserve une sauvegarde locale et affiche le résultat commun sans alerte familiale ; `/admin/conflicts` liste les deux versions.

## État du déploiement

Stack Portainer `gazette-abel-api` créée sur l’environnement `local` (ID 106). NPM : proxy host `gazette-api.yolo.yt` (ID 39), certificat Let’s Encrypt (ID 46). API HTTPS vérifiée sur `/health` et `/v1/assignments`. Le volume `gazette_abel_data` conserve SQLite entre redémarrages.
