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
- Couvertures distinctes, photoréalistes et validées en JPEG pour les deux univers : `assets/covers/couverture-bati-calais.jpg` et `assets/covers/couverture-jardin-calais.jpg`. Les deux trames restent fixes ; seuls les chiffres du bandeau inférieur (références actives, sous-rayons représentés) sont injectés à chaque génération du PDF.
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

Les PDF sont préparés à la demande à partir des références actives du rayon sélectionné, à raison de **cinq articles au maximum par page de produits** (dans un même sous-rayon). Les nouvelles références apparaissent dans leur sous-rayon et les numéros de pages du sommaire sont recalculés automatiquement. Le nombre de références et de sous-rayons actifs représentés est recalculé sur la couverture et dans les vignettes des univers à chaque actualisation.

Les visuels photoréalistes des couvertures Bâti et Jardin sont des **créations illustratives**, pas des photographies authentifiées du magasin de Calais. Leurs trames sont **figées en JPEG** : aucun dessin simplifié ne les remplace ; seules les deux valeurs « références actives » et « sous-rayons représentés » sont calculées à l’export. Les aperçus des deux couvertures apparaissent dans les vignettes de l’accueil.

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


## Version PWA pour mobiles — 9 novembre 2026

Le site est désormais une **Progressive Web App (PWA)** : icônes 180/192/512 px, `manifest.webmanifest`, service worker limité aux ressources statiques, page informative hors connexion, bouton mobile « Installer l’appli » et interface tactile améliorée. **Aucune application APK ni installation via un store n’est nécessaire.**

- **Android / Chrome** : ouvrir https://titeuf62200.github.io/book-de-vente-cour-materiaux-jardin-bati/ et choisir « Installer l’appli » (ou menu ⋮ > Installer l’application / Ajouter à l’écran d’accueil).
- **iPhone / Safari** : ouvrir l’adresse dans Safari, bouton Partager > Sur l’écran d’accueil > Ajouter.
- **Usage** : l’icône « Book de vente » ouvre une fenêtre dédiée, sans barre d’adresse, sur le catalogue commun.
- **Sécurité** : authentification et droits Supabase existants conservés. Les données produits, photos, sessions et réponses réseau de Supabase ne sont **pas mises en cache par le service worker**.
- **Connexion requise** : l’installation est possible sur mobile ; la consultation authentifiée, la synchronisation, les photos et les PDF issus du catalogue restent dépendants du réseau. La page hors connexion explique cette limite.
- **Mises à jour** : le service worker renouvelle les ressources statiques lors du chargement ; les utilisateurs peuvent refermer/réouvrir l’application pour récupérer la dernière version. Après publication GitHub Pages, une nouvelle installation peut être proposée par le navigateur.

Le périmètre du Book (Matériaux / Jardin, nuanciers, identification EAN/photo locale, croquis, PDF) n’est pas modifié par cette mise en application.


## Coordinateurs et navigation directe — novembre 2026

- **Cédric** et **Sylvie** : seuls coordinateurs/administrateurs habilités à ajouter, modifier, archiver ou supprimer des références. Le serveur confirme leur identité par l'e-mail vérifié.
- **Autres comptes `@leroymerlin.fr`** : accès lecture seule à toutes les références et aux deux PDF, recherche EAN et comparaison de photos depuis le téléphone. La reconnaissance photo locale propose des correspondances et ne garantit pas l'identification exacte.
- **Adresses hors domaine** : aucun accès au catalogue, imposé par la fonction `book_catalog_role()` et par les règles RLS sur `book_catalog_products`. Une inscription Supabase extérieure peut être techniquement créée, mais ne confère aucun accès au Book.
- Menu latéral : les rayons **001 Matériaux / Bâti** et **009 Jardin** démarrent repliés. Un clic sur le rayon affiche ou masque les sous-rayons ; cliquer sur un sous-rayon affiche uniquement ses références, puis amène directement à son entête, sans défilement manuel.
- Les deux niveaux sont accessibles au clavier et sur l'application PWA. L'impression, les intercalaires et le catalogue partagé ne changent pas.

## Configuration des sous-rayons par les coordinateurs — 10 novembre 2026

- Les administrateurs **Cédric** et **Sylvie** disposent d'une icône ⚙ à droite de chaque sous-rayon dans le menu latéral, lorsque le mode modification est actif.
- Chaque fenêtre de configuration permet de changer le **numéro affiché (3 chiffres)** et la **couleur de l'intercalaire**, avec aperçu immédiat et possibilité de revenir aux valeurs d'origine.
- Un même numéro ne peut pas être attribué à deux sous-rayons du même rayon. Les numéros Matériaux et Jardin restent indépendants.
- Les modifications sont conservées dans `public.book_catalog_sections` de Supabase, avec les politiques RLS : lecture pour les utilisateurs habilités, écriture réservée au rôle administrateur via `book_catalog_role()`.
- Le `sector_code` initial reste l'identifiant technique interne des références : changer le numéro visible **ne déplace ni ne supprime les produits** et ne modifie pas leurs croquis, photos ou EAN.
- Les codes visibles et couleurs mis à jour s'appliquent au menu, aux en-têtes du catalogue, aux choix de sous-rayons du formulaire, aux exports Excel, au sommaire et aux liserés colorés des PDF actualisés.
- Les lecteurs n'ont pas accès au bouton de configuration. Les changements sont partagés après synchronisation et visibles après actualisation.


## Croquis et nuanciers enrichis (14/11/2026)

- **154 références actives du Bâti ont été complétées dans la base partagée**, uniquement lorsqu'un croquis était vide. Aucun croquis existant ni photo produit n'a été remplacé. Les nouvelles images sont des **schémas indicatifs, non à l'échelle**, avec une silhouette par grande catégorie (toiture, gouttière, tube, regard, bois, caniveau, etc.) et les seules cotes clairement présentes dans la désignation. Ce ne sont pas des vues techniques certifiées : contrôler les géométries exactes sur les produits.
- Les nuanciers restent liés au catalogue synchronisé. Le module `nuanciers-smart.js` complète les fiches historiques avec les **sections de bois**, **dalles minérales**, **pavés** et **pas japonais** dont les dimensions sont interprétables sans ambiguïté ; il ignore les références dont les mesures ne sont pas suffisamment fiables.
- Les pavés et dalles présentent une **vue de dessus** (1:1 lorsque possible) et une **vue de tranche** distincte avec indication de l'épaisseur. La tranche est réduite, toujours signalée. Les grandes dalles dépassant le format disponible sont présentées à échelle réduite explicitement indiquée.
- Le dessin des pas japonais correspond à une **enveloppe rectangulaire nominale** et non au contour irrégulier réel. Les fiches gardent photo, référence et EAN du catalogue.
- La génération/visualisation du nuancier requiert une actualisation réussie du catalogue Supabase afin d'inclure les nouvelles références.
