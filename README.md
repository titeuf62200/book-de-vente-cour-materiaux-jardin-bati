# Book de vente — Cour matériaux, Jardin & Bâti

**Leroy Merlin Calais — Édition octobre 2026**

Site public : https://titeuf62200.github.io/book-de-vente-cour-materiaux-jardin-bati/

## Périmètre

- 190 références présentes dans la base partagée : **50 Matériaux** et **140 Jardin**.
- 28 sous-rayons : 11 Bâti / Matériaux, 17 Jardin.
- Photos produits, croquis cotés et codes-barres EAN-13 reconstruits à partir de chaque EAN.
- Recherche par référence, EAN et désignation, navigation par sous-rayon.
- À l'intérieur de chaque sous-rayon officiel, produits triés alphabétiquement selon leur désignation et leur nom principal (ex. Liteau : L, Madrier : M), y compris pour les PDF générés et les exports Excel.
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


### Authentification indépendante — octobre 2026
Le Book de vente utilise son propre projet Supabase `zxxnvmbcambdnaeeqcyq` (distinct d’Organizeo). Les 190 références ont été copiées en conservant les images et les croquis. Les profils d’authentification sont initialement vides : `cedric.ledez@leroymerlin.fr` et `sylvie.ribery@leroymerlin.fr` ont les droits administrateur à la première inscription confirmée ; les autres inscrits ont des droits de lecture uniquement. Les droits d'écriture sont imposés côté serveur par RLS. Les e-mails de confirmation nécessitent une configuration de redirection Auth vers l’URL GitHub Pages du Book. Ne jamais stocker des mots de passe sur GitHub.


## Nomenclatures officielles 001 / 009 — novembre 2026

- **001 — Matériaux de construction** : 16 sous-rayons officiels numérotés, dont 010 Éléments de construction, 019 Panneaux et dalles et 020 Bois brut.
- **009 — Jardin** : 17 sous-rayons officiels numérotés, dont 056 Sol extérieur et 060 Délimitation de terrain.
- La référence stocke maintenant `sous_rayon_code` en plus de la sous-famille existante `sous_rayon`, sans modifier les photos, croquis, EAN ou désignations.
- Tous les sous-rayons (y compris sans produits) sont visibles dans la navigation et dans le formulaire de création.
- Les PDF sont reconstitués avec un sommaire et des intercalaires numérotés colorés, uniquement pour les sous-rayons contenant des références actives. Les nouveaux articles se placent automatiquement au bon endroit et les pages sont renumérotées.
- Les anciennes références sans classement officiel apparaissent sous « À classer » pour éviter un rangement arbitraire : elles sont visibles et imprimables et peuvent être reclassées en mode administrateur.

## Nuanciers de contrôle dimensionnel — novembre 2026

Deux boutons discrets dans le menu ouvrent les nuanciers **Bâti** (11 coupes de charpente) et **Jardin** (7 coupes de terrasses/lambourdes, 8 pavés et 10 bordures).
Les 36 fiches sont reconstruites d'après les nuanciers A4 du 08/11/2026 dans `nuanciers-data.js`. Le site propose un aperçu avec références, puis une impression A4 par profil (1:1, barrette témoin 50 mm) ou l'enregistrement en PDF via l'impression du navigateur.
**Attention :** il s'agit de sections/gabarits nominaux. Rainures, chanfreins et reliefs ne sont pas représentés précisément. Éviter toute mise à l'échelle ; imprimer à 100 % sans ajustement. La présente version affiche les photos et EAN uniquement si la référence existe dans le catalogue actif. Les fichiers PDF originaux ne sont pas déposés dans GitHub.

## Reconnaissance EAN/photo et atelier de croquis — 9 novembre 2026

Le bouton **Identifier un produit** recherche une référence du book par code EAN-13 ou référence LM. Une caméra peut scanner l'EAN automatiquement si le navigateur supporte l'API locale `BarcodeDetector`. Sinon, l'utilisateur peut saisir le code ou importer une photo. La recherche visuelle utilise des signatures de couleur/contours calculées dans le navigateur pour classer les photos existantes : **les suggestions ne sont pas une identification exacte**. Aucune photo à comparer n'est transmise à une API d'IA payante.

Pour ajouter ou modifier un produit, l'atelier de croquis propose en plus des modèles précédents **32 silhouettes SVG** (brouette, outils, bois, clôtures, pavés, etc.), un mode **dessin libre** au doigt/souris, flèches, lignes, rectangles, gomme, annulation et cotations manuelles positionnables. La nouvelle image PNG du croquis est sauvegardée via le mécanisme de la fiche et utilisée dans les prochains books PDF. Les silhouettes sont indicatives et ne garantissent pas la géométrie exacte des produits.
