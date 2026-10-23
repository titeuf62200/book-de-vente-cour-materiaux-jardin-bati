# Book de vente — Cour matériaux, Jardin & Bâti

**Leroy Merlin Calais — Édition octobre 2026**

Site public : https://titeuf62200.github.io/book-de-vente-cour-materiaux-jardin-bati/

## Périmètre

- 190 références présentes dans la base partagée : **50 Matériaux** et **140 Jardin**.
- 28 sous-rayons : 11 Bâti / Matériaux, 17 Jardin.
- Photos produits, croquis cotés et codes-barres EAN-13 reconstruits à partir de chaque EAN.
- Recherche par référence, EAN et désignation, navigation par sous-rayon.
- Deux éditions A4 distinctes : **PDF Bâti** et **PDF Jardin**.
- Sommaire de chaque book avec repères couleur et page de début de chaque sous-rayon.
- Onglet vertical coloré sur **toute la hauteur** du bord droit de chaque page de produits.
- Couverture distincte par univers avec des photos de références du catalogue.
- Ajout, édition, archivage et restauration des références par un administrateur.

## Données et accès

La version GitHub Pages utilise **Supabase** via `supabase.config.js`.
Le fichier `donnees_catalogue.js` est vide : le catalogue en activité est chargé **après authentification**.
Les modifications faites par les administrateurs sont enregistrées sur le serveur et deviennent visibles après actualisation.

Les collaborateurs autorisés peuvent consulter et générer les PDF ; les administrateurs peuvent également gérer les références et les accès.
La sécurité réelle dépend des politiques d'accès Supabase (RLS), et pas du masquage visuel des boutons.

Le dossier historique `seed/` contient d'anciens fichiers de transfert ; il n'est **pas chargé** par le site publié.
La présence de fichiers ou d'historiques dans un dépôt public doit être prise en compte si les données nécessitent une confidentialité stricte.

## Impression des deux books

Cliquer sur **PDF Bâti actualisé** ou **PDF Jardin actualisé**, puis choisir **Enregistrer au format PDF** dans la fenêtre d'impression du navigateur.

Activer les **graphiques d'arrière-plan** lorsqu'une imprimante ou un navigateur le demande pour conserver les couleurs des intercalaires.

Les PDF sont préparés à la demande à partir des références actives du rayon sélectionné. Les nouvelles références apparaissent dans leur sous-rayon et les numéros de pages du sommaire sont recalculés automatiquement.

Les visuels des couvertures sont les photos des produits enregistrés dans le catalogue, **pas** des photographies réelles du magasin.

## Déploiement

Le dépôt GitHub fournit les fichiers statiques `index.html`, `app.js`, `auth.js`, `styles.css` et la configuration Supabase.
Le fichier `print-intercalaires.js` est un ancien complément conservé dans le dépôt : les intercalaires actifs sont directement intégrés dans `app.js` et `styles.css`.

Le projet est indépendant de l'application **TWO Rayon Jardin**.
