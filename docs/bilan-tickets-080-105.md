# Bilan des tickets TICK-080 à TICK-105 après la refonte

Comparaison, critère par critère, entre les tickets de `PLAN_AMELIORATION.md` (Sprints 9 à 11) et ce que le code fait réellement au 8 novembre 2026. Chaque point a été vérifié dans le code, pas de mémoire.

**Légende :**
- ✅ fait ;
- 🟡 fait autrement (choix de design différent, à accepter ou non) ;
- ❌ pas fait.

---

## Résumé

| Ticket | Sujet | Proposition |
|---|---|---|
| TICK-080 | Accueil client | **Clore** |
| TICK-081 | Création de course en un écran | **Clore** (remplacé par l'assistant en étapes) |
| TICK-082 | Écran « Coursiers » | **Garder**, réduit à 2 points |
| TICK-083 | Paiement simplifié | **Clore** |
| TICK-084 | Suivi et validation fusionnés | **Clore** (fusion abandonnée volontairement) |
| TICK-085 | Accueil coursier | **Garder**, réduit à 3 points |
| TICK-086 | Proposer mon tarif | **Clore** (fait dans le chat) |
| TICK-087 | Missions du coursier | **Garder**, réduit à 1 point |
| TICK-088 | Gains et notification de paiement | **Clore** |
| TICK-089 | Véhicule et zone du coursier | **Garder** entier |
| TICK-090 | Accueil admin | **Garder**, réduit à 1 point |
| TICK-091 | Gestion des courses (admin) | **Garder** entier |
| TICK-092 | Détail des litiges | **Clore** |
| TICK-093 | Écran unique « Paramètres plateforme » | **Garder**, réduit à 3 points |
| TICK-094 | Utilisateurs, KYC, signalements | **Garder**, réduit à 2 points |
| TICK-103 | Moyens de paiement activables | **Garder** entier |
| TICK-104 | Solde et reversement des gains | **Garder** entier |
| TICK-105 | Versements aux coursiers | **Garder**, en partie préparé |

**À clore : 7 tickets.** À garder : 11, dont 7 fortement réduits.

---

## Sprint 9 : parcours client

### TICK-080 — Accueil client : **clore**
- ✅ Action principale en haut (« Nouvelle course », ou « Preuves à valider » quand une course l'attend).
- ✅ Bouton d'action de chaque course issu du statut (payer, valider, voir les coursiers…).
- ✅ Chargement, état vide et état d'erreur.
- 🟡 Les compteurs (courses actives, terminées, votre note) sont gardés : ce sont de vrais chiffres, utiles.

### TICK-081 — Création en un écran : **clore (remplacé)**
- 🟡 On a fait un **assistant en étapes** (type, besoin, lieu, date, contact, lieu de paiement, vérification) au lieu d'un seul écran. Une question à la fois se lit mieux sur mobile.
- ✅ Date future exigée, toute ville du Cameroun, pré-remplissage depuis le profil.
- ✅ Modification possible tant que la course est publiée.
- ❌ « Création en moins de 30 s » jamais chronométrée.

### TICK-082 — Écran « Coursiers » : **garder (2 points)**
- ✅ Les coursiers qui ont écrit d'abord, avec leur offre (montant, note, vérifié), puis les coursiers disponibles.
- ✅ Toutes les conversations d'une course accessibles ; l'acceptation se fait dans le chat.
- ❌ **Annuler une course publiée** : le serveur le permet, mais **aucun bouton ne le propose au client** (ni avant paiement, ni avant le choix d'un coursier).
- ❌ **Coursiers « proches »** : la liste n'est pas filtrée par zone (dépend de TICK-089).

### TICK-083 — Paiement simplifié : **clore**
- ✅ Tarif en lecture seule, achats facultatifs, total en direct, séquestre expliqué.
- ✅ Bouton « Payer 6 300 XAF », état « Cette course est déjà payée ».
- ✅ En plus : moyens de paiement selon le lieu du client, mode test annoncé.

### TICK-084 — Suivi et validation fusionnés : **clore (fusion abandonnée)**
- 🟡 Le suivi et la validation restent **deux écrans**. La validation est assez dense (preuves, montants, échéance) pour mériter le sien ; le suivi y mène en un clic.
- ✅ Étapes avec litige, compte à rebours de validation automatique, galerie plein écran, confirmation avant le versement, puis notation.
- ✅ Bouton de validation seulement quand les preuves sont envoyées ; litige accessible.

---

## Sprint 10 : parcours coursier

### TICK-085 — Accueil coursier : **garder (3 points)**
- ✅ Bandeau d'identité compact ; « Proposer » renvoie vers la vérification tant que l'identité n'est pas validée.
- ❌ **Nouvelles demandes en premier** : aujourd'hui, les missions passent avant les demandes.
- ❌ **Rafraîchissement automatique des demandes** (toutes les 20 s et au retour sur l'onglet) : seules les pastilles de messages se rafraîchissent.
- ❌ **Filtre par zone** (dépend de TICK-089).

### TICK-086 — Proposer mon tarif : **clore (fait dans le chat)**
- 🟡 Le détail d'une demande est une fenêtre, pas un écran. Le bouton « Discuter et proposer mon tarif » ouvre directement le chat.
- ✅ Dans le chat : tarif minimum affiché, net estimé après commission, offre modifiable tant que la course est ouverte.

### TICK-087 — Missions : **garder (1 point)**
- ✅ Statut clair et action suivante (preuves, chat, noter), « Je démarre la course ».
- ✅ Courses non retenues : « Offre déclinée », sans bouton de preuves, discussion fermée.
- 🟡 Une seule liste triée plutôt que trois sections : suffisant avec les badges.
- ❌ **Ouvrir un litige ou signaler depuis la carte de mission** : aujourd'hui seulement depuis le chat ou l'envoi des preuves.

### TICK-088 — Gains et notification : **clore**
- ✅ Montants réels (net après commission, achats à part), « En attente » / « Libéré » (« Versé » quand un vrai paiement sera branché).
- ✅ E-mails au coursier à l'acceptation de son offre et au paiement.
- ✅ Pastille sur l'onglet « Demandes ».

### TICK-089 — Véhicule et zone du coursier : **garder (entier)**
- ❌ Rien n'est enregistré. Les champs ont même été retirés de l'inscription, car ils n'étaient jamais envoyés au serveur.
- C'est la base des « coursiers proches » (TICK-082) et du filtre par zone (TICK-085).

---

## Sprint 11 : parcours admin

### TICK-090 — Accueil admin : **garder (1 point)**
- ✅ Compteurs réels et cliquables (identités, litiges, signalements), files du plus ancien au plus récent, activité du mois depuis le registre.
- ❌ **Courses bloquées** (en retard, ou argent bloqué depuis plus de 72 h) : pas de compteur. À faire avec TICK-091.

### TICK-091 — Gestion des courses : **garder (entier)**
- ❌ Aucun écran admin pour chercher une course, voir sa chronologie, son registre de séquestre et ses preuves, ni l'annuler et la rembourser.
- C'est aujourd'hui le **plus gros manque de l'espace admin** : on ne peut voir une course que si elle a un litige.

### TICK-092 — Détail des litiges : **clore**
- ✅ Dossier complet : parties nommées, motif, montants, preuves, discussion en lecture.
- ✅ Trois décisions avec « qui reçoit quoi » avant confirmation, partage avec montant vérifié, écriture dans le registre.
- 🟡 Pas de note écrite obligatoire avec la décision. À ajouter seulement si tu veux en garder une trace.

### TICK-093 — Paramètres plateforme : **garder (3 points)**
- ✅ Commissions : taux, tarif minimum, exemple en direct, « s'applique aux nouvelles courses ».
- ✅ Reversements : formats vérifiés, effacement possible, compte principal seulement s'il est renseigné.
- 🟡 Deux écrans au lieu d'un seul : lisible, on peut les garder séparés.
- ❌ **Réglages non modifiables depuis l'écran** : remboursement des frais en cas de remboursement total, délais de preuves, délai de grâce, nombre de prolongations. Ils existent côté serveur.
- ❌ **Historique des changements** (qui a modifié quoi, et quand).
- ❌ Moyens de paiement (voir TICK-103).

### TICK-094 — Utilisateurs, KYC, signalements : **garder (2 points)**
- ✅ Recherche (nom, e-mail, téléphone), noms au lieu des numéros, documents KYC visibles après décision, cartes mobiles, colonne « Courses » remplacée par l'activité réelle.
- ✅ Suspension confirmée, comptes admin protégés ; tendance des gains sans pourcentage inventé.
- ❌ **Motif obligatoire pour une suspension** : la confirmation existe, mais aucun motif n'est demandé ni enregistré.
- ❌ **Pagination** : tous les comptes sont chargés d'un coup. Sans problème aujourd'hui, à faire avant d'avoir beaucoup d'utilisateurs.

### TICK-103 — Moyens de paiement : **garder (entier)**
- ❌ Rien n'est fait. Les paiements sont en simulation, aucun prestataire réel n'est branché.

### TICK-104 — Solde et reversement des gains : **garder (entier)**
- ❌ Rien n'est fait. Les comptes de reversement de l'admin ne sont qu'un mémo.

### TICK-105 — Versements aux coursiers : **garder (préparé)**
- ✅ Les comptes de reversement des coursiers sont enregistrés (vérification d'identité, migration V23) et affichés dans leurs gains.
- ❌ File admin des versements, statuts « en attente / versé » avec référence : à faire avec un vrai prestataire de paiement.

---

## Ce qui manque encore, par ordre de priorité proposé

1. **TICK-091 Gestion des courses (admin)** et le compteur « courses bloquées » de TICK-090. C'est indispensable pour le support au quotidien.
2. **Annuler une course publiée côté client** (TICK-082). C'est petit et très attendu : le serveur sait déjà le faire.
3. **Motif obligatoire pour les suspensions** (TICK-094).
4. **Accueil coursier** (TICK-085) : demandes en premier et rafraîchissement automatique.
5. **Litige et signalement depuis la mission** (TICK-087).
6. **TICK-089 Véhicule et zone**, puis le filtre « coursiers proches » (TICK-082 et TICK-085).
7. **Réglages restants et historique** (TICK-093), puis **pagination** (TICK-094).
8. **Vrais paiements** : TICK-103, puis TICK-104 et TICK-105, quand un prestataire (MTN, Orange, carte) sera choisi.

## Ce qu'il te faut décider

- Es-tu d'accord pour **clore les 7 tickets** proposés : 080, 081, 083, 084, 086, 088, 092 ?
- Acceptes-tu les **choix « fait autrement »** :
  - assistant en étapes ;
  - suivi et validation séparés ;
  - offre dans le chat ;
  - deux écrans de paramètres ?
- Par quoi veux-tu continuer dans la liste ci-dessus ?

Après ta réponse, je mets à jour `PLAN_AMELIORATION.md`, en cochant les tickets clos et en réduisant les autres à ce qui manque, puis `AGENT_CONTEXT.md`.
