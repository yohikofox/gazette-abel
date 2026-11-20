# La Gazette d’Abel

Version statique de la gazette d’anniversaire d’Abel, avec ses pages en français et en anglais, ses animations et sa tapisserie familiale.

Le dossier `dist/` contient le site prêt à être hébergé. Pour le consulter en local :

```sh
python3 -m http.server 8000 --directory dist
```

Puis ouvrir <http://localhost:8000/>. L’installation comme application nécessite un hébergement HTTPS.

Version déployée depuis GitHub : <https://yohikofox.github.io/gazette-abel/>

Valérie est visible par défaut. Pour masquer son portrait dans la généalogie,
son fil de couple avec Michel et son entrée dans la cérémonie du Choixpeau,
utiliser <https://yohikofox.github.io/gazette-abel/?valerie=0#page5>.
Ce paramètre ne supprime ni ses portraits ni les données familiales sources.

Site historique : <https://abel-gazette-anniversaire-2026.yoann-lorho.chatgpt.site/>

## Déploiement GitOps

Le contenu de `dist/` est la version à publier. Le workflow
`.github/workflows/deploy-pages.yml` déploie automatiquement ce dossier sur
GitHub Pages après chaque push sur `main` qui le modifie. Il n'y a pas de build
sur le Mac au moment du déploiement.

Pour synchroniser une nouvelle version issue du projet Sites local :

```sh
./scripts/sync_from_sites.sh
git add dist
git commit -m "Update Gazette site"
git push origin main
```

Le script copie les fichiers et adapte le menu Partager. Son lien et son QR code
sont calculés dans le navigateur à partir de l'adresse du site : ils fonctionnent
sur GitHub Pages comme sur un domaine personnalisé, sans nouveau build. Si la
source est ailleurs, passer son dossier `dist/` en argument au script.

Dans les paramètres du dépôt GitHub, **Settings → Pages → Build and deployment →
Source** doit être réglé sur **GitHub Actions**. Le workflow utilise uniquement
le `GITHUB_TOKEN` du dépôt ; aucun secret de déploiement personnel n'est requis.

Ce dépôt contient les fichiers diffusés par le site et les scripts de synchronisation.
Les photos sources, les restaurations de travail et les scripts de génération
privés n’y figurent pas. Les portraits et autres médias de cette édition restent
des contenus familiaux ; aucune licence de réutilisation n’est accordée par ce dépôt.
