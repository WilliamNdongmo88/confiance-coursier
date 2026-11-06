# PLAN D'AMÉLIORATION — ConfianceCoursier
> Rédigé le : 2026-11-05 — après revue complète du code (Sprints 0 → 6)
> Périmètre revu : `backend/` (≈109 classes Java, migrations V1→V9), `frontend/src/app` (48 fichiers TS), `maquette-v2/`
> Méthode : lecture du code + croisement front ↔ back + specs V4. Les anomalies 🔴 ont été re-vérifiées ligne par ligne.
> Convention tickets : identique à `TICKETS.md` — [BE] Backend | [FE] Frontend | [FULL] les deux. Numérotation à partir de **TICK-051**.

---

## 0. RÉSUMÉ EXÉCUTIF

L'application a beaucoup de briques (auth + OTP + refresh, KYC MinIO, chat STOMP, preuves, escrow simulé, litiges, signalements, notation, admin, notifications). **Mais le parcours de bout en bout est cassé.** Les tests manuels montrent donc des anomalies, pour trois raisons structurelles :

1. **Le coursier n'est jamais assigné à la course.** Seul `accept-offer` (`OfferService.java:128`) renseigne `course.courierId`, et le frontend ne l'appelle jamais. Après paiement, `courierId = null`, donc le dépôt de preuves, le litige et la notation échouent pour le coursier.
2. **Le modèle d'offre est incohérent.** Trois mécanismes coexistent :
   - de fausses offres à `0.01 XAF` créées par « Choisir et discuter » / « Accepter la mission » (par le client lui-même dans `select-courier`, ce qui échoue sur le contrôle KYC) ;
   - de vraies offres qui ne sont que des `ChatMessage` de type OFFER ;
   - un montant payé lu dans l'URL (`?amount=`) et cru par le serveur.
3. **La sécurité de l'argent et des accès n'est pas assurée.**
   - On peut s'inscrire avec `role: "ADMIN"`.
   - Le WebSocket est public et l'expéditeur est falsifiable.
   - N'importe quel utilisateur connecté peut résoudre un litige ou traiter un signalement.
   - Les suspensions sont sans effet.
   - La résolution d'un litige ne fait pas bouger l'escrow.

**Recommandation :** geler les nouvelles fonctionnalités. Il faut d'abord stabiliser le **cœur métier** : offre → acceptation → paiement → escrow → preuves → validation/litige (Sprint 7). On reconstruit ensuite l'UI **mobile-first** autour d'un parcours linéaire par rôle (Sprints 8 à 11), puis viennent les tests et la documentation (Sprint 12). Chaque ticket est validé individuellement avant de passer au suivant.

### Décisions validées (2026-11-05)
| # | Décision |
|---|----------|
| D1 | CSS : on garde les CSS de la maquette et on retire Tailwind (TICK-076) |
| D2 | Remboursement total suite à un litige : rendre les frais de plateforme est un paramètre admin, **NON par défaut** (`refund_platform_fees_on_full_refund`) |
| D3 | Non-livraison (preuves non soumises) : paramètre admin distinct, **OUI par défaut** (`refund_platform_fees_on_courier_no_show`). Les deux paramètres sont conservés (§3.1 bis, TICK-065b) |
| D4 | Gains plateforme = frais de service client + commission sur le tarif coursier, encaissés sur les comptes marchands puis reversés vers les comptes configurés par l'admin (§4.3) |

### Points solides à conserver
- BCrypt, `JWT_SECRET` sans valeur par défaut, `/api/admin/**` protégé par `hasRole(ADMIN)`, refresh token rotatif dans Redis.
- Contrôles propriétaire/participant corrects sur `getCourseById`, preuves, avis, `getDispute`, `validateCourse`.
- KYC `APPROVED` exigé pour `createOffer`. Preuves : SHA-256 anti-doublon, limite de 10, clés UUID, URLs présignées d'1 h.
- Taux de commission lus en base (`platform_settings`) et figés (snapshot) au moment du paiement.
- Le scheduler ignore bien les courses `DISPUTED`. Flyway + `ddl-auto=validate`. Pas d'énumération de comptes sur forgot/resend.
- Historique responsive (cartes sous 640 px), toasts unifiés, mode sombre.

---

## 1. ANALYSE DES ANOMALIES EXISTANTES

