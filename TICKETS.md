# TICKETS DE DÉVELOPPEMENT — ConfianceCoursier
> Généré le : 2026-10-28
> Basé sur : AGENT_CONTEXT.md + SPÉCIFICATION FONCTIONNELLE V4.md + SPÉCIFICATION TECHNIQUE V4.md + maquette-v2/
> Convention : [BE] = Backend Spring Boot | [FE] = Frontend Angular | [FULL] = Les deux

---

## LÉGENDE

| Symbole | Signification |
|---------|--------------|
| 🔴 | Bloquant — à faire avant tout le reste |
| 🟡 | Important — sprint courant |
| 🟢 | Amélioration — sprint suivant |
| ✅ | Terminé |
| ⚙️ | En cours |
| ⬜ | À faire |

---

## ÉTAT GLOBAL DES SPRINTS

| Sprint | Thème | Statut |
|--------|-------|--------|
| Sprint 0 | Socle & corrections critiques | ✅ Complet |
| Sprint 1 | Design system + Auth complète | ✅ Complet |
| Sprint 2 | Cycle de vie d'une course | ✅ Complet |
| Sprint 3 | KYC + Profil utilisateur | ✅ Complet |
| Sprint 4 | Preuves + Paiement Escrow | ✅ Complet |
| Sprint 5 | Notation + Litiges + Signalements | ✅ Complet |
| Sprint 6 | Admin + Notifications | ✅ Complet |
| Sprint 7 | Qualité, sécurité & mise en production | ⬜ En attente |

---

---

# SPRINT 0 — SOCLE & CORRECTIONS CRITIQUES
> **Objectif :** corriger les bugs bloquants existants avant d'ajouter de nouvelles fonctionnalités.
> Ces tickets sont des prérequis absolus.

---

### TICK-001 🔴 [BE] Ajouter `fullName` sur l'entité `User`
**Statut :** ✅
**Priorité :** Bloquant
**Fichiers concernés :**
- `user/domain/User.java`
- `auth/service/AuthService.java`
- `db/migration/` → créer `V3__add_fullname_to_users.sql`

**Description :**
`RegisterRequest` possède un champ `fullName` validé `@NotBlank` mais l'entité `User` n'a pas ce champ.
La valeur est silencieusement ignorée dans `AuthService.register()`.

**Travail à faire :**
- [ ] Créer `V3__add_fullname_to_users.sql` : `ALTER TABLE users ADD COLUMN full_name VARCHAR(255);`
- [ ] Ajouter `private String fullName;` dans `User.java` avec `@Column(name = "full_name")`
- [ ] Mapper `request.getFullName()` dans `AuthService.register()` : `.fullName(request.getFullName())`
- [ ] Mettre à jour `AuthResponse` pour inclure `fullName`

**Critères d'acceptance :**
- Un utilisateur inscrit avec un nom complet peut le retrouver via `GET /api/users/me`
- La migration Flyway s'exécute sans erreur

---

### TICK-002 🔴 [BE] Corriger les requêtes `findAll()` dans `CourseService`
**Statut :** ✅
**Priorité :** Bloquant (performance)
**Fichiers concernés :**
- `course/service/CourseService.java`
- `course/repository/CourseRepository.java`

**Description :**
`getMyCourses()` et `getMyMissions()` chargent TOUTES les courses en mémoire puis filtrent.
À 1 000 courses, cela provoquera un timeout.

**Travail à faire :**
- [ ] `getMyCourses()` : remplacer `findAll()` + filtre par `courseRepository.findByClientIdOrderByCreatedAtDesc(clientId)`
- [ ] `getMyMissions()` : ajouter `findByCourierIdOrderByCreatedAtDesc(Long courierId)` dans `CourseRepository`, puis l'utiliser
- [ ] Supprimer `suggestedBudget` de `CreateCourseRequest` (déclaré mais jamais utilisé) ou l'utiliser

**Critères d'acceptance :**
- `GET /api/courses/my-courses` ne fait plus de `SELECT *` sur toute la table
- `GET /api/courses/my-missions` idem

---

### TICK-003 🔴 [BE] Créer un DTO `CreateOfferRequest` dans `OfferController`
**Statut :** ✅
**Priorité :** Bloquant
**Fichiers concernés :**
- `course/api/OfferController.java`
- `course/api/dto/` (nouveau fichier)

**Description :**
`OfferController.createOffer()` reçoit un `Map<String, Object>` brut, sans validation.
N'importe quelle valeur peut être passée — c'est un risque de sécurité et de robustesse.

**Travail à faire :**
- [ ] Créer `course/api/dto/CreateOfferRequest.java` :
  ```java
  @NotNull BigDecimal amount;
  @NotBlank String details;
  ```
- [ ] Mettre à jour `OfferController.createOffer()` pour recevoir `@Valid @RequestBody CreateOfferRequest`
- [ ] Valider que `amount > 0`

**Critères d'acceptance :**
- `POST /api/courses/{courseId}/offers` avec body invalide retourne HTTP 400 avec message de validation
- La valeur `amount` est bien typée `BigDecimal` (pas `Object`)

---

### TICK-004 🔴 [BE] Exposer `chatRoomId` dans `CourseResponse` et les réponses d'offre
**Statut :** ✅
**Priorité :** Bloquant
**Fichiers concernés :**
- `course/api/dto/CourseResponse.java`
- `course/api/OfferController.java`
- `course/service/OfferService.java`

**Description :**
Le frontend navigue vers `/chat/:course.id` au lieu de `/chat/:chatRoom.id`.
Le `ChatRestController` utilise `roomId` comme clé pour charger les messages — si les IDs ne coïncident pas, le chat est vide ou charge les mauvais messages.

**Travail à faire :**
- [ ] Dans `OfferService.createOffer()`, retourner un objet qui inclut le `chatRoom.id` créé
- [ ] Créer `course/api/dto/CreateOfferResponse.java` : `{ offerId, chatRoomId }`
- [ ] Mettre à jour `OfferController` pour retourner `CreateOfferResponse`
- [ ] Ajouter `chatRoomId` (nullable) dans `CourseResponse.fromEntity()` — récupéré via `ChatRoomRepository.findByCourseIdAndCourierId()`

**Critères d'acceptance :**
- `POST /api/courses/{courseId}/offers` retourne `{ offerId, chatRoomId }`
- Le frontend peut naviguer vers `/chat/{chatRoomId}` avec le bon ID

---

### TICK-005 🔴 [FE] Implémenter les Guards Angular (authGuard + roleGuard)
**Statut :** ✅
**Priorité :** Bloquant (sécurité)
**Fichiers concernés :**
- `frontend/src/app/core/guards/auth.guard.ts` (à créer)
- `frontend/src/app/core/guards/role.guard.ts` (à créer)
- `frontend/src/app/app.routes.ts`

**Description :**
Toutes les routes protégées sont actuellement accessibles sans token. Un utilisateur non connecté peut accéder à `/client/dashboard` directement.

**Travail à faire :**
- [ ] `auth.guard.ts` : vérifier `localStorage.getItem('jwt_token')` → si absent, redirect `/login`
- [ ] `role.guard.ts` : vérifier `localStorage.getItem('user_role')` vs le rôle requis → si mismatch, redirect `/login`
- [ ] Mettre à jour `app.routes.ts` :
  ```typescript
  { path: 'client/dashboard', component: ..., canActivate: [authGuard, roleGuard], data: { role: 'CLIENT' } }
  { path: 'courier/dashboard', component: ..., canActivate: [authGuard, roleGuard], data: { role: 'COURIER' } }
  { path: 'chat/:roomId', canActivate: [authGuard] }
  ```
