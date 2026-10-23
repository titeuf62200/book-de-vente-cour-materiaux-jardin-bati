# Book de vente — Cour matériaux, Jardin & Bâti

**Leroy Merlin Calais — Édition octobre 2026**

- **190 références** : 50 Matériaux, 140 Jardin.
- **28 sous-rayons** : 11 Bâti / Matériaux, 17 Jardin.
- Photos produit, croquis cotés, codes-barres EAN-13.
- Intercalaires et sommaires par sous-rayon.
- Ajout de nouveaux produits par univers et sous-rayon.
- Export Excel et deux exports PDF séparés (Bâti / Jardin).

## Site

Le fichier `index.html` recompose le book autonome depuis 15 fragments `content/part-XX.txt`. Cela permet de conserver les illustrations et les codes-barres en local, sans requête vers une source extérieure.

### Important : sauvegarde

Les modifications ajoutées depuis le site sont enregistrées dans le **navigateur local** (`localStorage`). Elles ne sont **pas synchronisées automatiquement** entre ordinateurs ou avec GitHub : exporter régulièrement les données.

Le site est indépendant du projet `two-rayon-jardin`.

### PDF

Les boutons « PDF Bâti » et « PDF Jardin » génèrent une impression distincte du sous-ensemble demandé. Sur ordinateur ou mobile, sélectionner **Enregistrer au format PDF** dans la boîte d’impression.