Gravité : 🔴 Critique (parcours bloqué, faille de sécurité ou d'argent) · 🟠 Élevé · 🟡 Moyen · ⚪ Faible.
Chemins abrégés : `BE/` = `backend/src/main/java/com/confiancecoursier/backend/`, `FE/` = `frontend/src/app/`.

### 1.1 Critiques — à corriger avant toute autre chose

| ID | Domaine | Emplacement | Anomalie | Impact | Solution (ticket) |
|----|---------|-------------|----------|--------|-------------------|
| A-01 | Sécurité | `BE/auth/service/AuthService.java:63`, `RegisterRequest.java:24` | Le rôle d'inscription est pris tel quel : `"role":"ADMIN"` est accepté | N'importe qui devient administrateur | Liste blanche CLIENT/COURIER (TICK-051) |
| A-02 | Sécurité | `BE/dispute/api/DisputeController.java:47`, `BE/report/api/ReportController.java:39` | `POST /api/disputes/{id}/resolve` et `/api/reports/{id}/process` sont ouverts à tout utilisateur connecté | Une partie tranche elle-même son litige ou suspend un autre utilisateur | Supprimer ces endpoints (les doublons admin existent) (TICK-052) |
| A-03 | Sécurité | `BE/config/SecurityConfig.java:55`, `BE/chat/api/ChatController.java:36-59` | `/ws/**` en `permitAll`, `senderId`/`roomId` lus dans le payload, type SYSTEM accepté, abonnements non filtrés | Lecture de toutes les conversations, usurpation d'identité, injection de fausses offres | JWT au CONNECT + contrôles SEND/SUBSCRIBE (TICK-055) |
| A-04 | Parcours | `BE/payment/service/PaymentService.java:101-110`, `BE/course/service/OfferService.java:128`, `FE/features/chat/chat.component.ts:945-950` | Le paiement n'assigne jamais le coursier, et `accept-offer` n'est jamais appelé | Preuves refusées (`ProofService:98`), fonds bloqués, parcours impossible | Acceptation explicite de l'offre (TICK-059) |
| A-05 | Argent | `PaymentService.java:87-96`, `FE/features/client/pay/pay.component.ts:320` | `tarifCoursier` vient de `?amount=` dans l'URL et le serveur le croit | Le client paie le montant qu'il veut (ex. 1 XAF) | Montant relu depuis l'offre acceptée en base (TICK-060) |
| A-06 | Argent | `PaymentService.java:76` | La garde n'exclut que IN_PROGRESS/COMPLETED | Repaiement possible en PUBLISHED/PROOFS_SUBMITTED/DISPUTED : sortie de litige, double HOLD | Paiement seulement si ASSIGNED, verrou + idempotence (TICK-060) |
| A-07 | Parcours | `FE/features/client/select-courier/select-courier.component.ts:368` | Le client appelle `createOffer(0.01)` sans `courierId` | « Choisir et discuter » échoue (KYC requis) ou crée une offre au nom du client | Endpoint « ouvrir une conversation » (TICK-057) |
| A-08 | Argent | `BE/dispute/service/DisputeService.java:132-140`, `BE/admin/service/GainsService.java:40` | La résolution d'un litige ne crée aucune ligne de ledger. Un remboursement passe en COMPLETED et garde `platformFeeAmount`. Le remboursement partiel n'a pas de montant | Les fonds ne bougent pas, les gains plateforme sont surévalués | `EscrowService` + statut REFUNDED (TICK-061) |
| A-09 | Argent | `PaymentService.java:96,215-249` | `fraisReels` (achats avancés par le coursier) n'est ni persisté ni reversé | Le coursier n'est jamais remboursé de ses achats, le ledger est déséquilibré | Persister `real_costs` et l'inclure dans le reversement (TICK-060/061) |

### 1.2 Élevées

| ID | Domaine | Emplacement | Anomalie | Solution (ticket) |
|----|---------|-------------|----------|-------------------|
| A-10 | Sécurité | `BE/auth/service/UserDetailsServiceImpl.java:25-54` | `status` SUSPENDED jamais vérifié : les suspensions (admin, 3 signalements, 2 mauvaises notes) sont sans effet ; un admin peut se suspendre lui-même | TICK-053 |
| A-11 | Sécurité | `BE/auth/service/JwtService.java:52` | Le refresh token (7 j) est accepté comme jeton d'accès (pas de claim `typ`) | TICK-054 |
| A-12 | Sécurité | `BE/chat/api/ChatRestController.java:36-52`, `BE/course/api/OfferController` (GET offers) | IDOR : historique de n'importe quel salon et offres concurrentes lisibles, emails exposés | TICK-056 |
| A-13 | Sécurité | `BE/auth/service/OtpService.java`, `AuthController` (verify/resend/admin-otp) | Pas de limite de tentatives sur l'OTP admin, qui est envoyé avant la vérification du mot de passe ; 2FA limitée à `ADMIN_EMAIL` | TICK-066 |
| A-14 | Métier | `OfferService`, `ChatController.java:42`, `chat.component.ts:749` | Tarif minimum coursier codé en dur à 5000 en front et jamais vérifié côté serveur | TICK-058 |
| A-15 | Métier | `BE/dispute/service/DisputeService.java:50-72`, `FE/features/shared/dispute-form` | Litige ouvrable sur une course PUBLISHED/COMPLETED, plusieurs litiges successifs, motifs coursier proposés au client | TICK-062 |
| A-16 | Métier | `BE/report/service/ReportService.java:50-77` | Un même utilisateur peut signaler 3 fois et faire suspendre automatiquement (même un admin) | TICK-063 |
| A-17 | Preuves | `BE/proof/ProofService.java:119`, `FE/features/courier/proofs/proofs.component.ts:34,150` | La 1re preuve lance le compte à rebours de 72 h ; vidéo optionnelle et durée non vérifiée ; 50 Mo autorisés en front contre 10 Mo en back ; renvoi après échec = doublon | TICK-064 |
| A-18 | Chat | `chat.component.ts:686,710` | « Accepter et payer » et « Proposer une offre » restent visibles quel que soit le statut, sur toutes les anciennes offres | TICK-059 |
| A-19 | Chat | `chat.component.ts:957-970`, `FE/core/services/chat.service.ts:20,55,69` | Liens Détails/Signaler/Litige qui renvoient au dashboard ; URL `http://localhost:8080/ws` en dur (mobile et prod KO) ; abonnements STOMP jamais libérés ; message perdu sans avertissement hors connexion | TICK-071 |
| A-20 | Navigation | `FE/app.routes.ts`, `dispute-form:145,171`, `report-user:139,166` | Pas de landing (`''` redirige vers `/login`), pas de 404, `/support` inexistant ; le coursier est renvoyé vers `/client/dashboard` donc vers `/login` après un litige ou un signalement | TICK-072 |
| A-21 | Données | `CourseResponse` | `commissionRate`, `commissionAmount`, `paidAt`, `autoValidateAt`, `courierAmount` absents : frais vides, compte à rebours 72 h jamais affiché ; gains coursier calculés avec 20 % codés en dur | TICK-070 |
| A-22 | Client | `pay.component.ts:343`, `course-detail.component.ts:278`, `dashboard` client | Paiement impossible si frais réels = 0 ; bouton litige désactivé (« Sprint 5 ») ; aucune action sur une course PUBLISHED (modifier, choisir, supprimer) ; un seul chat visible quand plusieurs coursiers ont proposé | TICK-082/083/084 |
| A-23 | Coursier | `FE/features/courier/dashboard/dashboard.component.ts:360,548`, `CourseService.getMyMissions:129` | Bouton Preuves visible par les coursiers non retenus ; nouvelles demandes jamais rafraîchies ; aucune notification de paiement | TICK-085/087 |
| A-24 | Admin | `FE/features/admin/disputes`, `dashboard` | Litige : 2 actions seulement, sans montant, sans confirmation ni preuves ; KPI figés à « — » ; **aucune vue Courses admin** | TICK-090/091/092 |
| A-25 | Notation | `ReviewService`, `PaymentService.applyValidation`, `validate.component.ts:302` | Notation non obligatoire ; inaccessible après une auto-validation à 72 h ; aucun lien coursier vers `rate-client` | TICK-073 |

### 1.3 Moyennes et faibles (corrigées dans les tickets UX ou qualité)

| ID | Anomalie | Ticket |
|----|----------|--------|
| A-26 | `verifyOtp` ne persiste rien, le login n'exige pas d'email vérifié | TICK-074 |
| A-27 | Aucun contrôle de rôle par route (un coursier peut créer et payer une course), toutes les erreurs d'accès renvoient 400, le handler générique ne logge rien | TICK-067 |
| A-28 | Secrets en dur (mot de passe DB, `minioadmin`), `dev-log=true`, jeton de reset loggé, fichiers `.log` versionnés | TICK-068 |
| A-29 | Index manquants (`courses(client_id)`, `courses(courier_id)`, `courses(status,auto_validate_at)`…), pas d'UNIQUE sur l'offre ni sur le litige ouvert ; suppression d'une course avec salons = 500 (FK) ; requêtes N+1 | TICK-069 |
| A-30 | Scheduler 72 h : une seule transaction pour tout le lot, emails dans la transaction, pas de verrou | TICK-065 |
| A-31 | Arrondis XAF à 2 décimales, `paymentMethod` non validé, HOLD qui reste `PENDING`, `paidAt` jamais rempli | TICK-060 |
| A-32 | Statut DISPUTED non géré dans les badges et la timeline ; libellés ASSIGNED incohérents selon les écrans | TICK-077 |
| A-33 | Champs décoratifs : type de course, cases de preuves, véhicule et zone coursier non envoyés ; date passée acceptée | TICK-081/089 |
| A-34 | `.btn-primary { width:100% }` global (`styles.scss:25`) qui étire tous les boutons admin ; 362 `style=""` inline et 65 couleurs en dur ; CSS dupliqués | TICK-076 |
| A-35 | Cibles tactiles de 24 à 34 px (`.btn-row`, `.mission-btn`, en-tête du chat), chat en `100vh` (clavier iOS), pas de barre de navigation basse, shell recréé à chaque page | TICK-075/076 |
| A-36 | Bouton FR/EN factice (aucune i18n), faux badge « Vérifié », faux score « 2/4 », métriques toujours à « — » | TICK-078 |
| A-37 | Admin : `findAll()` sans pagination, IDs au lieu des noms, suspension sans confirmation, documents KYC qui disparaissent après décision, payout qui ne permet pas d'effacer un champ ni ne valide les formats | TICK-093/094 |
| A-38 | `app.html` par défaut inutilisé, `app.spec.ts` qui attend « Hello, frontend » ; tests BE limités à `AuthControllerTest`, sur la base de dev | TICK-096/099 |

### 1.4 Revue de conformité TICK-055 → TICK-061 (2026-11-05) — toutes corrigées

| ID | Ticket | Anomalie trouvée à la revue | Correction |
|----|--------|-----------------------------|------------|
| A-39 | 061 | `V12` en échec (`updated_by` BIGINT ← `'SYSTEM'`) : backend ne démarrait plus | V12 corrigée (jamais appliquée) |
| A-40 | 061 | Ledger déséquilibré : `release` écrivait en positif ; partage avec écart ; gains lus hors ledger | Signes normalisés (V13), invariant vérifié à chaque clôture, gains depuis `PLATFORM_FEE` |
| A-41 | 055 | SEND STOMP direct vers `/topic/**` diffusé sans contrôle | SEND limité à `/app/**` |
| A-42 | 058/059 | `offerId` non persisté ; « Accepter » sur toutes les offres et inactif après rechargement | `chat_messages.offer_id` + `offerStatus` exposé |
| A-43 | 057/058 | Contournement KYC : salon ouvert avec n'importe quel compte, OFFER sans contrôle KYC | Contrôles dans `CourseController` et `OfferService` |
| A-44 | 057/058 | Offres à 0,01 rendues ACTIVE par V10 ; ancien `POST /offers` sans minimum | V13 (REJECTED/SUPERSEDED) + endpoint supprimé |
| A-45 | 058 | 2ᵉ offre d'un coursier bloquée par l'index UNIQUE (INSERT avant UPDATE) | `saveAndFlush` de l'offre remplacée |
| A-46 | 059/060/061 | Pas de verrou sur acceptation, validation, scheduler, litige ; `@Version` absent | `findByIdForUpdate` partout + `@Version` |
| A-47 | 060 | `real_costs` NOT NULL mais `null` à la création → création de course en échec | Valeur par défaut 0 |
| A-48 | 060 | Front : clé d'idempotence régénérée à chaque clic, page payable hors ASSIGNED ; rejeu de clé sans contrôle du client | Corrigé (front + back) |
| A-49 | 055→061 | `ChatSecurityTest` ne compilait plus ; tests exigés absents (IDOR, ledger = 0) | Tests réparés et ajoutés (106 verts) |

---

## 2. AMÉLIORATION DE L'INTERFACE UTILISATEUR

### 2.1 Principes (s'appliquent à tous les écrans)
1. **Une action principale par écran.** Elle est sticky en bas sur mobile, fait 48 px de haut et prend toute la largeur.
2. **Barre de navigation basse à 4 onglets par rôle** sur mobile (moins de 768 px). La sidebar reste sur desktop. Le shell est déclaré **une seule fois** dans une route parente.
3. **CTA piloté par le statut.** Un helper unique `courseStatus(status, role)` renvoie libellé, couleur et action suivante. Il est utilisé partout : dashboard, détail, historique, chat.
4. **Pas de données factices.** Toute métrique sans source réelle est retirée. Pas de faux badge, pas de faux score.
5. **États systématiques** : chargement (skeleton), vide (avec action), erreur (avec « Réessayer »).
6. **Accessibilité** : cibles tactiles d'au moins 44 px, `button` au lieu de `div (click)`, contrastes vérifiés en mode sombre, `100dvh`.
7. **Un seul système de style.** Tokens CSS dans `main.css`. On abandonne Tailwind ou les CSS de maquette (décision dans TICK-076). Plus de `style=""` inline.

### 2.2 Page d'accueil publique (landing minimale)
Aujourd'hui, `''` redirige vers `/login` et la maquette `index.html` n'est pas exploitée. Proposition : **une seule page courte**, sans contenu marketing superflu. Un utilisateur connecté est redirigé directement vers son espace.
```
┌──────────────────────────────┐
│ ConfianceCoursier [Connexion]│
├──────────────────────────────┤
│ Vos courses au Cameroun,     │
│ en toute confiance.          │
│ [ Créer une course ]         │  → /register?role=CLIENT
│ [ Devenir coursier ]         │  → /register?role=COURIER
│ 1 Décrivez   2 Payez (bloqué)│
│ 3 Preuves    4 Validez       │
│ 🔒 Paiement sous séquestre   │
│ FAQ · Support · Mentions     │
└──────────────────────────────┘
```

### 2.3 Client : écrans cibles (mobile)
Barre basse : **Accueil · + Course · Messages · Moi** (l'historique et le profil sont dans « Moi »).

**Accueil client** : « Trouver un coursier » est mis en avant, suivi de « À faire maintenant ». On retire la notice et les 3 métriques.
```
┌──────────────────────────┐
│ Bonjour Awa        (AV)  │
│ ┌──────────────────────┐ │
│ │ Besoin d'un coursier?│ │
│ │[ Trouver un coursier ]│ │  ← CTA principal
│ └──────────────────────┘ │
│ À faire maintenant       │
│ ● Riz Mokolo · Preuves   │
│   [Vérifier & valider >] │
│ ● Colis Bastos · 2 offres│
│   [Voir les offres >]    │
│ En cours (1)       tout >│
├──────────────────────────┤
│ Accueil  +  Messages  Moi│
└──────────────────────────┘
```
**Nouvelle course (un seul écran au lieu de 3 étapes et 7 champs)**
```
┌──────────────────────────┐
│ ← Nouvelle course        │
│ Que faut-il faire ?      │
│ [ textarea 3 lignes    ] │
│ Où ? [Yaoundé▼][Quartier]│
│ Quand ? (•)Dès que poss. │
│         ( )Choisir date  │
├──────────────────────────┤
│[Publier et choisir un    │
│ coursier ]     (sticky)  │
└──────────────────────────┘
```
**Choisir un coursier / offres reçues** : une seule page « Coursiers » avec deux onglets.
```
┌──────────────────────────┐
│ ← Riz Mokolo             │
│ [Offres reçues 2][Proches]│
│ ┌──────────────────────┐ │
│ │(JK) Jean K. ✔ ★4.8   │ │
│ │ 5 000 XAF · 32 courses│ │
│ │ [Discuter] [Accepter]│ │
│ └──────────────────────┘ │
│ ┌──────────────────────┐ │
│ │(PM) Paul M. ✔ ★4.5   │ │
│ │ Pas encore d'offre   │ │
│ │ [ Discuter ]         │ │
│ └──────────────────────┘ │
└──────────────────────────┘
```
**Chat + acceptation**
```
┌──────────────────────────┐
│ ← Jean K. ✔KYC ★4.8   ⋮  │  ⋮ = Détails / Signaler / Litige
│ Riz Mokolo · Négociation │
├──────────────────────────┤
│        Bonjour, dispo 14h│
│ ┌ Offre de Jean ───────┐ │
│ │ Tarif     5 000 XAF  │ │
│ │ [ Accepter & payer ] │ │  ← dernière offre, si PUBLISHED
│ └──────────────────────┘ │
├──────────────────────────┤
│ [Message…        ] [➤]   │  ← sticky, 100dvh
└──────────────────────────┘
```
**Paiement et séquestre**
```
┌──────────────────────────┐
│ ← Paiement sécurisé      │
│ Jean K. · Riz Mokolo     │
│ Tarif coursier  5 000    │  (lu du serveur, non modifiable)
│ Achats à avancer [15000] │  (0 autorisé)
│ Frais service 5%  1 000  │
│ Total         21 000 XAF │
│ 🔒 Fonds bloqués jusqu'à │
│   votre validation (72h) │
│ (•)MTN ( )Orange ( )Carte│
├──────────────────────────┤
│ [ Payer 21 000 XAF ]     │
└──────────────────────────┘
```
**Suivi + validation (détail de course et validation fusionnés)**
```
┌──────────────────────────┐
│ ← Riz Mokolo  Preuves ✔  │
│ ●Payée ●En cours ●Preuves○│
│ Validation auto : 47h12  │
│ [img][img][▶vid][reçu]   │
├──────────────────────────┤
│ [ Tout est OK, libérer ] │  → confirmation → notation
│   Un problème ? Litige   │  → formulaire prérempli
└──────────────────────────┘
```

### 2.4 Coursier : écrans cibles (mobile)
Barre basse : **Demandes · Missions · Gains · Moi** (KYC, historique et aide sont dans « Moi »).
```
ACCUEIL = DEMANDES               DÉTAIL DEMANDE
┌────────────────────────┐       ┌────────────────────────┐
│ ⚠ KYC requis [Vérifier]│       │ ← Achat pharmacie      │
│ Nouvelles demandes (3)↻│       │ Bastos · Auj. 14:00    │
│ ┌────────────────────┐ │       │ Description complète…  │
│ │Pharmacie · Bastos  │ │       │ Votre tarif [ 6000 ]XAF│
│ │14:00 · il y a 3 min│ │       │ Commission 20%  -1 200 │
│ │[ Voir ]  (48px)    │ │       │ Vous recevrez   4 800  │
│ └────────────────────┘ │       │[ PROPOSER MON TARIF ]  │
│ Mission active (1)   ▸ │       │ (grisé si KYC ≠ validé)│
├────────────────────────┤       └────────────────────────┘
│Demandes Missions Gains Moi│
└────────────────────────┘
PREUVES (caméra d'abord)         GAINS
┌────────────────────────┐       ┌────────────────────────┐
│ ← Preuves · Mission #42│       │ Versé ce mois 38 400   │
│ ✔ Payé · fonds bloqués │       │ En attente   4 800 (1) │
│ 1 Vidéo ≤10s * [FILMER]│       │ 03/11 Pharmacie +4 800 │
│ 2 Photos *  [📷][galerie]│     │  brut 6 000 · -20%     │
│ 3 Reçus     [📄]       │       │ [Historique]           │
│ ▓▓▓▓▓░░ 62%            │       └────────────────────────┘
│[ ENVOYER LES PREUVES ] │
└────────────────────────┘
```

### 2.5 Admin : écrans cibles (mobile)
Barre basse : **Accueil · Courses · Utilisateurs · Paramètres**.
```
ACCUEIL = FILES D'ACTIONS        PARAMÈTRES PLATEFORME (écran unique)
┌──────────────────────────┐     ┌──────────────────────────────┐
│ À traiter (9)            │     │ ── Tarification ──           │
│ ⚖ Litiges ouverts     3 >│     │ Frais client (%)     [ 5  ]  │
│ 🛡 KYC en attente      4 >│     │ Commission coursier  [ 20 ]  │
│ ⚠ Courses bloquées    1 >│     │ Tarif min. (XAF)    [ 5000]  │
│ 🚩 Signalements        1 >│     │ ┌ Simulation 15 000+5 000 ┐  │
│ ── Ce mois ──            │     │ │ Client paie  21 000     │  │
│ 38 courses · 112 400 XAF │     │ │ Coursier net  4 000+achats│ │
├──────────────────────────┤     │ │ Plateforme    2 000     │  │
│Accueil Courses Users  ⚙  │     │ └─────────────────────────┘  │
└──────────────────────────┘     │ ── Encaissement plateforme ──│
                                 │ (•)MTN ( )Orange ( )Banque   │
                                 │ Numéro [6XXXXXXXX] ✓         │
                                 │ ⓘ Nouvelles courses seulement│
                                 │ [ Enregistrer ] → confirmer  │
                                 └──────────────────────────────┘
```

### 2.6 Validation des maquettes
Les wireframes ASCII ci-dessus servent de base. Avant chaque ticket UX (Sprints 8 à 11), une **maquette HTML statique** est ajoutée dans `maquette-v3/<role>/<ecran>.html`, à partir des CSS existants. Elle est soumise pour validation et l'implémentation Angular ne démarre qu'une fois la maquette validée (ticket TICK-079b).

---

## 3. OPTIMISATION DU PARCOURS UTILISATEUR

### 3.1 Machine à états cible d'une course (source de vérité unique, côté backend)
```
PUBLISHED ──(client accepte une offre)──► ASSIGNED ──(paiement confirmé, HOLD)──► IN_PROGRESS
    │                                        │                                       │
    └─(client annule)─► CANCELLED ◄──────────┘ (annulation avant paiement)           │
                         (échéance de preuves dépassée) OVERDUE ◄────────────────────┤
                       client : prolonger → IN_PROGRESS │ annuler → REFUNDED       │
                       sans réponse / preuves partielles → DISPUTED (admin)        │
                                                     (coursier: soumission complète) ▼
COMPLETED ◄─(validation client OU 72h)─ PROOFS_SUBMITTED ──(litige)──► DISPUTED
 (RELEASE + PAYOUT)                                                       │ (admin)
                                                      ┌───────────────────┼──────────────────┐
                                               RELEASED→COMPLETED   REFUNDED (REFUND)   SPLIT (montants)
```
Règles imposées par le serveur (chaque transition est une méthode de service unique, sous verrou de ligne) :
- **Offre** : un coursier KYC `APPROVED` a au plus une offre **active** par course, avec un montant au moins égal au tarif minimum. Elle n'est modifiable que tant que la course est PUBLISHED.
- **Acceptation** : réservée au client propriétaire. Elle fixe `courierId`, `acceptedOfferId` et `courseAmount` (lu de l'offre), et passe les autres offres en `REJECTED`.
- **Paiement** : seulement en ASSIGNED. Le montant vient du serveur et une clé d'idempotence est exigée.
- **Litige** : seulement en IN_PROGRESS ou PROOFS_SUBMITTED, un seul litige ouvert par course. Il gèle le scheduler.
- **Clôture** : COMPLETED. La notation devient obligatoire (blocage de l'accès à une nouvelle course tant que l'avis n'est pas laissé, cf. spec §1.5).
- **Échéance de preuves (cas « le coursier n'envoie rien »)** : voir §3.1 bis.

### 3.1 bis Le coursier n'envoie pas ses preuves

**Constat actuel :** rien n'est prévu, ni dans le code ni dans la spec. Le seul scheduler (`ValidationScheduler`, toutes les heures) ne traite que les courses `PROOFS_SUBMITTED`. Une course payée sans preuves reste donc `IN_PROGRESS` **indéfiniment**, avec l'argent du client bloqué en séquestre. Le client ne peut qu'ouvrir un litige manuellement, et l'admin ne voit pas ces courses (pas de vue Courses).

**Principe :** le délai de 72 h de la spec court **à partir de la soumission des preuves** et protège le coursier. Il faut un délai symétrique qui protège le client : l'**échéance de preuves**. Règle absolue : **les fonds ne sont jamais libérés au coursier sans preuves**.

| Étape | Moment (valeurs par défaut, paramétrables par l'admin) | Effet |
|-------|--------------------------------------------------------|-------|
| Échéance calculée | Au paiement : `proof_deadline = max(scheduledAt, paidAt) + 24 h` (« dès que possible » : `paidAt + 24 h`) | Affichée au client et au coursier (compte à rebours) |
| Rappels | Échéance − 6 h, puis à l'échéance | Email + notification au coursier ; information au client |
| Dépassement | `now > proof_deadline` et preuves non soumises | Course → `OVERDUE` (« En retard ») ; le coursier peut encore soumettre tant que le client n'a pas choisi |
| Choix du client | Dès `OVERDUE` | **Prolonger** (+12 h / +24 h, 2 fois max, retour en `IN_PROGRESS`), **Annuler et être remboursé** ou **Ouvrir un litige** |
| Sans réponse | `OVERDUE` depuis 48 h | Aucune preuve → **remboursement automatique** du client. Preuves déposées mais non soumises (ou frais réels > 0, achats possiblement effectués) → **litige automatique** vers l'admin, jamais de remboursement aveugle |
| Sanction coursier | À chaque annulation pour non-livraison | Incident « non-livraison » compté : 2 incidents sur 30 jours → suspension provisoire (même mécanique que les notes) ; les frais réels avancés par le coursier ne lui sont pas dus sans preuve d'achat |

**Remboursement en cas de non-livraison :** la faute vient du coursier, donc le client récupère **la totalité** (frais de service compris). Ce cas est distinct du paramètre « remboursement total » des litiges (défaut NON), et il a son propre paramètre `refund_platform_fees_on_courier_no_show` (**défaut OUI**). La commission coursier n'est évidemment pas perçue.

**Admin :** les courses `OVERDUE` alimentent la file « Courses bloquées » de l'accueil admin (TICK-090). L'admin peut prolonger, rembourser ou basculer en litige depuis le détail de la course (TICK-091).

### 3.2 Parcours client cible (5 écrans au lieu de 9)
| # | Écran | Action principale | Points de friction actuels supprimés |
|---|-------|-------------------|--------------------------------------|
| 1 | Accueil | Trouver un coursier | Notice et métriques supprimées ; « À faire maintenant » piloté par le statut |
| 2 | Nouvelle course | Publier et choisir un coursier | 3 étapes réduites à 1, champs décoratifs retirés, date ≥ aujourd'hui |
| 3 | Coursiers (Offres / Proches) | Discuter ou Accepter | Plus d'offre à 0,01 ; plusieurs offres visibles ; retour sans créer de doublon |
| 4 | Chat → Paiement | Accepter et payer, puis Payer | Montant non falsifiable ; frais réels à 0 autorisés ; course rechargée par son id |
| 5 | Suivi/Validation | Libérer, ou Litige / Signaler | Détail et validation fusionnés ; compte à rebours 72 h ; confirmation ; notation enchaînée |

### 3.3 Parcours coursier cible
| # | Écran | Action principale | Points de friction supprimés |
|---|-------|-------------------|------------------------------|
| 1 | Demandes (accueil) | Voir | Demandes en premier, rafraîchies toutes les 20 s et au retour sur l'onglet, KYC visible mais non bloquant pour consulter |
| 2 | Détail demande | Proposer mon tarif | Supprime « Accepter » plus la modale et l'offre à 0,01 ; montant net affiché ; une seule action crée l'offre et le chat |
| 3 | Chat | Modifier l'offre (tant que non payé) | Bouton masqué après paiement ; offres précédentes marquées « remplacées » |
| 4 | Mission payée → Preuves | Envoyer les preuves | Notification de paiement ; caméra d'abord ; vidéo ≤ 10 s vérifiée ; reprise après échec |
| 5 | Gains | Voir le détail | Montants issus du serveur (`courierAmount` + frais réels), plus de 20 % codé en dur |
| 6 | Fin | Noter le client | Lien de notation sur la mission terminée ; Litige / Signaler accessibles depuis la mission et le chat |

### 3.4 Parcours admin cible
| # | Écran | Action principale |
|---|-------|-------------------|
| 1 | Accueil = files d'actions | Traiter le plus urgent (litiges, KYC, courses bloquées, signalements) |
| 2 | Courses (nouveau) | Filtrer par statut, ouvrir le détail (timeline, ledger, chat, preuves) |
| 3 | Détail litige | Rembourser, payer le coursier ou partager (curseur de montant), avec confirmation et écriture dans le ledger |
| 4 | Utilisateurs | Rechercher, voir le détail, suspendre ou réactiver (avec motif et confirmation) |
| 5 | Paramètres plateforme | Taux, tarif minimum et coordonnées de reversement sur un seul formulaire, avec simulation en direct |
| 6 | Gains et reversements | Solde par moyen d'encaissement (lu du ledger), « Reverser » vers le compte de la plateforme, file des versements coursiers, export CSV de rapprochement (§4.3) |

---

## 4. SÉCURITÉ ET VALIDATION DES PAIEMENTS — SÉQUESTRE ROBUSTE

### 4.1 Mécanismes de validation des paiements
1. **Le serveur est la seule source des montants.** La requête de paiement ne contient que `{courseId, fraisReels, paymentMethod, idempotencyKey}`. Le tarif est lu dans `course.acceptedOfferId`. Les frais et la commission sont calculés depuis `platform_settings`, puis figés.
2. **Préconditions** : appelant = client propriétaire, `status = ASSIGNED`, `courierId != null`, aucun HOLD existant. Verrou `@Lock(PESSIMISTIC_WRITE)` sur la course, et `@Version` en filet de sécurité.
3. **Idempotence** : `escrow_ledger.idempotency_key` est UNIQUE. Un rejeu renvoie le même résultat sans double débit.
4. **Paiement en deux temps (prêt pour Stripe/MoMo réels)** : `initiate`, puis HOLD `PENDING`, puis confirmation (simulée aujourd'hui, webhook signé demain), puis HOLD `CONFIRMED` et course IN_PROGRESS. Le webhook vérifie la signature, le montant et la devise (XAF), puis passe au statut final.
5. **Montants XAF entiers** : `setScale(0, HALF_UP)`. `paymentMethod` est validé (`STRIPE|MTN|ORANGE`).

### 4.2 Registre de séquestre (`escrow_ledger`) en partie double
| Événement | Entrées écrites | Contrôle |
|-----------|-----------------|----------|
| Paiement | `HOLD +total` | total = tarif + frais réels + frais client |
| Validation / 72 h | `PAYOUT_COURIER −(tarif − commission + frais réels)`, `PLATFORM_FEE −(frais client + commission)` | somme = 0 |
| Remboursement total | Selon le paramètre admin `refund_platform_fees_on_full_refund` (**défaut : NON**). NON → `REFUND_CLIENT −(tarif + frais réels)`, `PLATFORM_FEE −frais client`. OUI → `REFUND_CLIENT −total` | somme = 0 |
| Partage | `REFUND_CLIENT −x`, `PAYOUT_COURIER −y`, `PLATFORM_FEE −z` | x + y + z = total |

- Un `EscrowService` unique porte toutes ces opérations. `PaymentService`, `DisputeService` et le scheduler l'appellent. Aucun autre code ne modifie `escrowStatus`.
- **Invariant vérifié en test** : pour toute course clôturée, la somme des entrées du ledger vaut 0.
- Les gains plateforme sont calculés à partir des lignes `PLATFORM_FEE`, et non de `status = COMPLETED`.
- Scheduler 72 h : une requête ciblée, une transaction par course, verrou de ligne + ShedLock, emails envoyés après commit, courses DISPUTED exclues.

### 4.3 Encaissement et reversements : comment l'argent circule et comment la plateforme perçoit ses gains

**Constat actuel :** l'écran « Paramètres de reversement » (`PayoutSettingsService`, clés `payout_mtn_*`, `payout_orange_*`, `payout_bank_*`) enregistre des coordonnées, mais **aucun flux ne les utilise**. Les lignes `COURIER_PAYOUT` et `PLATFORM_FEE` sont écrites dans le ledger sans qu'aucun versement réel ou simulé ne soit tracé. Il n'existe pas de notion de « solde plateforme » ni de « reversement effectué ».

**Modèle cible : 3 niveaux de comptes, gérés par l'admin**

```
 CLIENT ──paiement──► (1) COMPTES D'ENCAISSEMENT de la plateforme (marchand)
                          Stripe · MTN MoMo Collection · Orange Money Marchand
                          = là où dorment les fonds en séquestre (HOLD)
                               │ à la libération (validation / 72h / litige)
              ┌────────────────┴─────────────────┐
              ▼                                  ▼
 (2) COMPTE DE REVERSEMENT DU COURSIER    reste sur (1) = GAINS PLATEFORME
     MoMo / Orange / banque déclaré          frais de service client
     au KYC → tarif − commission             + commission prélevée sur le tarif
     + frais réels  (COURIER_PAYOUT)         (PLATFORM_FEE)
                                                 │ reversement manuel ou planifié
                                                 ▼
                              (3) COMPTE(S) DE LA PLATEFORME (bénéficiaire final)
                                  = « Paramètres de reversement » actuels
                                  MTN / Orange / IBAN (PLATFORM_WITHDRAWAL)
```

| Niveau | Ce que configure l'admin | Où c'est stocké | Écran |
|--------|--------------------------|-----------------|-------|
| (1) Encaissement | Activation de chaque moyen de paiement (Stripe, MTN, Orange), mode test/production, numéro ou identifiant marchand affiché. **Les clés API restent des secrets serveur** (variables d'environnement) et ne sont jamais saisies dans l'UI. L'écran affiche seulement « connecté / non configuré ». | env + `platform_settings` (activation) | Paramètres → Moyens de paiement |
| (2) Reversement coursier | Rien par coursier. L'admin fixe la **politique** : versement automatique à la libération, ou file « à verser » validée manuellement ; délai éventuel. Les coordonnées sont saisies par le coursier (KYC étape 4 / profil). | `courier_payout_accounts` + `platform_settings` | Paramètres → Politique de versement ; file « Versements coursiers » |
| (3) Gains plateforme | Coordonnées de destination (MTN / Orange / IBAN, titulaire, méthode préférée), mode de reversement (**manuel** ou **automatique** : hebdomadaire/mensuel ou au-delà d'un seuil en XAF). | `platform_settings` (existant, à compléter) | Paramètres → Encaissement plateforme ; page Gains → « Reverser » |

**Règles :**
- **Solde plateforme disponible** = Σ `PLATFORM_FEE` − Σ `PLATFORM_WITHDRAWAL`, calculé **par moyen d'encaissement** (on ne peut reverser depuis MTN que ce qui a été encaissé sur MTN).
- **Reverser** : l'admin choisit montant et destination, confirme par OTP, et une ligne `PLATFORM_WITHDRAWAL` est écrite (statut PENDING → PAID / FAILED, référence du fournisseur). Tant que les fournisseurs sont simulés, le passage à PAID se fait par « Marquer comme versé » avec saisie de la référence.
- **Versement coursier** : `COURIER_PAYOUT` passe de PENDING à PAID (ou FAILED, avec nouvelle tentative). Un coursier sans coordonnées valides apparaît dans la file « à régulariser » et reçoit un email.
- **Rapprochement** : export CSV mensuel (encaissé, versé aux coursiers, remboursé, gains, reversé) avec vérification encaissé = versements + remboursements + gains.
- **Modifier une coordonnée de reversement** exige l'OTP admin et est historisé (qui, quand, ancienne valeur masquée).

### 4.4 Sécurité des accès (pré-requis à l'escrow)
Elle couvre plusieurs volets :
- liste blanche des rôles à l'inscription ;
- suspension effective (login et filtre JWT) ;
- `typ` access/refresh ;
- WebSocket authentifié ;
- contrôles de participation (chat, offres) ;
- endpoints de décision réservés à l'admin ;
- rate-limit OTP ;
- `hasRole` par route ;
- 403/404 corrects ;
- secrets externalisés.

Tickets TICK-051 à TICK-056 et TICK-066 à TICK-068.

---

## 5. TESTS ET VALIDATION

### 5.1 Règle de progression (obligatoire)
Chaque ticket suit le même enchaînement :
1. Implémentation.
2. Build (`mvnw test` / `ng build`).
3. Tests automatisés du ticket au vert.
4. **Scénario de validation manuel** décrit dans le ticket, joué par l'agent puis par toi.
5. Mise à jour de `TICKETS.md` et `AGENT_CONTEXT.md`.
6. **Arrêt et attente de ta validation** avant le ticket suivant.

### 5.2 Pyramide de tests
| Niveau | Outil | Contenu |
|--------|-------|---------|
| Unitaires BE | JUnit 5 + Mockito | Calculs (frais, commission, arrondis), machine à états, règles litige et signalement |
| Intégration BE | `@SpringBootTest` + **Testcontainers** (Postgres, Redis) + MinIO mocké | Parcours argent complet, invariants du ledger, concurrence (double paiement), scheduler |
| Sécurité BE | MockMvc + client STOMP de test | Inscription ADMIN refusée, IDOR chat et offres, endpoints admin, WS sans JWT, utilisateur suspendu |
| Unitaires FE | Vitest/Karma | Helper de statut, guards, intercepteur, calculs d'affichage |
| E2E FE | **Playwright** (viewport 390×844 + desktop) | 3 parcours complets client, coursier et admin, sur des données seedées |
| Tests utilisateurs | Protocole guidé | 5 clients, 5 coursiers, 1 admin ; tâches chronométrées ; SUS ; retours intégrés en tickets |

### 5.3 Scénarios de bout en bout de référence
- **E2E-1 (nominal)** : le client crée une course, discute avec le coursier, qui propose 5 000. Le client accepte et paie (15 000 de frais réels). Le coursier envoie ses preuves, le client valide, les deux se notent. Attendu : ledger équilibré et reversement coursier = 4 000 + 15 000.
- **E2E-2 (72 h)** : preuves soumises, horloge avancée de 72 h, puis libération automatique. Le lien de notation reste disponible.
- **E2E-3 (litige)** : litige après les preuves, l'admin partage 50/50. Attendu : ledger équilibré et gains plateforme corrects.
- **E2E-5 (non-livraison)** : course payée, aucune preuve. À l'échéance la course passe `OVERDUE`. Le client prolonge une fois, puis annule. Attendu : remboursement total, ledger équilibré, incident enregistré pour le coursier. Variante sans action du client : remboursement automatique au bout de 48 h.
- **E2E-4 (fraude)** : montant modifié dans la requête, double paiement, offre envoyée par le client via WS, lecture d'un salon tiers, inscription ADMIN. Tout doit être refusé.

---

## 6. DOCUMENTATION ET FORMATION
- **`AGENT_CONTEXT.md`** : réduit à l'état réel (architecture, machine à états, règles, commandes). L'historique des sessions est archivé dans `docs/HISTORIQUE_SESSIONS.md`. Les sections obsolètes sont corrigées (§1 « escrow non implémenté », §9, §12 « Brevo non intégré »…).
- **`README.md`** racine : prérequis, `.env.example`, démarrage docker, backend et frontend, comptes de démo seedés.
- **API** : SpringDoc OpenAPI (ex-TICK-044), avec la machine à états documentée.
- **Guides utilisateurs** (Markdown, plus une page `/aide` dans l'app) : *Client* (commander, payer, valider, litige), *Coursier* (KYC, proposer, preuves, gains), *Admin* (files, litiges, paramètres). Chaque guide tient en une page avec des captures mobiles.
- **Specs** : mise à jour de la spec fonctionnelle sur le flux d'offre via le chat et la machine à états (§3.1).

---

## 7. TICKETS DE TRAVAIL

> Estimations en heures de développement agent (vérification utilisateur non comprise).
> Les tickets de l'ancien Sprint 7 (TICK-043 à TICK-050) sont absorbés : 043 reste en 🟢 optionnel ; 044 → TICK-101 ; 045 → TICK-066/067/068 ; 046 → TICK-079 ; 047 → TICK-072/102 ; 048 → TICK-068 ; 049 → TICK-071 ; 050 → TICK-096 à TICK-099.

### Vue d'ensemble
| Sprint | Thème | Tickets | Estimation |
|--------|-------|---------|-----------|
| 7 | Débloquer le parcours et sécuriser l'argent | TICK-051 → TICK-074 (+ TICK-065b) | ≈ 86 h |
| 8 | Socle UI mobile-first | TICK-075 → TICK-079b | ≈ 23 h |
| 9 | Parcours client simplifié | TICK-080 → TICK-084 | ≈ 21 h |
| 10 | Parcours coursier simplifié | TICK-085 → TICK-089 | ≈ 17 h |
| 11 | Parcours admin simplifié + encaissement et reversements | TICK-090 → TICK-094, TICK-103 → TICK-105 | ≈ 41 h |
| 12 | Tests, recette, documentation | TICK-096 → TICK-102 | ≈ 36 h |

Ordre imposé : Sprint 7 entièrement (il débloque tout), puis 8, puis 9 / 10 / 11 (ordre libre entre eux), puis 12. Les tests du Sprint 12 sur le cœur métier (TICK-096/097) peuvent être avancés juste après TICK-061 si tu le souhaites.

---

### SPRINT 7 — DÉBLOQUER LE PARCOURS ET SÉCURISER L'ARGENT

#### TICK-051 🔴 [BE] Interdire l'auto-attribution du rôle ADMIN — 1 h
**Statut :** ✅ (2026-11-05)
**Anomalie :** A-01 · **Fichiers :** `auth/api/dto/RegisterRequest.java`, `auth/service/AuthService.java`
**Description :** valider `role` contre la liste `CLIENT|COURIER` (`@Pattern` + contrôle dans le service).
**Critères d'acceptation :**
- `POST /api/auth/register` avec `"role":"ADMIN"` → 400.
- Inscription CLIENT et COURIER inchangées.
- Test MockMvc couvrant les 3 cas.
**Validation :** tenter l'inscription ADMIN via Postman → refusée.

#### TICK-052 🔴 [BE] Fermer les endpoints de décision hors `/api/admin` — 1 h
**Statut :** ✅ (2026-11-05)
**Anomalie :** A-02 · **Fichiers :** `dispute/api/DisputeController.java`, `report/api/ReportController.java`
**Description :** supprimer `POST /api/disputes/{id}/resolve` et `POST /api/reports/{id}/process`. Vérifier que le front admin utilise les routes `/api/admin/...`.
**Critères d'acceptation :**
- Ces deux routes renvoient 404/403 pour un CLIENT ou COURIER.
- Les écrans admin Litiges et Signalements fonctionnent toujours.
**Validation :** résoudre un litige depuis l'admin → OK ; même appel avec un token client → refus.

#### TICK-053 🔴 [BE] Rendre la suspension effective — 2 h
**Statut :** ✅ (2026-11-05)
**Anomalie :** A-10 · **Fichiers :** `UserDetailsServiceImpl`, `JwtAuthenticationFilter`, `AuthService`, `AdminUserController`
**Description :** `enabled = status == ACTIVE`. Le filtre JWT recharge le statut (avec un cache court). La suspension révoque le refresh token Redis. Un admin ne peut pas se suspendre lui-même.
**Critères d'acceptation :**
- Utilisateur suspendu : login → 403 « compte suspendu ».
- Un JWT déjà émis est refusé au prochain appel.
- Le refresh est refusé.
- Auto-suspension admin → 400.
**Validation :** suspendre un coursier connecté → son prochain clic le déconnecte avec un message clair.

#### TICK-054 🔴 [BE] Distinguer jeton d'accès et refresh token — 1,5 h
**Statut :** ✅ (2026-11-05)
**Anomalie :** A-11 · **Fichiers :** `JwtService`, `JwtAuthenticationFilter`, `AuthService.refreshAccessToken`
**Critères d'acceptation :**
- Claim `typ` = `access` ou `refresh`.
- Un refresh token en `Authorization: Bearer` → 401.
- Un access token envoyé à `/refresh` → 400.
**Validation :** test d'intégration + parcours de connexion normal intact.

#### TICK-055 ✅ [BE+FE] Sécuriser le WebSocket STOMP — 5 h
**Statut :** ✅ (2026-11-05, session précédente)
**Anomalie :** A-03 · **Fichiers :** `config/WebSocketConfig.java`, `config/StompAuthChannelInterceptor.java`, `chat/service/ChatAccessService.java`, `chat/api/ChatController.java`, `FE/core/services/chat.service.ts`
**Description :**
- `ChannelInterceptor` qui valide le JWT au CONNECT (header `Authorization`) et pose le `Principal`.
- SUBSCRIBE `/topic/chat/{roomId}` autorisé seulement si l'appelant est participant (ou admin).
- SEND : `senderId` dérivé du Principal (le champ du payload est ignoré).
- Types acceptés du client : `TEXT` et `OFFER` (OFFER réservé au coursier du salon, cf. TICK-058). `SYSTEM` est interdit.
- Le front envoie le token dans `connectHeaders` et se reconnecte après un refresh.
**Critères d'acceptation :**
- Connexion sans token refusée.
- Abonnement à un salon tiers refusé.
- Message avec un `senderId` falsifié : l'expéditeur réel est enregistré.
- SYSTEM rejeté.
- Le chat client ↔ coursier fonctionne en temps réel.
**Validation :** deux navigateurs (client et coursier) qui échangent ; un 3ᵉ compte ne reçoit rien.

#### TICK-056 ✅ [BE] Contrôle de participation sur les API REST du chat et des offres — 2 h
**Statut :** ✅ (2026-11-05, session 49)
**Anomalie :** A-12 · **Fichiers modifiés :** `ChatRestController.java`, `OfferController.java`, `GlobalExceptionHandler.java`, nouveau `ForbiddenException.java`
**Critères d'acceptation :**
- `GET /api/chat/rooms/{id}/messages` et `/info` → 403 si l'appelant n'est pas participant ni admin.
- `GET /courses/{id}/offers` réservé au propriétaire (le coursier ne voit que sa propre offre).
- `resolveName` n'expose plus l'email.
**Validation :** test MockMvc IDOR (3 rôles × 2 ressources).

#### TICK-057 ✅ [FULL] Ouvrir une conversation sans offre fictive — 4 h
**Statut :** ✅ (2026-11-05, session 49)
**Anomalies :** A-07, CO-14 · **Fichiers modifiés :** `CourseController.java`, `CourseService.ts`, `select-courier.component.ts`, `courier/dashboard.component.ts`
**Description :**
- Nouvel endpoint `POST /api/courses/{id}/conversations` avec `{courierId}` pour le client, ou sans corps pour le coursier (KYC APPROVED requis). Il crée ou récupère le salon `(courseId, courierId)` **sans créer d'offre**.
- Suppression de tous les appels `createOffer(…, 0.01, …)`.
- Script de nettoyage des offres à 0,01 existantes (migration V10, données de dev).
**Critères d'acceptation :**
- « Choisir et discuter » (client) ouvre le chat avec le bon coursier.
- « Voir / Discuter » (coursier) ouvre le chat.
- Aucune ligne `course_offers` créée.
- Appel idempotent (même salon renvoyé).
**Validation :** client → choisir un coursier → chat OK ; le coursier voit la conversation dans ses missions.

#### TICK-058 🔴 [BE] Offre persistée depuis le chat, avec règles métier — 5 h
**Statut :** ✅ (2026-11-05, session 50)
**Anomalies :** A-14, CO-02, CO-05 · **Fichiers :** `ChatController`, `OfferService`, `CourseOffer`, `CommissionService`, migration `V10__offers_and_escrow.sql`
**Description :** un message `OFFER` du coursier du salon crée ou met à jour **sa** `CourseOffer` active (une seule par coursier et par course). L'ancienne est marquée `SUPERSEDED`. Le message porte `offerId`.
Contrôles :
- rôle COURIER et participant du salon ;
- KYC APPROVED ;
- course PUBLISHED ;
- `amount ≥ tarifMinimumCoursier` ;
- montant entier XAF.

**Critères d'acceptation :**
- Offre inférieure au minimum → message d'erreur renvoyé à l'émetteur (queue utilisateur `/user/queue/errors`).
- Offre après paiement → refusée.
- Une seule offre ACTIVE par coursier en base (UNIQUE partiel).
- Le front lit le tarif minimum via `/api/commissions/public` (plus de 5000 codé en dur).
**Validation :** le coursier propose 3000 (minimum 5000) → refus ; propose 6000 puis 5500 → la carte 6000 apparaît « remplacée ».

#### TICK-059 🔴 [FULL] Acceptation de l'offre et assignation du coursier — 5 h
**Statut :** ✅ (2026-11-05, session 50)
**Anomalies :** A-04, A-18, CL-02, CO-01 · **Fichiers :** `OfferService.acceptOffer`, `CourseController`, `FE/chat.component.ts`, `FE/core/services/course.service.ts`
**Description :**
- « Accepter et payer » appelle `POST /api/courses/{id}/offers/{offerId}/accept`, qui passe la course en ASSIGNED, fixe `courierId`, `acceptedOfferId` et `courseAmount`, et rejette les autres offres. Le front navigue ensuite vers `/client/pay/{courseId}` (sans montant dans l'URL).
- La carte d'offre tient compte du statut : « Accepter » uniquement sur l'offre ACTIVE quand la course est PUBLISHED ; « Acceptée » ou « Remplacée » sinon.
- Le bouton « Proposer un tarif » est masqué hors PUBLISHED.
- Le coursier retenu reçoit une notification ; les autres sont informés (« non retenu »).
**Critères d'acceptation :**
- Après acceptation : `courses.courier_id` renseigné, statut ASSIGNED.
- Double clic → une seule acceptation.
- Le coursier non retenu ne peut plus proposer.
**Validation :** E2E-1 jusqu'à l'écran de paiement ; vérification en base.

#### TICK-060 🔴 [FULL] Paiement fiable côté serveur — 6 h
**Statut :** ✅ (2026-11-05, session 50)
**Anomalies :** A-05, A-06, A-09, A-31, CL-10, CL-23 · **Fichiers :** `PaymentService`, `PaymentInitiateRequest`, `Course` (+ `real_costs`, `@Version`), `CourseRepository` (verrou), `FE/pay.component.ts`, `app.routes.ts`
**Description :**
- Requête `{courseId, fraisReels ≥ 0, paymentMethod ∈ STRIPE|MTN|ORANGE, idempotencyKey}`.
- Préconditions : client propriétaire, ASSIGNED, `courierId != null`, verrou pessimiste.
- Le tarif est lu de l'offre acceptée ; arrondi XAF entier ; `realCosts`, `paidAt` et `courierAmount` (= tarif − commission + frais réels) sont persistés.
- HOLD `CONFIRMED` (paiement simulé). Course IN_PROGRESS. Notification au coursier.
- Front : route `/client/pay/:courseId` qui charge la course ; frais réels optionnels (0 autorisé) ; page bloquée si le statut n'est pas ASSIGNED.
**Critères d'acceptation :**
- Un `tarifCoursier` envoyé par le client est ignoré.
- Paiement en PUBLISHED, IN_PROGRESS, PROOFS_SUBMITTED ou DISPUTED → 409.
- Même `idempotencyKey` rejouée → même référence, un seul HOLD.
- Frais réels = 0 accepté.
**Validation :** E2E-4 (montant falsifié, double paiement) + paiement nominal.

#### TICK-061 🔴 [BE] EscrowService et ledger équilibré — 6 h
**Statut :** ✅ (2026-11-05, session 50)
**Anomalies :** A-08, AD-02, BE-12 · **Fichiers :** nouveau `payment/service/EscrowService.java`, `PaymentService.applyValidation`, `DisputeService.resolve`, `AdminDisputeController` + DTO `{decision, refundAmount}`, `GainsService`, `CourseRepository`
**Description :** centraliser HOLD, PAYOUT_COURIER, PLATFORM_FEE, REFUND_CLIENT et SPLIT (cf. §4.2). La résolution d'un litige écrit le ledger. Nouveaux statuts `REFUNDED` et escrow `REFUNDED`/`SPLIT`. Les gains plateforme sont lus depuis `PLATFORM_FEE`. Nouveau paramètre `refund_platform_fees_on_full_refund` (défaut `false`, seedé par migration), lu au moment de la décision et figé sur la course.
**Critères d'acceptation :**
- Pour toute course clôturée : somme du ledger = 0 (test).
- Remboursement total avec le paramètre à NON (défaut) : le client récupère tarif + frais réels, la plateforme garde ses frais de service client ; avec OUI : le client récupère le total. Course REFUNDED ; seuls les frais conservés comptent dans les gains.
- Partage : montant obligatoire, avec `0 < x < total`.
- Seul `EscrowService` modifie `escrowStatus`.
**Validation :** E2E-3 + écran Gains admin cohérent.

#### TICK-062 🟠 [FULL] Règles d'ouverture des litiges — 2 h
**Statut :** ✅ (2026-11-05, session 52)
**Anomalies :** A-15, CL-13 · **Fichiers :** `DisputeService.openDispute`, `FE/shared/dispute-form`
**Critères d'acceptation :**
- Ouverture seulement en IN_PROGRESS ou PROOFS_SUBMITTED, par une partie de la course.
- Un seul litige OPEN par course (UNIQUE partiel).
- Motifs filtrés par rôle (front et back).
- Le scheduler ignore la course.
**Validation :** litige sur une course PUBLISHED → refus ; 2ᵉ litige → refus.

#### TICK-063 🟠 [BE] Signalements anti-abus — 2 h
**Statut :** ✅ (2026-11-06, session 53)
**Anomalie :** A-16 · **Fichier :** `ReportService`
**Critères d'acceptation :**
- Au plus 1 signalement par paire (signaleur, cible) en 30 jours.
- La suspension automatique compte les **signaleurs distincts** ayant une course commune avec la cible.
- Les ADMIN sont exclus.
**Validation :** test unitaire de la règle 3/30 j.

#### TICK-064 🟠 [FULL] Soumission de preuves complète et fiable — 6 h
**Statut :** ✅ (2026-11-06, session 54)
**Anomalies :** A-17, CO-10, CO-11, CO-17 · **Fichiers :** `ProofService`, `ProofController`, `application.properties`, `FE/courier/proofs`
**Description :**
- Les fichiers sont téléversés en brouillon. Une action explicite `POST /api/courses/{id}/proofs/submit` vérifie la complétude (1 vidéo + au moins 1 photo ; reçus obligatoires si frais réels > 0), puis passe en PROOFS_SUBMITTED et démarre les 72 h.
- Limite multipart alignée (vidéo 30 Mo). Contrôle MIME côté serveur. Durée vidéo ≤ 10 s vérifiée côté client (`video.duration`) ; côté serveur seulement si la lib le permet (sinon « à vérifier »).
- Front : `accept="video/*" capture="environment"`, progression en octets, reprise des seuls fichiers en échec, contrôle du statut au chargement.
**Critères d'acceptation :**
- La 1re preuve ne déclenche plus les 72 h.
- Soumission incomplète → message clair.
- Vidéo de 15 s → refusée.
- Un échec réseau partiel suivi d'une reprise ne provoque pas d'erreur de doublon.
**Validation :** sur mobile réel : filmer, photographier, envoyer.

#### TICK-065 🟡 [BE] Scheduler de validation automatique robuste — 3 h
**Statut :** ✅ (2026-11-06, session 55)
**Anomalie :** A-30 · **Fichiers :** `ValidationScheduler`, `PaymentService`, `pom.xml` (ShedLock)
**Critères d'acceptation :**
- Requête `status = PROOFS_SUBMITTED AND auto_validate_at <= now`.
- Une transaction par course, verrou de ligne.
- Emails envoyés après commit.
- Une erreur sur une course n'affecte pas les autres.
**Validation :** test d'intégration avec horloge injectée (`Clock`).

#### TICK-065b 🔴 [FULL] Échéance de preuves et non-livraison — 6 h
**Statut :** ✅ (2026-11-06, session 56)
**Référence :** §3.1 bis · **Fichiers :** migration (`courses.proof_deadline`, `extension_count`, statut `OVERDUE`, paramètres `proof_deadline_hours`, `overdue_grace_hours`, `max_extensions`, `refund_platform_fees_on_courier_no_show`, table ou compteur d'incidents coursier), `PaymentService` (calcul de l'échéance), `ValidationScheduler` (ou nouveau `ProofDeadlineScheduler`), `EscrowService`, `NotificationService`, nouveaux endpoints client `POST /api/courses/{id}/extend` et `POST /api/courses/{id}/cancel-overdue`, `FE` détail course client, missions coursier, helper de statut
**Critères d'acceptation :**
- `proof_deadline` renseignée au paiement et visible des deux côtés (compte à rebours).
- Rappel au coursier à échéance − 6 h et à l'échéance.
- Passé l'échéance sans soumission → `OVERDUE` ; le client voit « Prolonger / Annuler et être remboursé / Litige ».
- Prolongation limitée à 2.
- Annulation → ledger `REFUND_CLIENT` selon `refund_platform_fees_on_courier_no_show` (défaut : remboursement total), course `REFUNDED`, somme du ledger = 0.
- `OVERDUE` + 48 h sans action : remboursement automatique s'il n'y a aucune preuve, litige automatique sinon.
- Incident de non-livraison enregistré ; 2 incidents sur 30 jours → suspension provisoire.
- Aucun chemin ne libère les fonds au coursier sans preuves soumises.
**Validation :** E2E-5 (ci-dessous) avec horloge avancée : (a) pas de preuves puis remboursement automatique, (b) prolongation puis preuves soumises, (c) preuves partielles puis litige automatique.

#### TICK-066 🟠 [BE] Durcir l'OTP et la 2FA admin — 3 h
**Statut :** ✅ (2026-11-06, session 57)
**Anomalie :** A-13 · **Fichiers :** `OtpService`, `AuthService`, `AuthController`
**Critères d'acceptation :**
- 5 essais maximum, puis l'OTP est invalidé.
- Rate-limit d'1 envoi par minute et de 5 par heure, par email et par IP.
- Le flux admin vérifie le mot de passe **avant** d'envoyer l'OTP.
- 2FA appliquée à tout compte `role=ADMIN`.
**Validation :** 6 essais faux → blocage ; flux admin nominal OK.

#### TICK-067 🟡 [BE] Rôles par route et codes HTTP justes — 3 h
**Statut :** ✅ (2026-11-06, session 58)
**Anomalie :** A-27 · **Fichiers :** `SecurityConfig`, `GlobalExceptionHandler`, nouvelles exceptions `ForbiddenException` / `NotFoundException`
**Critères d'acceptation :**
- Création et paiement de course réservés à CLIENT ; offres, preuves et KYC réservés à COURIER.
- Refus d'accès → 403, ressource absente → 404.
- Le handler générique logge en `error` avec un identifiant de corrélation.
**Validation :** matrice MockMvc rôle × endpoint.

#### TICK-068 🟡 [BE] Secrets et configuration de production — 2 h
**Statut :** ✅ (2026-11-06, session 59)
**Anomalie :** A-28 · **Fichiers :** `application.properties`, `application-dev.properties` / `-prod`, `.env.example`, `.gitignore`, `PasswordResetService`
**Critères d'acceptation :**
- Aucun secret en dur.
- `dev-log` à false par défaut (activé seulement en profil dev).
- Le jeton de reset n'est plus loggé.
- `*.log` ignorés et retirés de l'index.
**Validation :** démarrage en profil prod sans `.env` → échec explicite sur les variables manquantes.

#### TICK-069 🟡 [BE] Migration V10 : index, contraintes et suppression de course — 3 h
**Statut :** ✅ (2026-11-06, session 60) — migration livrée en V18 (V10→V17 déjà prises)
**Anomalie :** A-29 · **Fichiers :** `V10__…sql` (ou V11 si V10 est pris par TICK-058), `CourseService.delete`, requêtes N+1 (`CourseService`, `AdminKycController`)
**Critères d'acceptation :**
- Index listés en A-29 créés.
- Supprimer une course PUBLISHED la passe en CANCELLED (soft) sans erreur 500.
- Listes sans N+1 (vérifié via `spring.jpa.show-sql` en dev).
**Validation :** annuler une course avec 2 conversations → OK.

#### TICK-070 🟠 [FULL] Exposer les données financières et de suivi — 3 h
**Statut :** ✅ (2026-11-06, session 61)
**Anomalies :** A-21, CO-12, CL-09 · **Fichiers :** `CourseResponse`, composants `course-detail`, `validate`, `earnings`, `history`, `chat`
**Critères d'acceptation :**
- `commissionRate`, `commissionAmount`, `realCosts`, `courierAmount`, `paidAt`, `autoValidateAt`, `courierName`, `clientName` exposés (selon le rôle : le client ne voit pas la commission coursier).
- Plus aucun `0.20` ni `5000` codé en dur dans le front (vérification par grep).
**Validation :** les montants du détail, des gains et de l'historique correspondent exactement à la base.

#### TICK-071 🟠 [FE] Fiabiliser le chat — 4 h
**Anomalie :** A-19 · **Fichiers :** `chat.component.ts`, `chat.service.ts`, `environments/`
**Critères d'acceptation :**
- URL WS relative (`/ws` via le proxy) ou `environment`.
- Désabonnement au `ngOnDestroy`.
- Aucune fuite de messages entre salons.
- Message non envoyé hors connexion : texte conservé et état « reconnexion… ».
- Menu ⋮ : Détails (`/client/course-detail/:id`), Signaler (`/report-user/:otherId`), Litige (`/…/dispute-form/:courseId`).
- Hauteur `100dvh` et barre de saisie sticky.
**Validation :** chat sur un téléphone du réseau local (clavier ouvert) ; couper le wifi puis le rétablir.

#### TICK-072 🟠 [FE] Routage : landing, 404, guestGuard, redirections par rôle — 3 h
**Anomalies :** A-20, CL-25 · **Fichiers :** `app.routes.ts`, nouveaux `guest.guard.ts` et `not-found.component.ts`, `dispute-form`, `report-user`, `auth.guard.ts`
**Critères d'acceptation :**
- `''` affiche la landing (placeholder jusqu'à TICK-079).
- Route `**` → page 404.
- `/support` existe (page simple).
- Un utilisateur connecté qui ouvre `/login` est redirigé vers son espace.
- Après un litige ou un signalement, redirection vers l'accueil **du rôle**.
- Le guard vérifie l'expiration du JWT (`exp`).
**Validation :** parcours litige côté coursier → retour à son dashboard (et non à `/login`).

#### TICK-073 🟠 [FULL] Notation accessible et obligatoire — 4 h
**Anomalie :** A-25 · **Fichiers :** `ReviewService`, `CourseService`, `FE/shared/rate`, détail, historique, missions
**Critères d'acceptation :**
- Bouton « Noter » sur toute course COMPLETED non notée (client et coursier), y compris après la validation automatique.
- Vrais noms affichés.
- Création d'une nouvelle course (client) ou d'une offre (coursier) bloquée tant qu'un avis est dû (message plus lien direct).
**Validation :** E2E-2 puis notation depuis l'accueil.

#### TICK-074 🟡 [BE] Vérification d'email effective — 2 h
**Anomalie :** A-26 · **Fichiers :** `User` (+ `email_verified`), migration, `AuthService.verifyOtp`, `login`
**Critères d'acceptation :**
- `verifyOtp` marque l'email comme vérifié.
- Login d'un compte non vérifié → 403 avec un lien de renvoi d'OTP.
- Comptes existants migrés à `true`.
**Validation :** inscription → login avant OTP refusé → OTP → login OK.

> **Jalon Sprint 7 :** E2E-1 à E2E-5 joués manuellement et réussis avant de démarrer le Sprint 8.

---

### SPRINT 8 — SOCLE UI MOBILE-FIRST

#### TICK-075 🟠 [FE] Shell unique et barre de navigation basse par rôle — 5 h
**Anomalie :** A-35 · **Fichiers :** `app.routes.ts` (routes parentes `client`, `courier`, `admin` avec `AppShellComponent` + `<router-outlet>`), `app-shell`, nouveau `bottom-nav.component.ts`, sidebars
**Critères d'acceptation :**
- Sous 768 px : barre basse à 4 onglets (cf. §2.3/2.4/2.5), avec onglet actif et badge (nombre de demandes ou d'actions).
- Au-delà de 768 px : sidebar actuelle.
- Les pages n'enveloppent plus `<app-shell>` elles-mêmes.
- Le chat garde le shell en plein écran mobile (sans barre basse).
**Validation :** tour complet des pages sur 390×844 et sur desktop.

#### TICK-076 🟠 [FE] Assainir le CSS et les cibles tactiles — 6 h
**Anomalie :** A-34, A-35 · **Fichiers :** `styles.scss`, `assets/css/*`, `angular.json`, composants avec `style=""`, `app.html`, `app.spec.ts`
**Description :** ✅ décision validée : **garder les CSS de la maquette et retirer Tailwind** (dépendances, `postcss.config.json`, `@use 'tailwindcss'`, classes utilitaires remplacées). Fusionner les doublons (`.btn-primary`, `.badge`/`.status-badge`). Limiter `width:100%` à `.btn-block`. Remplacer les couleurs en dur par des tokens. Minimum de 44 px pour `.btn`, `.btn-row`, `.mission-btn` et les icônes cliquables.
**Critères d'acceptation :**
- Moins de 20 `style=""` restants.
- Aucun hex en dur dans les composants.
- Boutons admin à leur largeur naturelle.
- Mode sombre correct sur tous les écrans.
- `app.html` supprimé, test racine corrigé.
**Validation :** revue visuelle clair/sombre ; audit Lighthouse mobile en accessibilité ≥ 90.

#### TICK-077 🟡 [FE] Helper de statut et composants d'état partagés — 4 h
**Anomalie :** A-32, CO-15, CO-16 · **Fichiers :** nouveaux `shared/status/course-status.ts`, `status-badge`, `empty-state`, `error-state`, `skeleton`
**Critères d'acceptation :**
- Un seul mapping statut → (libellé, couleur, CTA par rôle), DISPUTED, REFUNDED et CANCELLED compris.
- Tous les écrans l'utilisent.
- Plus de `error: () => {}` silencieux : affichage d'un état d'erreur avec « Réessayer ».
**Validation :** couper le backend → états d'erreur visibles partout.

#### TICK-078 🟡 [FE] Retirer les éléments factices — 1,5 h
**Anomalie :** A-36 · **Fichiers :** login, otp, forgot-password (toggle FR/EN), chat (badge Vérifié), dashboard coursier (score 2/4), dashboard client et admin (métriques « — »)
**Critères d'acceptation :**
- Aucun élément affiché sans donnée réelle.
- Le badge « Vérifié » dépend du `kycStatus` réel.
**Validation :** revue visuelle.

#### TICK-079 🟢 [FE] Landing minimale — 3 h
**Fichiers :** nouveau `features/public/landing`
**Critères d'acceptation :**
- Écran conforme au wireframe §2.2, une page.
- CTA vers l'inscription avec rôle présélectionné.
- Lighthouse performance mobile ≥ 90.
**Validation :** ouverture sur mobile, compte connecté redirigé.

#### TICK-079b 🟡 [FE] Maquettes HTML v3 à valider — 3,5 h (à faire **avant** les Sprints 9 à 11)
**Description :** produire `maquette-v3/` (client, coursier, admin) à partir des wireframes §2, en HTML statique avec les CSS assainis.
**Critères d'acceptation :**
- Un fichier par écran cible (≈ 16 écrans).
- Navigables sur mobile.
- **Validées par toi** avant implémentation.

> **Jalon Sprint 8 :** navigation mobile complète validée, aucune régression du Sprint 7 (E2E-1 rejoué).

---

### SPRINT 9 — PARCOURS CLIENT SIMPLIFIÉ

#### TICK-080 🟠 [FE] Accueil client « Trouver un coursier » et « À faire maintenant » — 4 h
**Critères d'acceptation :**
- CTA principal en haut (wireframe §2.3).
- Liste « À faire » triée par urgence (preuves à valider > paiement à faire > offres reçues > en cours), avec le CTA du helper de statut.
- Notice et métriques retirées.
- Skeleton, état vide (« Créez votre première course ») et état d'erreur présents.
**Validation :** chaque statut de course produit le bon CTA.

#### TICK-081 🟠 [FULL] Création de course en un écran — 4 h
**Anomalie :** A-33 · **Fichiers :** `create-course`, `CreateCourseRequest`
**Critères d'acceptation :**
- 3 à 4 champs (quoi, ville + quartier, quand : « dès que possible » ou date ≥ maintenant).
- Champs décoratifs retirés.
- Bouton sticky « Publier et choisir un coursier ».
- Le mode édition fonctionne et reste accessible depuis le détail (PUBLISHED seulement).
**Validation :** création en moins de 30 s sur mobile (chronométré).

#### TICK-082 🟠 [FULL] Écran « Coursiers » : offres reçues + coursiers proches — 5 h
**Anomalies :** A-22, CL-11, CL-12, CL-20 · **Fichiers :** `select-courier`, `course-detail`, `GET /courses/{id}/offers` (avec nom, note, KYC), `GET /users/couriers?zone=`
**Critères d'acceptation :**
- Onglet « Offres reçues » (montant, coursier, Discuter / Accepter) et onglet « Proches » (Discuter).
- Toutes les conversations d'une course sont accessibles.
- « Retour » ne recrée pas de course.
- Annuler une course PUBLISHED est possible.
**Validation :** 2 coursiers proposent → le client compare et accepte.

#### TICK-083 🟡 [FE] Paiement simplifié — 3 h
**Fichiers :** `pay.component.ts`
**Critères d'acceptation :**
- Conforme au wireframe : tarif en lecture seule, « Achats à avancer » optionnel, total en direct, séquestre expliqué en une phrase.
- Le bouton affiche le total.
- Retour d'erreur explicite (409 « déjà payée »).
**Validation :** paiement avec et sans achats.

#### TICK-084 🟠 [FE] Suivi et validation fusionnés — 5 h
**Anomalies :** A-22, CL-08, CL-17, CL-18 · **Fichiers :** `course-detail`, `validate` (absorbé), `media-viewer`
**Critères d'acceptation :**
- Timeline avec DISPUTED.
- Compte à rebours de 72 h.
- Galerie des preuves en plein écran.
- « Tout est OK, libérer » avec confirmation, puis feuille de notation.
- « Un problème ? » ouvre le litige prérempli ; « Signaler » est accessible.
- Le bouton de validation n'est actif qu'en PROOFS_SUBMITTED.
**Validation :** E2E-1 côté client entièrement sur mobile en moins de 12 taps après la création.

> **Jalon Sprint 9 :** test utilisateur rapide (2 personnes) sur le parcours client.

---

### SPRINT 10 — PARCOURS COURSIER SIMPLIFIÉ

#### TICK-085 🟠 [FULL] Accueil coursier « Nouvelles demandes » en premier — 5 h
**Anomalies :** A-23, CO-09, CO-13
**Critères d'acceptation :**
- Demandes visibles sans scroll sur 390×844.
- Rafraîchissement automatique toutes les 20 s, au retour sur l'onglet et par tirage vers le bas (pull-to-refresh). Option : topic WS `/topic/courses/new`.
- Bannière KYC compacte : les demandes restent consultables, « Proposer » est désactivé avec « Validez votre identité ».
- Filtre zone (déclarée à l'inscription, TICK-089).
**Validation :** une course publiée par le client apparaît en moins de 20 s chez le coursier.

#### TICK-086 🟠 [FE] Détail demande → « Proposer mon tarif » — 4 h
**Critères d'acceptation :**
- Écran détail (et non une modale).
- Saisie du tarif avec net estimé (taux lu du serveur) et minimum affiché.
- Une action ouvre la conversation (TICK-057) et poste l'offre (TICK-058), puis arrive dans le chat.
- Offre modifiable tant que la course est PUBLISHED.
**Validation :** de l'accueil à l'offre envoyée en 3 taps au maximum.

#### TICK-087 🟠 [FULL] Missions : statut clair et action suivante — 3 h
**Anomalies :** CO-04, CO-15 · **Fichiers :** `CourseService.getMyMissions`, dashboard et missions du coursier
**Critères d'acceptation :**
- Sections « En négociation », « À réaliser (payées) », « Terminées ».
- Courses non retenues : badge « Non retenu », sans bouton Preuves.
- CTA selon le statut (Preuves, Chat, Noter).
- Litige et Signaler accessibles depuis la mission.
**Validation :** coursier perdant → aucune action de preuve possible.

#### TICK-088 🟡 [FULL] Gains réels et notification de paiement — 3 h
**Fichiers :** `earnings`, `history`, notifications (`NotificationService`)
**Critères d'acceptation :**
- Montants issus de `courierAmount` + frais réels.
- Séparation « en attente (HELD) » / « versé ».
- Email au coursier à l'acceptation et au paiement.
- Badge sur l'onglet Missions.
**Validation :** les montants correspondent au ledger après E2E-1.

#### TICK-089 🟡 [FULL] Persister véhicule et zone du coursier — 2 h
**Anomalie :** CO-19 · **Fichiers :** `RegisterRequest`, `User` + migration, `register.component.ts`, profil
**Critères d'acceptation :**
- Véhicule et zone enregistrés à l'inscription et modifiables dans le profil.
- Utilisés par le filtre de TICK-085 et par « Coursiers proches ».
**Validation :** inscription d'un coursier → données visibles dans le profil et dans l'admin.

> **Jalon Sprint 10 :** test utilisateur rapide (2 coursiers) sur un téléphone réel.

---

### SPRINT 11 — PARCOURS ADMIN SIMPLIFIÉ

#### TICK-090 🟠 [FULL] Accueil admin = files d'actions — 5 h
**Anomalie :** A-24, AD-09 · **Fichiers :** nouveau `GET /api/admin/overview`, `admin/dashboard`
**Critères d'acceptation :**
- Compteurs réels (litiges ouverts, KYC en attente, courses bloquées = statut `OVERDUE` ou HELD depuis plus de 72 h, signalements), chacun cliquable vers sa file.
- Résumé du mois (courses, gains depuis le ledger).
- Plus de `loading.set(false)` prématuré.
**Validation :** créer un litige → le compteur passe de 0 à 1.

#### TICK-091 🟠 [FULL] Gestion des courses (nouveau) — 6 h
**Anomalie :** AD-10 · **Fichiers :** `GET /api/admin/courses?status=&q=&page=`, `GET /api/admin/courses/{id}` (timeline, ledger, preuves, chat en lecture), nouveaux composants admin `courses`
**Critères d'acceptation :**
- Liste paginée filtrable et recherchable (cartes sur mobile).
- Détail complet.
- Action « Annuler et rembourser » (via EscrowService, avec confirmation et motif).
**Validation :** retrouver une course par client et par statut, puis lire son ledger.

#### TICK-092 🟠 [FULL] Détail litige et décisions chiffrées — 5 h
**Anomalie :** AD-08 · **Fichiers :** `admin/disputes`, `AdminDisputeController`
**Critères d'acceptation :**
- Écran détail : parties (noms), motif, montants, preuves, chat.
- Décisions : Rembourser / Payer le coursier / Partager (curseur), avec résumé « qui reçoit quoi », confirmation et note obligatoire.
- Écriture dans le ledger (TICK-061).
**Validation :** E2E-3 entièrement depuis le mobile admin.

#### TICK-093 🟠 [FULL] Écran unique « Paramètres plateforme » — 5 h
**Anomalies :** AD-07, AD-14 · **Fichiers :** `admin/commissions` + `admin/payout-settings` fusionnés, `CommissionService`, `PayoutSettingsService`
**Description :** un écran à sections : *Tarification* (taux, tarif minimum, option « Rembourser les frais de plateforme en cas de remboursement total », défaut NON), *Délais* (échéance de preuves, délai de grâce `OVERDUE`, nombre de prolongations, remboursement des frais en cas de non-livraison, défaut OUI ; cf. TICK-065b), *Moyens de paiement* (TICK-103), *Encaissement plateforme* (coordonnées et mode de reversement, TICK-104), *Versements coursiers* (politique, TICK-105).
**Critères d'acceptation :**
- Taux client et coursier, tarif minimum, option de remboursement des frais, coordonnées de reversement (MTN / Orange / Banque) sur un seul formulaire.
- Bornes identiques en front et en back.
- Validation de format conditionnelle (téléphone `6XXXXXXXX`, IBAN/RIB).
- Effacement d'un champ possible.
- Méthode préférée uniquement si renseignée.
- Simulation en direct.
- Confirmation « s'applique aux nouvelles courses ».
- Historique des changements (qui, quand).
**Validation :** modifier le taux → une nouvelle course utilise le nouveau taux, une course payée garde l'ancien.

#### TICK-094 🟡 [FULL] Utilisateurs, KYC et signalements : efficacité et sûreté — 6 h
**Anomalies :** AD-11, AD-12, AD-13, UI-08, UI-09
**Critères d'acceptation :**
- Pagination et recherche (nom, email, téléphone) ; noms affichés à la place des IDs.
- Confirmation avec motif pour toute suspension.
- Documents KYC toujours visibles après décision.
- Cartes mobiles sans tableau dupliqué.
- Colonne « Courses » remplie ou supprimée.
- Tendance des gains « Nouveau » si le mois précédent vaut 0.
**Validation :** traiter un KYC, un signalement et une suspension depuis le mobile.

#### TICK-103 🟠 [FULL] Comptes d'encaissement (moyens de paiement) — 3 h
**Référence :** §4.3 niveau (1) · **Fichiers :** `application-*.properties` (clés fournisseurs en env), `platform_settings` (activation, mode), nouveau `GET/PUT /api/admin/payment-providers`, section « Moyens de paiement » de TICK-093, `pay.component.ts`
**Critères d'acceptation :**
- L'admin active ou désactive Stripe, MTN et Orange et voit le mode (test / production) et l'état « connecté / non configuré » (clé présente côté serveur).
- Aucun secret n'est saisi, renvoyé ni loggé par l'API.
- L'écran de paiement client ne propose que les moyens actifs, et le backend refuse un moyen désactivé.
- Chaque HOLD enregistre le moyen d'encaissement utilisé (base du solde par fournisseur).
**Validation :** désactiver Orange → disparaît du paiement client ; un appel forcé est refusé.

#### TICK-104 🟠 [FULL] Solde plateforme et reversement des gains — 6 h
**Référence :** §4.3 niveau (3) · **Fichiers :** `EscrowService`, migration (statut + `provider_ref` + `destination` sur `escrow_ledger` ou table `platform_withdrawals`), `GainsService`, `PayoutSettingsService`, `admin/gains`
**Description :** solde disponible par moyen d'encaissement = Σ PLATFORM_FEE − Σ PLATFORM_WITHDRAWAL. Action « Reverser » (montant ≤ solde, destination parmi les coordonnées configurées, confirmation par OTP admin), avec statuts PENDING → PAID / FAILED. Option de reversement automatique (hebdomadaire, mensuel ou au-delà d'un seuil) exécutée par un scheduler. Historique et export CSV de rapprochement. Toute modification des coordonnées exige l'OTP et est historisée.
**Critères d'acceptation :**
- Gains = frais de service client + commission sur le tarif coursier, issus uniquement du ledger.
- Impossible de reverser plus que le solde du moyen concerné.
- Un reversement sans coordonnées valides est refusé avec un lien vers les paramètres.
- Rapprochement CSV : encaissé = versé aux coursiers + remboursé + gains (écart affiché s'il y en a un).
**Validation :** après E2E-1 et E2E-3, reverser le solde MTN → solde à 0, ligne PAID dans l'historique, CSV équilibré.

#### TICK-105 🟠 [FULL] Versements aux coursiers — 5 h
**Référence :** §4.3 niveau (2) · **Fichiers :** coordonnées de reversement du coursier (KYC étape 4 / profil : à vérifier si elles sont persistées aujourd'hui, sinon table `courier_payout_accounts`), `EscrowService`, nouvelle file admin « Versements coursiers », `earnings`
**Critères d'acceptation :**
- À la libération, `COURIER_PAYOUT` est créé en PENDING (montant = tarif − commission + frais réels).
- Politique admin : automatique (simulé → PAID immédiatement) ou manuelle (file à valider, avec saisie de la référence).
- Coursier sans coordonnées valides → file « à régulariser » + email ; le versement n'est pas perdu.
- Le coursier voit « en attente / versé » avec la référence dans Gains.
**Validation :** E2E-1 en politique manuelle → l'admin valide le versement → le coursier le voit « Versé ».

> **Jalon Sprint 11 :** l'admin réalise ses 5 tâches types en moins de 2 minutes chacune ; le rapprochement financier d'un mois de test est équilibré.

---

### SPRINT 12 — TESTS, RECETTE ET DOCUMENTATION

#### TICK-096 🟠 [BE] Infrastructure de tests — 4 h
**Critères d'acceptation :**
- Testcontainers (Postgres, Redis), profil `test`, MinIO et Brevo mockés.
- Les tests ne touchent plus la base de dev.
- `mvnw test` vert en local.

#### TICK-097 🔴 [BE] Tests d'intégration du cœur métier et de l'escrow — 6 h
**Critères d'acceptation :**
- E2E-1, E2E-2, E2E-3 et E2E-5 automatisés au niveau API.
- Invariant « ledger = 0 ».
- Double paiement concurrent (2 threads) → un seul HOLD.
- Scheduler avec `Clock`.
- Couverture ≥ 80 % sur `payment`, `dispute`, `course.service`.

#### TICK-098 🟠 [BE] Tests de sécurité — 4 h
**Critères d'acceptation :**
- Couvre E2E-4.
- Matrice rôle × endpoint.
- WS sans JWT, abonnement à un salon tiers, `senderId` falsifié.
- Utilisateur suspendu, refresh utilisé comme access.

#### TICK-099 🟠 [FE] Tests front : unitaires et E2E Playwright mobile — 8 h
**Critères d'acceptation :**
- Tests unitaires : helper de statut, guards, intercepteur.
- Playwright (390×844 + desktop) : 3 parcours complets (client, coursier, admin) sur un jeu de données seedé.
- Script `npm run e2e`.

#### TICK-100 🟡 [—] Tests utilisateurs et itération — 6 h (+ corrections)
**Critères d'acceptation :**
- Protocole écrit (tâches, métriques : taux de réussite, temps, SUS).
- 5 clients, 5 coursiers, 1 admin.
- Rapport `docs/TESTS_UTILISATEURS.md`.
- Chaque irritant devient un ticket priorisé.

#### TICK-101 🟡 [FULL] Documentation technique — 4 h
**Critères d'acceptation :**
- `README.md` + `.env.example`.
- `AGENT_CONTEXT.md` refondu (état réel, machine à états, règles), historique archivé.
- SpringDoc OpenAPI sur `/swagger-ui` (dev uniquement).
- Spec fonctionnelle mise à jour (flux d'offre, statuts).

#### TICK-102 🟢 [FE] Guides utilisateurs et page Aide — 4 h
**Critères d'acceptation :**
- `docs/guides/client.md`, `coursier.md`, `admin.md` (une page chacun, captures mobiles).
- Page `/aide` dans l'app avec FAQ courte par rôle.
- Lien depuis « Moi » / « Paramètres ».

---

## 8. ANNEXE — PROMPT DE CADRAGE AMÉLIORÉ POUR L'AGENT

> Version proposée de `prompts/prompt.txt`, adaptée à ce plan.

```
Tu es un agent de développement qui reprend le projet ConfianceCoursier.

AVANT TOUTE ACTION, lis dans cet ordre :
1. PLAN_AMELIORATION.md  (plan en cours : anomalies, parcours cibles, tickets TICK-051+)
2. AGENT_CONTEXT.md      (état technique, règles, commandes)
3. TICKETS.md            (statut des tickets)
4. Les specs fonctionnelle et technique V4 (référence métier)

Choix du ticket : le premier ticket ⬜ du sprint le plus bas de PLAN_AMELIORATION.md §7,
en respectant l'ordre indiqué. Annonce le ticket et ton plan d'implémentation en 5 lignes max.

Règles d'implémentation :
- Lis chaque fichier avant de le modifier ; ne recrée pas ce qui existe.
- Le serveur est la seule source de vérité pour les montants et les statuts de course
  (machine à états §3.1). Toute écriture d'escrow passe par EscrowService.
- Nouvelle migration Flyway = nouveau fichier V<n> ; ne jamais modifier une migration existante.
- Pas de valeurs métier codées en dur dans le front (taux, minimum) : les lire depuis l'API.
- Mobile-first : cibles ≥ 44px, une action principale par écran, états chargement/vide/erreur.
- Pas de style inline ni de couleur hex dans les composants : utiliser les tokens CSS.

Définition de « terminé » pour un ticket :
1. Build OK (backend : mvnw test ; frontend : .\node_modules\.bin\ng build).
2. Tests automatisés du ticket écrits et au vert (sauf ticket purement visuel).
3. Scénario « Validation » du ticket exécuté ; résultat réel rapporté (y compris les échecs).
4. Ticket marqué ✅ dans PLAN_AMELIORATION.md et TICKETS.md ; AGENT_CONTEXT.md mis à jour (court).
5. Commit dédié : "fix|feat(<domaine>): TICK-0XX <résumé>".

⛔ Après chaque ticket : arrête-toi et écris
"Ticket TICK-0XX terminé — voici comment le vérifier : <étapes>. J'attends ta validation."
Ne commence jamais le ticket suivant sans validation explicite.
Si une anomalie hors périmètre est découverte : la noter dans PLAN_AMELIORATION.md §1, ne pas la corriger.
```