- [ ] Ajouter signal `isLoggedIn` dans `AuthService`
- [ ] Corriger `logout()` : supprimer `jwt_token` + `user_id` + `user_role`
- [ ] Nettoyer les doublons de routes dans `app.routes.ts`

**Critères d'acceptance :**
- Accès à `/client/dashboard` sans token → redirect `/login`
- Un COURIER qui tente `/client/dashboard` → redirect `/login`
- Logout efface bien toutes les clés localStorage

---

### TICK-006 🔴 [FE] Corriger `OtpComponent` — 6 inputs individuels + Toast
**Statut :** ✅
**Priorité :** Bloquant (UX + conformité maquette)
**Fichiers concernés :**
- `frontend/src/app/features/auth/otp/otp.component.ts`

**Description :**
La maquette `verify-otp.html` utilise 6 inputs OTP individuels avec auto-focus et un timer de 60s.
L'implémentation actuelle utilise un seul champ texte et des `alert()` au lieu de toasts.

**Travail à faire :**
- [ ] Remplacer le champ texte unique par 6 inputs `maxlength="1"` avec auto-avancement au focus
- [ ] Ajouter timer 60s avec option "Renvoyer le code" après expiration (appel `AuthService.register()` pour re-trigger OTP)
- [ ] Remplacer tous les `alert()` par `toastService.success()` / `toastService.error()`
- [ ] Afficher le numéro de téléphone masqué depuis les `queryParams`

**Critères d'acceptance :**
- Saisie du 1er chiffre → focus automatique sur le 2ème input
- Timer visible, bouton "Renvoyer" actif après 60s
- Aucun `alert()` natif dans le composant

---

### TICK-007 🟡 [FE] Corriger `RegisterComponent` — champs coursier conditionnels
**Statut :** ✅
**Priorité :** Important
**Fichiers concernés :**
- `frontend/src/app/features/auth/register/register.component.ts`

