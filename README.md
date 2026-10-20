# Heures — suivi des heures et des paiements

Application personnelle pour enregistrer les services d’un restaurant, calculer le salaire à la minute près et suivre ce que l’employeur doit encore.

Les montants sont calculés en centimes entiers. Un paiement est déduit du solde sans effacer l’historique. Les nouvelles heures ouvrent ensuite un nouveau solde.

## Installation

Prérequis : Node.js 20 ou plus récent.

```bash
npm install
```

## Démarrage

```bash
npm run dev
```

L’application s’ouvre sur `http://localhost:5173`.

Autres commandes :

```bash
npm test          # calculs, paiements, persistance, import
npm run build     # vérification TypeScript + build de production
npm run preview   # sert le dossier dist
```

## Utilisation

Au premier lancement, les données réelles sont vides. Le bouton **Voir un exemple fictif** ouvre une démonstration clairement séparée : elle ne mélange pas vos saisies. **Utiliser mes données** revient à votre espace réel.

Le bouton **Ajouter un service** reste accessible en bas de l’écran sur téléphone.

Le solde affiché est toujours :

`total gagné − total payé`

- Aucun paiement : le reste à payer est égal au salaire gagné.
- Paiement partiel : le solde diminue du montant reçu. Les heures équivalentes sont une estimation au taux habituel, pas un décompte d’heures affectées.
- Paiement complet : le solde revient à zéro, l’historique reste.
- Heures suivantes : elles alimentent un nouveau solde.
- Paiement supérieur au solde : une confirmation est demandée, et le surplus est une avance (solde négatif).

Modifier le taux habituel dans les paramètres ne change pas les montants des services déjà enregistrés. Chaque service conserve son propre taux.

## Où sont les données

Tout est enregistré dans le navigateur (`localStorage`), sur cet appareil seulement. Il n’y a pas de synchronisation entre le téléphone et l’ordinateur. Si les données du navigateur sont effacées, l’application les perd.

Utilisez **Paramètres → Sauvegarde JSON** régulièrement. L’import vérifie la structure du fichier et demande une confirmation avant de remplacer le mode ouvert (réel ou démonstration). L’autre mode n’est pas touché.

Les CSV utilisent le point-virgule et un encodage compatible avec Excel en français.

Le relevé mensuel s’ouvre dans **Relevé mensuel (PDF)** : le navigateur propose d’imprimer ou d’enregistrer en PDF.

## Architecture

```text
src/domain     calcul du temps, des centimes, du solde, validation
src/data       démonstration, localStorage, CSV, sauvegarde JSON
src/state      reducer et état de l’application
src/components navigation, formulaires, graphique, calendrier
src/pages      tableau de bord, services, paiements, historique, paramètres, relevé
```

Le contrat `HoursRepository` (`src/data/repository.ts`) isole la sauvegarde. Aujourd’hui il écrit dans `localStorage`. Une version ultérieure peut ajouter un compte Supabase (authentification et synchronisation) en remplaçant cette implémentation, sans changer les écrans ni la règle `solde = gagné − payé`.

Formule figée pour chaque service :

`montant en centimes = arrondi(minutes nettes × taux en centimes / 60)`

La durée nette retire la pause. Si l’heure de fin est avant l’heure de début, le service passe minuit et reste compté sur la date de début.

## Déploiement

Le build produit un site statique dans `dist`.

```bash
npm run build
```

- **Netlify** : publier `dist`. Le fichier `public/_redirects` renvoie toutes les routes vers `index.html`.
- **Vercel** : le fichier `vercel.json` fait la même redirection.

Aucun serveur n’est nécessaire pour cette version.