**Description :**
La maquette `register.html` affiche des champs supplémentaires (véhicule, zone d'intervention) uniquement quand le rôle COURSIER est sélectionné. L'implémentation actuelle n'a pas ce comportement.

**Travail à faire :**
- [ ] Ajouter sélecteur de rôle visuel (cartes CLIENT / COURSIER) fidèle à la maquette
- [ ] Afficher/masquer les champs `vehicle` et `interventionZone` selon le rôle sélectionné
- [ ] Envoyer `fullName` dans la requête d'inscription (champ actuellement ignoré côté backend)
- [ ] Ajouter validation "confirmer le mot de passe" (présente dans la maquette)
- [ ] Rediriger vers `/verify-otp?email=...` après inscription réussie (déjà fait, vérifier)

**Critères d'acceptance :**
- Le formulaire affiche les cartes rôle (CLIENT/COURSIER) cliquables
- Les champs coursier apparaissent uniquement si COURSIER est sélectionné
- Le `fullName` est bien envoyé au backend

---

---

# SPRINT 1 — DESIGN SYSTEM + AUTH COMPLÈTE
> **Objectif :** intégrer le design system de la maquette dans Angular et finaliser l'authentification.

---

### TICK-008 🔴 [FE] Intégrer le design system de la maquette dans Angular
**Statut :** ✅
**Priorité :** Bloquant (toutes les interfaces en dépendent)
**Fichiers concernés :**
- `frontend/src/styles.scss`
- `frontend/src/assets/` (à créer)
- `frontend/src/app/shared/` (layout components)

**Description :**
La maquette utilise 3 fichiers CSS (`main.css`, `app-layout.css`, `refonte.css`) avec un design system complet.
Tous les composants Angular actuels utilisent des styles inline basiques sans cohérence avec la maquette.

**Travail à faire :**
- [x] Copier `maquette-v2/assets/css/main.css`, `app-layout.css`, `refonte.css` dans `frontend/src/assets/css/` (déjà présents)
- [x] Les importer dans `styles.scss` (via le tableau `styles` de `angular.json` — plus robuste que `@import` SCSS)
- [x] Créer `shared/components/app-shell/app-shell.component.ts` (sidebar + topbar + overlay)
- [x] Créer `shared/components/sidebar-client/sidebar-client.component.ts`
- [x] Créer `shared/components/sidebar-courier/sidebar-courier.component.ts`
- [x] Créer `shared/components/sidebar-admin/sidebar-admin.component.ts`
- [x] Configurer les variables CSS du thème (forest, lime, paper, ink) dans `styles.scss` (fournies par les CSS de la maquette + documentées)
- [x] Ajouter le toggle dark mode (signal `isDarkMode` dans un `ThemeService`)

**Critères d'acceptance :**
- Les couleurs `#123b32`, `#d7ed9a`, `#f7f8f5` sont utilisées partout
- La sidebar s'affiche sur toutes les pages authentifiées
- Le toggle dark/light fonctionne et persiste dans `localStorage`

---

### TICK-009 🟡 [FE] Refondre `LoginComponent` selon la maquette
**Statut :** ✅
**Priorité :** Important
**Maquette :** `maquette-v2/login.html`

**Travail à faire :**
- [x] Topbar avec bouton Retour (→ `index.html`) + toggle FR/Thème
- [x] Logo centré sur sa propre ligne
- [x] Case "Se souvenir de moi" + lien "Mot de passe oublié ?"
- [x] Après login réussi : redirect selon rôle (`/client/dashboard` ou `/courier/dashboard`)
- [x] Gérer l'état de chargement (spinner sur le bouton)

**Critères d'acceptance :**
- L'UI correspond fidèlement à `login.html`
- Redirect automatique si déjà connecté (token valide en localStorage)

---

### TICK-010 🟡 [BE] Implémenter le Refresh Token
**Statut :** ✅
**Priorité :** Important
**Fichiers concernés :**
- `auth/service/JwtService.java`
- `auth/service/AuthService.java`
- `auth/api/AuthController.java`
- `auth/api/dto/RefreshRequest.java` (à créer)

**Description :**
`jwt.refresh-expiration=604800000` est configuré dans `application.properties` mais aucun endpoint de refresh n'existe.
Le token expire au bout de 15 minutes → l'utilisateur doit se reconnecter manuellement.

**Travail à faire :**
- [x] Ajouter `generateRefreshToken(UserDetails)` dans `JwtService`
- [x] Stocker le refresh token dans Redis avec TTL 7 jours (clé : `refresh:<userId>`)
- [x] Retourner `refreshToken` dans `AuthResponse` lors du login
- [x] Créer `POST /api/auth/refresh` : valide le refresh token → retourne un nouveau access token
- [x] Créer `POST /api/auth/logout` : invalide le refresh token dans Redis
- [x] Ajouter route `/api/auth/logout` dans `SecurityConfig.permitAll()` (déjà couvert par `requestMatchers("/api/auth/**").permitAll()` — refresh et logout sont publics)

**Critères d'acceptance :**
- `POST /api/auth/login` retourne `{ token, refreshToken, email, role, userId }`
- `POST /api/auth/refresh` avec refresh token valide retourne un nouveau token
- `POST /api/auth/logout` invalide le refresh token (ne peut plus être réutilisé)

---

### TICK-011 🟡 [FE] Implémenter le Refresh Token côté Angular
**Statut :** ✅
**Dépend de :** TICK-010
**Fichiers concernés :**
- `core/interceptors/auth.interceptor.ts`
- `core/services/auth.service.ts`

**Travail à faire :**
- [x] Stocker `refreshToken` dans `localStorage` au login
- [x] Dans `auth.interceptor.ts` : intercepter les réponses HTTP 401 → appeler `POST /api/auth/refresh` → rejouer la requête originale
- [x] Si refresh échoue → logout automatique + redirect `/login`
- [x] `logout()` : appeler `POST /api/auth/logout` + vider tout le localStorage

**Critères d'acceptance :**
- Une requête qui reçoit 401 est automatiquement rejouée après refresh
- Double refresh impossible (gérer le cas de requêtes parallèles)

---

### TICK-012 🟢 [BE] Intégrer Brevo pour l'envoi réel des emails OTP
**Statut :** ✅
**Fichiers concernés :**
- `auth/service/OtpService.java`
- `pom.xml` (dépendance Brevo SDK ou Spring Mail)
- `application.properties`

**Travail à faire :**
- [x] Configurer Brevo REST API (`POST https://api.brevo.com/v3/smtp/email`, header `api-key`)
- [x] Remplacer `System.out.println` par envoi email avec template HTML
- [x] Template email : code OTP mis en avant + « Valable 5 minutes »

**Critères d'acceptance :**
- L'email OTP est reçu dans la boîte de l'utilisateur ✅
- Le `System.out.println` est supprimé en production ✅

---

### TICK-012b [FULL] Correctif — `resendCode` + endpoint `POST /api/auth/resend-otp`
**Statut :** ✅ (correctif hors-sprint)
**Problème :** `resendCode()` appelait `register()` avec données vides → 400 avant génération OTP.
**Fichiers modifiés :**
- `auth/api/dto/ResendOtpRequest.java` (créé)
- `AuthService.java` : `resendOtp(email)` ajouté
- `AuthController.java` : `POST /api/auth/resend-otp`
- `auth.service.ts` : méthode `resendOtp(email)`
- `otp.component.ts` : `resendCode()` appelle `resendOtp()`

---

### TICK-012c [FULL] Page "Mot de passe oublié" — flux complet
**Statut :** ✅ (hors-sprint)
**Fichiers créés/modifiés :**
- `auth/api/dto/ForgotPasswordRequest.java`, `ResetPasswordRequest.java` (créés)
- `auth/service/PasswordResetService.java` (créé) — token UUID Redis TTL 15min + Brevo email
- `AuthController.java` : `POST /forgot-password` + `POST /reset-password`
- `application.properties` : `app.frontend.url=http://localhost:4200`
- `features/auth/forgot-password/forgot-password.component.ts` (créé)
- `features/auth/reset-password/reset-password.component.ts` (créé)
- `app.routes.ts` : `/forgot-password` + `/reset-password` (publiques)
- `login.component.ts` : navigation vers `/forgot-password`

---

---

# SPRINT 2 — CYCLE DE VIE D'UNE COURSE (FLUX PRINCIPAL)
> **Objectif :** implémenter le parcours complet client → coursier → chat → paiement → validation.

---

### TICK-013 🔴 [FE] Refondre `ClientDashboardComponent` selon la maquette
**Statut :** ✅
**Maquette :** `maquette-v2/client/dashboard.html`

**Travail à faire :**
- [ ] Utiliser le composant `AppShellComponent` (TICK-008)
- [ ] 3 métriques (courses actives / terminées / note moyenne)
- [ ] Liste "Courses à suivre" avec statuts colorisés (badges)
- [ ] Bouton "Chat" par course → navigate `/chat/{chatRoomId}` (utiliser le vrai chatRoomId de TICK-004)
- [ ] Aside : CTA contextuel selon statut de la course en cours
- [ ] Bouton "Créer une course" → `/client/create-course`

**Critères d'acceptance :**
- Le dashboard affiche les données réelles de l'API
- Le lien Chat navigue vers le bon `chatRoomId`
- Les statuts ont les bonnes couleurs (maquette)

---

### TICK-014 🔴 [FE] Refondre `CreateCourseComponent` — Formulaire 3 étapes
**Statut :** ✅
**Maquette :** `maquette-v2/client/create-course.html`

**Travail à faire :**
- [ ] Indicateur de progression (3 étapes visuelles : points)
- [ ] Sélecteur de type de course (Achat / Livraison / Retrait / Autre) — cartes cliquables
- [ ] Champs : description (textarea), ville/zone (select), quartier (input), date + heure
- [ ] Cases à cocher des preuves obligatoires (vidéo précochée + désactivée)
- [ ] Soumission → `POST /api/courses` → navigate `/client/select-courier/{courseId}`
- [ ] Mode édition : préremplir via `GET /api/courses/{id}` si paramètre `:id` présent

**Critères d'acceptance :**
- Formulaire valide → course créée → redirect vers sélection du coursier
- Mode édition fonctionne avec les données existantes

---

### TICK-015 🔴 [FE] Créer `SelectCourierComponent`
**Statut :** ✅
**Maquette :** `maquette-v2/client/select-courier.html`
**Route :** `/client/select-courier/:courseId`

**Description :**
Écran manquant dans le frontend. Après création d'une course, le client voit la liste des coursiers disponibles.

**Travail à faire :**
- [ ] Créer le composant `features/client/select-courier/`
- [ ] `GET /api/users?role=COURIER&kycStatus=APPROVED` → liste des coursiers disponibles
- [ ] Afficher : avatar initiales, nom, note, nb courses, zone, badge "Vérifié"
- [ ] Bouton "Choisir et discuter" → crée un `ChatRoom` via `POST /api/courses/{courseId}/offers` avec amount=0 en draft → navigate `/chat/{chatRoomId}`
- [ ] Ajouter la route dans `app.routes.ts` avec `authGuard` + `roleGuard(CLIENT)`

**Critères d'acceptance :**
- La liste affiche uniquement les coursiers avec KYC validé
- Cliquer "Choisir et discuter" crée le chat et navigue vers la bonne room

---

### TICK-016 🔴 [BE] Endpoint GET coursiers disponibles
**Statut :** ✅
**Dépend de :** TICK-015

**Travail à faire :**
- [ ] Créer `GET /api/users/couriers` dans un nouveau `UserController`
- [ ] Retourner uniquement les coursiers avec `role=COURIER` et `kycStatus=APPROVED` (quand KYC sera implémenté, sinon `status=ACTIVE`)
- [ ] DTO `CourierSummaryResponse` : id, fullName, averageRating, completedCourses, zone, kycVerified
- [ ] Ajouter la route dans `SecurityConfig` (authentifiée, tout rôle)

**Critères d'acceptance :**
- `GET /api/users/couriers` retourne la liste filtrée
- Les coursiers sans KYC validé ne sont pas dans la liste

---

### TICK-017 🔴 [FE] Refondre `ChatComponent` — Carte d'offre intégrée
**Statut :** ✅
**Maquette :** `maquette-v2/client/chat.html` + `maquette-v2/courier/chat.html`
**Dépend de :** TICK-004 (chatRoomId correct)

**Description :**
Le flux d'offre doit passer par le chat (spec fonctionnelle §2.1). Le coursier envoie une "carte d'offre" dans le chat. Ce n'est PAS un formulaire séparé.

**Travail à faire :**
- [ ] Layout pleine hauteur (viewport) : header + body scrollable + input bar fixe
- [ ] Header : avatar + nom du correspondant + badge Vérifié + statut course + boutons (Détails, Signaler)
- [ ] Côté **Coursier** : bouton "Proposer une offre" → ouvre un panel pour saisir son tarif → envoie un message spécial de type `OFFER` dans le WebSocket
- [ ] Côté **Client** : les messages de type `OFFER` s'affichent comme une carte (tarif coursier + bouton "Accepter et payer" → navigate `/client/pay/{courseId}`)
- [ ] Bandeau d'avertissement : "Les échanges sont enregistrés et peuvent être consultés en cas de litige"
- [ ] Bouton "Signaler" → navigate `/report-user/{userId}`

**Critères d'acceptance :**
- Le coursier peut envoyer son tarif via le chat
- Le client voit la carte d'offre avec le montant et peut l'accepter
- Le bandeau de traçabilité est visible

---

### TICK-018 🔴 [BE] Gestion des messages d'offre dans le Chat
**Statut :** ✅
**Dépend de :** TICK-017

**Travail à faire :**
- [ ] Ajouter `messageType` dans `ChatMessage` : `TEXT`, `OFFER`, `SYSTEM`
- [ ] Ajouter `offerAmount` (nullable, BigDecimal) dans `ChatMessage`
- [ ] Créer migration `V4__add_message_type.sql` : `ALTER TABLE chat_messages ADD COLUMN message_type VARCHAR(20) DEFAULT 'TEXT', ADD COLUMN offer_amount DECIMAL(12,2);`
- [ ] Mettre à jour `ChatMessageDto` : inclure `messageType`, `offerAmount`
- [ ] Dans `ChatController` : si `messageType=OFFER`, vérifier le tarif minimum (récupéré depuis `platform_settings`)
- [ ] Retourner une erreur si `offerAmount < tarifMinimum`

**Critères d'acceptance :**
- Un message de type `OFFER` est sauvegardé avec son montant
- Un montant inférieur au tarif minimum retourne une erreur WebSocket

---

### TICK-019 🔴 [FE] Créer `PayComponent` — Double déclaration + Escrow
**Statut :** ✅
**Maquette :** `maquette-v2/client/pay.html`
**Route :** `/client/pay/:courseId`

**Description :**
Écran manquant. Le client saisit les frais réels (achats), le tarif coursier est affiché (lu depuis le message d'offre accepté). Total = tarif + frais réels + frais de service.

**Travail à faire :**
- [ ] Créer le composant `features/client/pay/`
- [ ] Afficher le tarif du coursier (read-only, depuis l'offre acceptée)
- [ ] Input "Frais réels" (saisi par le client)
- [ ] Calcul dynamique : total = fraisRéels + tarifCoursier + (total × tauxFraisService)
- [ ] Encart d'avertissement anti-fraude (maquette)
- [ ] 3 options paiement : Stripe (carte), MTN MoMo, Orange Money (boutons radio)
- [ ] Bouton "Payer" désactivé tant que frais réels = 0
- [ ] Pour l'instant : appel `POST /api/payment/initiate` (simulé) → navigate `/client/course-detail/{courseId}`

**Critères d'acceptance :**
- Le total se calcule dynamiquement à chaque saisie
- Le bouton reste désactivé si fraisRéels ≤ 0
- L'UI correspond exactement à `pay.html`

---

### TICK-020 🟡 [BE] Endpoint `POST /api/payment/initiate` (simulé)
**Statut :** ✅
**Dépend de :** TICK-019

**Travail à faire :**
- [ ] Créer `payment/api/PaymentController.java`
- [ ] `POST /api/payment/initiate` : body `{ courseId, tarifCoursier, fraisReels, paymentMethod }`
- [ ] Calculer le total côté serveur (ne pas faire confiance au frontend)
- [ ] Stocker dans `escrow_ledger` avec `status=PENDING`
- [ ] Mettre à jour `course.escrowStatus = HELD`, `course.status = IN_PROGRESS`
- [ ] Retourner `{ paymentRef, totalAmount, status }` (simulé pour l'instant)

**Critères d'acceptance :**
- La course passe au statut `IN_PROGRESS` après paiement
- Une ligne est créée dans `escrow_ledger`

---

### TICK-021 🟡 [FE] Créer `CourseDetailComponent` — Suivi timeline
**Statut :** ✅
**Maquette :** `maquette-v2/client/course-detail.html`
**Route :** `/client/course-detail/:courseId`

**Travail à faire :**
- [ ] Créer le composant `features/client/course-detail/`
- [ ] Timeline visuelle des statuts : PUBLISHED → ASSIGNED → IN_PROGRESS → PROOFS_SUBMITTED → COMPLETED
- [ ] Afficher les infos de la course (description, zone, montants)
- [ ] Bouton "Voir les preuves" si statut = `PROOFS_SUBMITTED` → navigate `/client/validate/{courseId}`
- [ ] Bouton "Ouvrir un litige" → navigate `/client/dispute-form/{courseId}`
- [ ] Bouton "Chat" → navigate `/chat/{chatRoomId}`

**Critères d'acceptance :**
- L'étape courante est mise en évidence dans la timeline
- Les boutons s'affichent selon le statut de la course

---

### TICK-022 🟡 [FE] Refondre `CourierDashboardComponent` selon la maquette
**Statut :** ✅
**Maquette :** `maquette-v2/courier/dashboard.html`

**Travail à faire :**
- [ ] Alerte KYC bloquante si `kycStatus !== APPROVED` (avec lien vers `/courier/kyc`)
- [ ] 3 métriques (gains ce mois / courses terminées / note moyenne)
- [ ] Section "Mes missions" avec bouton "Envoyer les preuves" si statut = `IN_PROGRESS`
- [ ] Section "Nouvelles demandes" : `GET /api/courses?status=PUBLISHED` → modal de détail → bouton "Accepter la mission" → navigate `/chat/{chatRoomId}`
- [ ] Encart "Profil de confiance" avec barre de progression KYC
- [ ] Lien Chat avec le vrai `chatRoomId`

**Critères d'acceptance :**
- Un coursier sans KYC voit l'alerte et ne peut pas accepter de missions
- Les nouvelles demandes sont filtrées par zone (si zone renseignée)

---

---

# SPRINT 3 — KYC + PROFIL UTILISATEUR
> **Objectif :** implémenter la vérification d'identité des coursiers et la gestion des profils.

---

### TICK-023 🔴 [BE] Implémenter l'entité et le service KYC
**Statut :** ✅
**Fichiers concernés :**
- `kyc/domain/KycSubmission.java` (à remplir — actuellement vide)
- `kyc/repository/KycRepository.java` (à créer)
- `kyc/service/KycService.java` (à créer)
- `kyc/api/KycController.java` (à créer)
- `kyc/api/dto/` (à créer)

**Travail à faire :**
- [ ] Remplir `KycSubmission.java` : @Entity, champs (userId, documentType, frontFileKey, backFileKey, selfieFileKey, status, reviewedBy, reviewedAt, rejectionReason, createdAt)
- [ ] `KycRepository` : `findByUserId(Long)`, `findByStatus(String)`
- [ ] `KycService.submitKyc(Long userId, KycSubmitRequest request)` :
  - Vérifier qu'un KYC n'est pas déjà PENDING ou APPROVED pour cet utilisateur
  - Créer et sauvegarder `KycSubmission` avec status=PENDING
- [ ] `KycController` :
  - `POST /api/kyc/submit` (COURIER uniquement)
  - `GET /api/kyc/my-status` → retourne le statut KYC de l'utilisateur courant
- [ ] Ajouter `kycStatus` dans `User.java` (valeurs : `NONE`, `PENDING`, `APPROVED`, `REJECTED`)
- [ ] Migration `V5__add_kyc_status_to_users.sql`

**Critères d'acceptance :**
- `POST /api/kyc/submit` crée une soumission avec statut PENDING
- `GET /api/kyc/my-status` retourne le statut actuel
- Un coursier avec `kycStatus=NONE` ou `PENDING` ne peut pas faire d'offre (vérification dans `OfferService`)

---

### TICK-024 🔴 [BE] Intégrer MinIO pour le stockage des fichiers KYC
**Statut :** ✅
**Dépend de :** TICK-023

**Travail à faire :**
- [ ] Ajouter la dépendance MinIO SDK dans `pom.xml` : `io.minio:minio:8.5.x`
- [ ] Créer `config/MinioConfig.java` : bean `MinioClient` configuré depuis `application.properties`
- [ ] Ajouter dans `application.properties` : `minio.url`, `minio.access-key`, `minio.secret-key`, `minio.bucket-kyc`
- [ ] Créer `shared/util/FileStorageService.java` : `uploadFile(MultipartFile, bucket) → String fileKey` + `getPresignedUrl(fileKey, bucket) → String url`
- [ ] `KycController` : accepter `MultipartFile` (recto, verso, selfie) → upload via `FileStorageService` → stocker les fileKeys dans `KycSubmission`

**Critères d'acceptance :**
- `POST /api/kyc/submit` accepte les fichiers en `multipart/form-data`
- Les fichiers sont stockés dans MinIO avec des clés uniques (UUID)
- Les clés sont bien sauvegardées en base

---

### TICK-025 🔴 [FE] Créer `KycComponent` (Coursier)
**Statut :** ✅
**Maquette :** `maquette-v2/courier/kyc.html`
**Route :** `/courier/kyc`

**Travail à faire :**
- [ ] Créer le composant `features/courier/kyc/`
- [ ] Indicateur 4 étapes (Identité / Documents / Selfie / Validation)
- [ ] Étape 1 : infos personnelles (prénom, nom, date naissance, nationalité)
- [ ] Étape 2 : type de document (CNI/Passeport) + upload recto + upload verso
- [ ] Étape 3 : upload selfie (zone cliquable)
- [ ] Étape 4 : coordonnées de paiement (MTN/Orange/Virement)
- [ ] Submit → `POST /api/kyc/submit` (multipart/form-data)
- [ ] Afficher le statut actuel si KYC déjà soumis (PENDING, APPROVED, REJECTED + raison)

**Critères d'acceptance :**
- Le formulaire KYC est complet et fonctionnel
- Le statut PENDING/APPROVED/REJECTED est affiché sur le dashboard coursier

---

### TICK-026 🟡 [BE] Endpoints profil utilisateur
**Statut :** ✅

**Travail à faire :**
- [ ] `GET /api/users/me` → retourne le profil complet de l'utilisateur connecté
- [ ] `PUT /api/users/me` → met à jour fullName, phone, country, city
- [ ] DTO `UserProfileResponse` : id, email, fullName, phone, role, country, city, status, trustScore, badge, kycStatus, createdAt
- [ ] DTO `UpdateProfileRequest` : fullName, phone, country, city

**Critères d'acceptance :**
- `GET /api/users/me` retourne toutes les infos du profil
- `PUT /api/users/me` met à jour sans écraser le mot de passe

---

### TICK-027 🟡 [FE] Créer `ProfileComponent` (Client + Coursier)
**Statut :** ✅
**Maquette :** `maquette-v2/client/profile.html` + `maquette-v2/courier/profile.html`

**Travail à faire :**
- [ ] Créer `features/shared/profile/profile.component.ts` (réutilisable pour les deux rôles)
- [ ] Afficher et éditer : fullName, email (read-only), phone, country, city
- [ ] Afficher : trustScore, badge, note moyenne (read-only)
- [ ] Pour le coursier : afficher le statut KYC avec lien vers `/courier/kyc`
- [ ] Submit → `PUT /api/users/me`

**Critères d'acceptance :**
- Le profil affiche les données réelles
- La mise à jour est persistée en base

---

---

# SPRINT 4 — PREUVES + PAIEMENT ESCROW
> **Objectif :** permettre au coursier de soumettre les preuves et débloquer le flux de validation/paiement.

---

### TICK-028 🔴 [BE] Module Preuves (Proof)
**Statut :** ✅
**Fichiers concernés :** `proof/` (actuellement vide)

**Travail à faire :**
- [ ] `Proof.java` : @Entity, champs (courseId, courierId, proofType, fileKey, fileHash, fileSize, mimeType, latitude, longitude, capturedAt, uploadedAt)
- [ ] `ProofRepository` : `findByCourseId(Long)`
- [ ] `ProofService.submitProofs(Long courseId, Long courierId, List<MultipartFile> files)` :
  - Vérifier que la course est en statut `IN_PROGRESS` et appartient au coursier
  - Calculer le SHA-256 de chaque fichier (anti-doublon)
  - Uploader vers MinIO bucket `proofs`
  - Sauvegarder chaque `Proof` en base
  - Mettre à jour `course.status = PROOFS_SUBMITTED`
  - Déclencher l'auto-validation à 72h (`course.autoValidateAt = now + 72h`)
- [ ] `ProofController` :
  - `POST /api/courses/{courseId}/proofs` (COURIER uniquement)
  - `GET /api/courses/{courseId}/proofs` → liste des preuves pour validation client

**Critères d'acceptance :**
- Un coursier peut soumettre ses preuves
- Les doublons (même hash SHA-256) sont rejetés
- `autoValidateAt` est défini à +72h
- La course passe au statut `PROOFS_SUBMITTED`

---

### TICK-029 🔴 [FE] Créer `ProofsComponent` (Coursier)
**Statut :** ✅
**Maquette :** `maquette-v2/courier/proofs.html`
**Route :** `/courier/proofs/:courseId`

**Travail à faire :**
- [ ] Zone upload vidéo (≤10s, afficher durée)
- [ ] Zone upload photos (min 1, max 10, aperçu miniatures)
- [ ] Zone upload reçus (optionnel si pas d'achat)
- [ ] Barre de progression d'upload
- [ ] Submit → `POST /api/courses/{courseId}/proofs` (multipart)

**Critères d'acceptance :**
- La vidéo est rejetée si durée > 10s
- L'upload affiche une barre de progression
- Après soumission réussie : toast + redirect vers le dashboard coursier

---

### TICK-030 🔴 [FE] Créer `ValidateComponent` (Client)
**Statut :** ✅
**Maquette :** `maquette-v2/client/validate.html`
**Route :** `/client/validate/:courseId`

**Travail à faire :**
- [ ] `GET /api/courses/{courseId}/proofs` → afficher vidéo, photos, reçus
- [ ] Bouton "Valider la course" → `POST /api/courses/{courseId}/validate`
- [ ] Bouton "Ouvrir un litige" → navigate `/client/dispute-form/{courseId}`
- [ ] Afficher le délai de validation automatique restant (countdown 72h)

**Critères d'acceptance :**
- Les preuves sont affichables (URLs présignées MinIO)
- La validation libère les fonds (mock pour l'instant)

---

### TICK-031 🟡 [BE] Endpoint de validation et libération escrow (simulé)
**Statut :** ✅

**Travail à faire :**
- [ ] `POST /api/courses/{courseId}/validate` (CLIENT uniquement) :
  - Vérifier statut = `PROOFS_SUBMITTED` et appartenance au client
  - `course.status = COMPLETED`, `course.completedAt = now`
  - `escrow_ledger` : entrée `RELEASE`, `status = CONFIRMED`
  - `course.escrowStatus = RELEASED`
  - Simuler l'envoi d'argent au coursier (log uniquement)
- [ ] Scheduler Spring (`@Scheduled`) pour la validation auto 72h :
  - Tous les jours à minuit : `SELECT * FROM courses WHERE auto_validate_at <= now AND status = 'PROOFS_SUBMITTED'`
  - Appliquer la validation automatique

**Critères d'acceptance :**
- La validation manuelle met la course en `COMPLETED`
- Le scheduler est en place (même si l'envoi réel est simulé)

---

---

# SPRINT 5 — NOTATION + LITIGES + SIGNALEMENTS
> **Objectif :** implémenter les mécanismes de confiance et de résolution de conflits.

---

### TICK-032 🔴 [BE] Module Notation (Review)
**Statut :** ✅
**Fichiers concernés :** `review/` (actuellement vide)

**Travail à faire :**
- [ ] `Review.java` : @Entity, champs (courseId, authorId, targetId, reviewerRole, stars, comment, createdAt)
- [ ] `ReviewRepository` : `findByCourseId(Long)`, `findByTargetId(Long)`
- [ ] `ReviewService` :
  - `submitReview(Long courseId, Long authorId, int stars, String comment)` :
    - Vérifier que la course est COMPLETED
    - Vérifier que l'auteur n'a pas déjà noté cette course
    - Vérifier que les deux parties ont noté avant de clôturer
    - Mettre à jour `trustScore` de la cible (moyenne glissante)
    - Vérifier la règle : 2 notes ≤ 2⭐ sur 30 jours → suspendre le coursier automatiquement
  - `canCourseBeFullyClosed(Long courseId)` → boolean
- [ ] `ReviewController` : `POST /api/courses/{courseId}/review`

**Critères d'acceptance :**
- Double notation impossible sur la même course
- `trustScore` mis à jour après chaque note
- 2 notes ≤ 2⭐ en 30j → `user.status = SUSPENDED`

---

### TICK-033 🔴 [FE] Créer `RateComponent` (Client + Coursier)
**Statut :** ✅
**Maquette :** `maquette-v2/client/rate.html` + `maquette-v2/courier/rate-client.html`
**Route :** `/client/rate/:courseId` + `/courier/rate-client/:courseId`

**Travail à faire :**
- [ ] Sélecteur étoiles interactif (1 à 5)
- [ ] Champ commentaire optionnel
- [ ] Submit → `POST /api/courses/{courseId}/review`
- [ ] La notation est obligatoire : le composant est redirigé automatiquement après COMPLETED

**Critères d'acceptance :**
- Impossible de sauter la notation après une course complétée
- La note est sauvegardée et le trustScore est mis à jour

---

### TICK-034 🔴 [BE] Module Litiges (Dispute)
**Statut :** ✅
**Fichiers concernés :** `dispute/` (actuellement vide)

**Travail à faire :**
- [ ] `Dispute.java` : @Entity, champs complets
- [ ] `DisputeRepository` : `findByCourseId(Long)`, `findByStatus(String)`
- [ ] `DisputeService` :
  - `openDispute(Long courseId, Long openedBy, String motifCode, String description)` :
    - Vérifier qu'aucun litige OPEN n'existe déjà pour cette course
    - Bloquer la libération de l'escrow (`course.escrowStatus = DISPUTED`)
    - `course.status = DISPUTED`
  - `resolveDispute(Long disputeId, Long adminId, String decision)` : REMBOURSEMENT_TOTAL / PARTIEL / LIBERATION / SANCTION
- [ ] `DisputeController` :
  - `POST /api/disputes` (CLIENT ou COURIER)
  - `GET /api/disputes/{id}` (parties + ADMIN)
  - `POST /api/disputes/{id}/resolve` (ADMIN uniquement)

**Critères d'acceptance :**
- Un litige bloque la libération de l'escrow
- Seul l'admin peut résoudre un litige
- La décision met à jour le statut de la course et de l'escrow

---

### TICK-035 🟡 [FE] Créer `DisputeFormComponent` (Client + Coursier)
**Statut :** ✅
**Maquette :** `maquette-v2/client/dispute-form.html` + `maquette-v2/courier/dispute-form.html`

**Travail à faire :**
- [ ] Sélecteur de motif selon le rôle (codes L-C* pour client, L-F* pour coursier, L-S* systémique)
- [ ] Champ description
- [ ] Submit → `POST /api/disputes`

**Critères d'acceptance :**
- Les codes motif correspondent aux specs (§6.1 de la spec fonctionnelle)
- Confirmation toast après soumission

---

### TICK-036 🔴 [BE] Module Signalements (Report)
**Statut :** ✅
**Fichiers concernés :** `report/` (actuellement vide)

**Travail à faire :**
- [ ] `Report.java` : @Entity, champs complets
- [ ] `ReportRepository` : `findByTargetIdAndCreatedAtAfter(Long targetId, LocalDateTime date)`
- [ ] `ReportService` :
  - `submitReport(Long reporterId, Long targetId, String motif, String description)` :
    - Compter les signalements des 30 derniers jours pour `targetId`
    - Si ≥ 3 → `target.status = SUSPENDED` automatiquement
  - `processReport(Long reportId, Long adminId, String decision)` : SUSPENSION / AVERTISSEMENT / REJET
- [ ] `ReportController` :
  - `POST /api/reports`
  - `POST /api/reports/{id}/process` (ADMIN uniquement)

**Critères d'acceptance :**
- 3 signalements en 30j → suspension automatique du compte ciblé
- Le comptage utilise une fenêtre glissante de 30 jours

---

### TICK-037 🟡 [FE] Créer `ReportUserComponent` (Client + Coursier)
**Statut :** ✅
**Maquette :** `maquette-v2/client/report-user.html` + `maquette-v2/courier/report-user.html`
**Route :** `/report-user/:userId`

**Travail à faire :**
- [ ] Sélecteur motif (Harcèlement / Fraude / Injures / Faux profil)
- [ ] Champ description
- [ ] Submit → `POST /api/reports`

---

---

# SPRINT 6 — ADMIN + NOTIFICATIONS
> **Objectif :** implémenter le back-office administrateur et les emails transactionnels.

---

### TICK-038 🔴 [BE] Module Admin — KYC + Litiges + Signalements
**Statut :** ✅
**Fichiers concernés :** `admin/` (actuellement vide)

**Travail à faire :**
- [ ] `AdminKycController` :
  - `GET /api/admin/kyc?status=PENDING` → liste
  - `POST /api/admin/kyc/{id}/approve` → `kycSubmission.status = APPROVED` + `user.kycStatus = APPROVED`
  - `POST /api/admin/kyc/{id}/reject` → body `{ rejectionReason }` + `user.kycStatus = REJECTED`
- [ ] `AdminDisputeController` :
  - `GET /api/admin/disputes?status=OPEN`
  - `POST /api/admin/disputes/{id}/resolve` → appel `DisputeService.resolveDispute()`
- [ ] `AdminReportController` :
  - `GET /api/admin/reports?status=OPEN`
  - `POST /api/admin/reports/{id}/process`
- [ ] `AdminUserController` :
  - `GET /api/admin/users`
  - `POST /api/admin/users/{id}/suspend`
  - `POST /api/admin/users/{id}/activate`
- [ ] `AdminCommissionController` :
  - `GET /api/admin/commissions` → paramètres actuels
  - `PUT /api/admin/commissions` → taux client, taux coursier, tarif minimum
  - Stocker dans `platform_settings`
- [ ] Sécuriser toutes les routes admin avec `ROLE_ADMIN` dans `SecurityConfig`

**Critères d'acceptance :**
- Seul l'ADMIN peut accéder aux routes `/api/admin/**`
- La validation KYC met à jour le statut du coursier
- La config commissions est persistée dans `platform_settings`

---

### TICK-039 🔴 [FE] Créer les composants Admin
**Statut :** ✅
**Maquette :** `maquette-v2/admin/`

**Travail à faire :**
- [ ] `AdminDashboardComponent` : stats + 3 colonnes (KYC/Signalements/Litiges) + activité récente
- [ ] `AdminKycComponent` : liste KYC PENDING, visualisation docs (URLs présignées MinIO), boutons Approuver/Rejeter
- [ ] `AdminDisputesComponent` : liste litiges OPEN, accès preuves + historique chat, dropdown décision
- [ ] `AdminReportsComponent` : liste signalements OPEN, boutons Suspendre/Avertir/Rejeter
- [ ] `AdminCommissionsComponent` : formulaire config taux + tarif minimum
- [ ] `AdminUsersComponent` : liste utilisateurs, filtres rôle/statut, actions suspension
- [ ] Routes admin dans `app.routes.ts` avec `roleGuard(ADMIN)`
- [ ] Sidebar admin spécifique (TICK-008)

**Critères d'acceptance :**
- L'admin peut valider/rejeter un KYC depuis l'interface
- L'admin peut arbitrer un litige
- Les commissions sont configurables depuis l'UI

---

### TICK-040 🟡 [BE] Module Notifications (Notify)
**Statut :** ✅
**Fichiers concernés :** `notify/` (actuellement vide)

**Travail à faire :**
- [ ] Créer `notify/service/NotificationService.java` avec méthode `sendEmail(String to, String subject, String htmlBody)`
- [ ] Implémenter via Brevo SMTP (ou réutiliser TICK-012)
- [ ] Templates emails pour les événements clés (voir spec §10) :
  - KYC soumis / validé / rejeté
  - Course assignée (coursier)
  - Paiement reçu (client + coursier)
  - Preuves soumises (client)
  - Course validée (coursier)
  - Litige ouvert / décision
  - Signalement reçu (admin) / décision
  - Mauvaise note + suspension
- [ ] Appeler `NotificationService` depuis les services concernés (`KycService`, `ProofService`, `ReviewService`, `DisputeService`, `ReportService`)

**Critères d'acceptance :**
- L'email est envoyé à chaque événement défini dans la spec
- Les emails sont en FR (EN prévu ultérieurement)

---

### TICK-041 🟡 [FE] Créer `HistoryComponent` (Client + Coursier)
**Statut :** ✅
**Maquette :** `maquette-v2/client/history.html` + `maquette-v2/courier/history.html`

**Travail à faire :**
- [ ] `GET /api/courses/my-courses` (client) ou `GET /api/courses/my-missions` (coursier)
- [ ] Afficher toutes les courses avec statut, date, montant
- [ ] Filtres : par statut, par date
- [ ] Lien vers les détails de chaque course

---

### TICK-042 🟡 [FE] Créer `EarningsComponent` (Coursier)
**Statut :** ✅
**Maquette :** `maquette-v2/courier/earnings.html`

**Travail à faire :**
- [ ] Créer `GET /api/users/me/earnings` → somme des montants nets (après 20%)
- [ ] Afficher gains ce mois / total depuis inscription / déductions commissions
- [ ] Tableau des transactions avec détail par course

---

---

# SPRINT 7 — QUALITÉ, SÉCURITÉ & MISE EN PRODUCTION
> **Objectif :** préparer le projet pour un déploiement en production.

---

### TICK-043 🟢 [BE] Ajouter MapStruct pour le mapping entités ↔ DTOs
**Statut :** ⬜

**Travail à faire :**
- [ ] Ajouter `mapstruct:1.6.x` dans `pom.xml`
- [ ] Créer les mappers pour `User`, `Course`, `KycSubmission`, `Review`, `Dispute`
- [ ] Remplacer les mappings manuels (`fromEntity()`, etc.) par les mappers MapStruct

---

### TICK-044 🟢 [BE] Ajouter SpringDoc OpenAPI
**Statut :** ⬜

**Travail à faire :**
- [ ] Ajouter `springdoc-openapi-starter-webmvc-ui:2.6.x` dans `pom.xml`
- [ ] Annoter les controllers avec `@Tag`, les endpoints avec `@Operation`
- [ ] Ajouter la configuration de sécurité dans la doc (Bearer token)
- [ ] Route `/swagger-ui.html` accessible uniquement en `dev` (bloquer en prod)

---

### TICK-045 🟢 [BE] Hardening sécurité
**Statut :** ⬜

**Travail à faire :**
- [ ] `JwtAuthenticationFilter` : logguer les exceptions JWT au lieu de les swallower silencieusement
- [ ] Rate limiting sur `/api/auth/**` (Spring Security ou Bucket4j)
- [ ] Valider les tailles de fichiers dans `KycController` et `ProofController` (max 10 Mo)
- [ ] Valider les types MIME (images uniquement pour KYC, video/image pour preuves)
- [ ] Déplacer `jwt.secret` vers une variable d'environnement (ne pas le laisser en dur dans `application.properties`)

---

### TICK-046 🟢 [FE] Landing page (`IndexComponent`)
**Statut :** ⬜
**Maquette :** `maquette-v2/index.html`

**Travail à faire :**
- [ ] Recréer la landing page en Angular : hero, métriques, étapes, section confiance, CTA, footer
- [ ] Route `/` → `IndexComponent` (non authentifié)
- [ ] Navigation vers `/login` et `/register`

---

### TICK-047 🟢 [FE] Pages publiques (FAQ, Legal, Support)
**Statut :** ⬜
**Maquette :** `maquette-v2/faq.html`, `legal.html`, `support.html`

**Travail à faire :**
- [ ] Créer les composants correspondants avec le contenu statique
- [ ] Routes `/faq`, `/legal`, `/support` dans `app.routes.ts`

---

### TICK-048 🟢 [BE] Configurer les profils Spring (dev / prod)
**Statut :** ⬜

**Travail à faire :**
- [ ] Créer `application-dev.properties` (Flyway baseline-on-migrate=true, logs SQL, Swagger activé)
- [ ] Créer `application-prod.properties` (ddl-auto=validate, logs SQL=false, Swagger désactivé, CORS restreint)
- [ ] Dockeriser le backend (`Dockerfile` + `docker-compose` avec profil prod)

---

### TICK-049 🟢 [FE] Configurer les environnements Angular
**Statut :** ⬜

**Travail à faire :**
- [ ] `environments/environment.ts` : `apiUrl = ''` (proxy dev)
- [ ] `environments/environment.prod.ts` : `apiUrl = 'https://api.confiancecoursier.com'`
- [ ] Remplacer toutes les URLs hardcodées (WebSocket) par la variable d'environnement
- [ ] Build de production : `ng build --configuration production`

---

### TICK-050 🟢 [FULL] Tests d'intégration
**Statut :** ⬜

**Travail à faire :**
- [ ] [BE] Tests pour `KycService`, `ReviewService` (règle 2 notes ≤ 2⭐), `ReportService` (règle 3/30j)
- [ ] [BE] Test `CourseService.createCourse()` → `OfferService.createOffer()` → `OfferService.acceptOffer()` (flux complet)
- [ ] [FE] Tests de composants pour `ChatComponent`, `PayComponent`
- [ ] [FE] Test du guard `authGuard` : accès refusé sans token, redirect correct

---

---

## PLAN D'AMÉLIORATION (TICK-051 → TICK-105)
> Les tickets à partir de TICK-051 sont détaillés dans `PLAN_AMELIORATION.md` §7 (critères d'acceptation, validation, estimations).
> Ils remplacent l'ancien Sprint 7 (TICK-043 → TICK-050, absorbés — voir le plan).

| Ticket | Titre | Statut |
|--------|-------|--------|
| TICK-051 | 🔴 [BE] Interdire l'auto-attribution du rôle ADMIN | ✅ |
| TICK-052 | 🔴 [BE] Fermer les endpoints de décision hors `/api/admin` | ✅ |
| TICK-053 | 🔴 [BE] Rendre la suspension effective | ✅ |
| TICK-054 | 🔴 [BE] Distinguer jeton d'accès et refresh token | ✅ |
| TICK-055 | 🔴 [BE+FE] Sécuriser le WebSocket STOMP | ✅ |
| TICK-056 | 🔴 [BE] Contrôle de participation sur les API REST du chat et des offres | ✅ |
| TICK-057 | 🔴 [FULL] Ouvrir une conversation sans offre fictive | ✅ |
| TICK-058 | 🔴 [BE+FE] Offre persistée depuis le chat, avec règles métier | ✅ |
| TICK-059 | 🔴 [FULL] Acceptation de l'offre et assignation du coursier | ✅ |
| TICK-060 | 🔴 [FULL] Paiement fiable côté serveur | ✅ |
| TICK-061 | 🔴 [BE] EscrowService et ledger équilibré | ✅ |
| TICK-062 | 🟠 [FULL] Règles d'ouverture des litiges | ✅ |
| TICK-063 | 🟠 [BE] Signalements anti-abus | ✅ |
| TICK-064 | 🟠 [FULL] Soumission de preuves complète et fiable | ✅ |
| TICK-065 | 🟡 [BE] Scheduler de validation automatique robuste | ✅ |
| TICK-065b | 🔴 [FULL] Échéance de preuves et non-livraison | ✅ |
| TICK-066 | 🟠 [BE] Durcir l'OTP et la 2FA admin | ✅ |

> 2026-11-05 — TICK-055 → TICK-061 revus et corrigés (session 51, voir `AGENT_CONTEXT.md` §7 et `PLAN_AMELIORATION.md` §1.4).

---

## RÉCAPITULATIF DES TICKETS

| ID | Titre | Sprint | Composante | Priorité | Statut |
|----|-------|--------|-----------|----------|--------|
| TICK-001 | Ajouter `fullName` sur `User` | S0 | BE | 🔴 | ✅ |
| TICK-002 | Corriger les `findAll()` dans `CourseService` | S0 | BE | 🔴 | ✅ |
| TICK-003 | DTO `CreateOfferRequest` | S0 | BE | 🔴 | ✅ |
| TICK-004 | Exposer `chatRoomId` dans les réponses | S0 | BE | 🔴 | ✅ |
| TICK-005 | Guards Angular (authGuard + roleGuard) | S0 | FE | 🔴 | ✅ |
| TICK-006 | OtpComponent — 6 inputs + Timer | S0 | FE | 🔴 | ✅ |
| TICK-007 | RegisterComponent — rôle + champs conditionnels | S0 | FE | 🟡 | ✅ |
| TICK-008 | Design system maquette dans Angular | S1 | FE | 🔴 | ✅ |
| TICK-009 | Refondre LoginComponent | S1 | FE | 🟡 | ✅ |
| TICK-010 | Refresh Token (backend) | S1 | BE | 🟡 | ✅ |
| TICK-011 | Refresh Token (frontend interceptor) | S1 | FE | 🟡 | ✅ |
| TICK-012 | Intégration Brevo OTP | S1 | BE | 🟢 | ✅ |
| TICK-012b | Correctif resend-otp | hors | FULL | 🔴 | ✅ |
| TICK-012c | Page mot de passe oublié | hors | FULL | 🟡 | ✅ |
| TICK-013 | ClientDashboardComponent (maquette) | S2 | FE | 🔴 | ✅ |
| TICK-014 | CreateCourseComponent — 3 étapes | S2 | FE | 🔴 | ✅ |
| TICK-015 | SelectCourierComponent | S2 | FE | 🔴 | ✅ |
| TICK-016 | GET /api/users/couriers | S2 | BE | 🔴 | ✅ |
| TICK-017 | ChatComponent — carte d'offre | S2 | FE | 🔴 | ✅ |
| TICK-018 | Messages d'offre dans le Chat (backend) | S2 | BE | 🔴 | ✅ |
| TICK-019 | PayComponent — double déclaration | S2 | FE | 🔴 | ✅ |
| TICK-020 | POST /api/payment/initiate (simulé) | S2 | BE | 🟡 | ✅ |
| TICK-021 | CourseDetailComponent — timeline | S2 | FE | 🟡 | ✅ |
| TICK-022 | CourierDashboardComponent (maquette) | S2 | FE | 🟡 | ✅ |
| TICK-023 | Entité + Service KYC (backend) | S3 | BE | 🔴 | ✅ |
| TICK-024 | MinIO pour les fichiers KYC | S3 | BE | 🔴 | ✅ |
| TICK-025 | KycComponent (coursier) | S3 | FE | 🔴 | ✅ |
| TICK-026 | Endpoints profil utilisateur | S3 | BE | 🟡 | ✅ |
| TICK-027 | ProfileComponent | S3 | FE | 🟡 | ✅ |
| TICK-028 | Module Preuves (backend) | S4 | BE | 🔴 | ✅ |
| TICK-029 | ProofsComponent (coursier) | S4 | FE | 🔴 | ✅ |
| TICK-030 | ValidateComponent (client) | S4 | FE | 🔴 | ✅ |
| TICK-031 | Validation + libération escrow | S4 | BE | 🟡 | ✅ |
| TICK-032 | Module Notation (backend) | S5 | BE | 🔴 | ✅ |
| TICK-033 | RateComponent (client + coursier) | S5 | FE | 🔴 | ✅ |
| TICK-034 | Module Litiges (backend) | S5 | BE | 🔴 | ✅ |
| TICK-035 | DisputeFormComponent | S5 | FE | 🟡 | ✅ |
| TICK-036 | Module Signalements (backend) | S5 | BE | 🔴 | ✅ |
| TICK-037 | ReportUserComponent | S5 | FE | 🟡 | ✅ |
| TICK-038 | Module Admin (backend) | S6 | BE | 🔴 | ✅ |
| TICK-039 | Composants Admin (frontend) | S6 | FE | 🔴 | ✅ |
| TICK-040 | Module Notifications Brevo | S6 | BE | 🟡 | ✅ |
| TICK-041 | HistoryComponent | S6 | FE | 🟡 | ✅ |
| TICK-042 | EarningsComponent (coursier) | S6 | FE | 🟡 | ✅ |
| TICK-043 | MapStruct | S7 | BE | 🟢 | ⬜ |
| TICK-044 | SpringDoc OpenAPI | S7 | BE | 🟢 | ⬜ |
| TICK-045 | Hardening sécurité | S7 | BE | 🟢 | ⬜ |
| TICK-046 | Landing page IndexComponent | S7 | FE | 🟢 | ⬜ |
| TICK-047 | Pages publiques FAQ/Legal/Support | S7 | FE | 🟢 | ⬜ |
| TICK-048 | Profils Spring dev/prod | S7 | BE | 🟢 | ⬜ |
| TICK-049 | Environnements Angular dev/prod | S7 | FE | 🟢 | ⬜ |
| TICK-050 | Tests d'intégration | S7 | FULL | 🟢 | ⬜ |

---

**Total : 50 tickets — 8 sprints**
- Sprint 0 : 7 tickets (corrections critiques)
- Sprint 1 : 5 tickets (design system + auth)
- Sprint 2 : 10 tickets (cycle de vie course)
- Sprint 3 : 5 tickets (KYC + profil)
- Sprint 4 : 4 tickets (preuves + escrow)
- Sprint 5 : 6 tickets (notation + litiges + signalements)
- Sprint 6 : 5 tickets (admin + notifications)
- Sprint 7 : 8 tickets (qualité + prod)
