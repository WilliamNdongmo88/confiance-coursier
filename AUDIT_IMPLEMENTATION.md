# RAPPORT D'AUDIT — ConfianceCoursier
> Généré le : 2026-11-02 (mis à jour session 34)
> Sprint en cours : Sprint 4 (Preuves + Paiement Escrow) — ⬜ À démarrer
> Dernière session : correctifs multi-domaines + historisation

---

## 1. RÉSUMÉ EXÉCUTIF

Le projet ConfianceCoursier est une plateforme de mise en relation entre clients et coursiers au Cameroun. À ce stade, **3 sprints sur 7 sont terminés** (S0, S1, S2, S3), couvrant le socle technique, l'authentification complète, le cycle de vie d'une course et la vérification d'identité. La session 34 a apporté des correctifs critiques et des améliorations UX.

| Sprint | Thème | Tickets | Statut |
|--------|-------|---------|--------|
| Sprint 0 | Socle & corrections critiques | TICK-001 à TICK-007 | ✅ Complet |
| Sprint 1 | Design system + Auth complète | TICK-008 à TICK-012c | ✅ Complet |
| Sprint 2 | Cycle de vie d'une course | TICK-013 à TICK-022 | ✅ Complet |
| Sprint 3 | KYC + Profil utilisateur | TICK-023 à TICK-027 | ✅ Complet |
| Session 34 | Correctifs + améliorations UX | hors tickets | ✅ Appliqué |
| Sprint 4 | Preuves + Paiement Escrow | TICK-028 à TICK-031 | ⬜ À faire |
| Sprint 5 | Notation + Litiges + Signalements | TICK-032 à TICK-037 | ⬜ À faire |
| Sprint 6 | Admin + Notifications | TICK-038 à TICK-042 | ⬜ À faire |
| Sprint 7 | Qualité, sécurité & mise en production | TICK-043 à TICK-050 | ⬜ À faire |

**Avancement global : 27 tickets + correctifs session 34 (≈ 56 %)**

---

## 2. STACK TECHNIQUE

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Backend | Spring Boot | 4.1.2 |
| Langage | Java | 21 |
| Build | Maven | — |
| Base de données | PostgreSQL | 16 (Docker) |
| Migrations | Flyway | intégré Spring Boot |
| Cache / OTP | Redis | 7 (Docker) |
| Stockage fichiers | MinIO | 9000/9001 (Docker, intégré depuis TICK-024) |
| Sécurité | Spring Security + JWT (JJWT 0.12.6) | — |
| Temps réel | WebSocket STOMP + SockJS | — |
| Email | Brevo REST API | — |
| Frontend | Angular | 21 (standalone) |
| CSS | Tailwind CSS | v4 (`@tailwindcss/postcss`) |
| Icônes | Lucide Angular | 0.441.0 |
| HTTP Client | Angular HttpClient (withFetch) | — |

---

## 3. BASE DE DONNÉES — ÉTAT DES MIGRATIONS

| Migration | Fichier | Contenu |
|-----------|---------|---------|
| V1 | `V1__init_schema.sql` | Tables `users`, `kyc_submissions` |
| V2 | `V2__create_all_tables.sql` | Tables `courses`, `course_offers`, `chat_rooms`, `chat_messages`, `proofs`, `reviews`, `disputes`, `reports`, `commission_configs`, `platform_settings`, `escrow_ledger` |
| V3 | `V3__add_fullname_to_users.sql` | `ALTER TABLE users ADD COLUMN full_name VARCHAR(255)` |
| V4 | `V4__add_message_type.sql` | `ALTER TABLE chat_messages ADD COLUMN message_type VARCHAR(20) NOT NULL DEFAULT 'TEXT'`, `ADD COLUMN offer_amount DECIMAL(12,2)` |
| V5 | `V5__add_kyc_status_to_users.sql` | `ALTER TABLE users ADD COLUMN kyc_status VARCHAR(20) NOT NULL DEFAULT 'NONE'` + 3 index |

**Toutes les tables SQL sont présentes dans le schéma.** Les entités Java pour `proofs`, `reviews`, `disputes`, `reports` sont absentes (Sprint 4 et 5).

---

## 4. BACKEND — INVENTAIRE DES PACKAGES

### 4.1 Package `auth` — ✅ Complet

#### Endpoints (`POST /api/auth/*`)
| Méthode | URL | Description |
|---------|-----|-------------|
| POST | `/api/auth/register` | Inscription → génère et envoie OTP par email |
| POST | `/api/auth/login` | Connexion → access token + refresh token (Redis TTL 7j) |
| POST | `/api/auth/verify-otp` | Vérifie le code OTP |
| POST | `/api/auth/resend-otp` | Renvoie un OTP (silencieux si email inconnu) |
| POST | `/api/auth/refresh` | Rotation du refresh token → nouveau couple access/refresh |
| POST | `/api/auth/logout` | Invalide le refresh token en Redis |
| POST | `/api/auth/forgot-password` | Génère un token UUID en Redis (TTL 15 min) + email Brevo |
| POST | `/api/auth/reset-password` | Valide le token, met à jour le password (usage unique) |

#### Fichiers Java présents
- `AuthController.java` — contrôleur
- `AuthService.java` — logique métier complète (register, login, refresh, logout, OTP)
- `JwtService.java` — génération/validation JWT HS256, access + refresh tokens
- `JwtAuthenticationFilter.java` — `OncePerRequestFilter`, extraction Bearer token
- `OtpService.java` — génération OTP (SecureRandom 6 chiffres), Redis TTL 5 min, envoi Brevo REST API
- `PasswordResetService.java` — token UUID Redis TTL 15 min, envoi lien de reset Brevo
- `UserDetailsServiceImpl.java` — charge `User` par email pour Spring Security
- DTOs : `AuthResponse`, `RegisterRequest`, `LoginRequest`, `OtpResponse`, `VerifyOtpRequest`, `ResendOtpRequest`, `RefreshRequest`, `ForgotPasswordRequest`, `ResetPasswordRequest`

#### ⚠️ Lacunes identifiées
- `auth/domain/` et `auth/repository/` **vides** (non bloquants — User est dans `user/domain`)
- `emailVerified` jamais mis à `true` après `verifyOtp()` (le champ n'existe pas sur l'entité)

---

### 4.2 Package `user` — ✅ Complet

#### Endpoints (`/api/users/*`)
| Méthode | URL | Description |
|---------|-----|-------------|
| GET | `/api/users/me` | Profil complet de l'utilisateur connecté |
| PUT | `/api/users/me` | Mise à jour partielle : fullName, phone, country, city |
| GET | `/api/users/couriers` | Liste des coursiers ACTIVE triés par trustScore DESC |

#### Entité `User` — champs
`id`, `email (UNIQUE)`, `fullName`, `phone`, `passwordHash`, `role` (CLIENT/COURIER/ADMIN), `country`, `city`, `status` (ACTIVE/SUSPENDED/BLOCKED), `trustScore (DECIMAL)`, `badge`, `kycStatus` (NONE/PENDING/APPROVED/REJECTED), `createdAt`, `updatedAt`

#### ⚠️ Lacunes identifiées
- `GET /api/users/couriers` retourne tous les COURIER ACTIVE, pas seulement `kycStatus=APPROVED` (filtre KYC à activer dès que l'admin peut approuver les KYC — TICK-038)
- `completedCourses` et `kycVerified` dans `CourierSummaryResponse` retournent des valeurs fictives (0 et false) — dépendent des modules Review et KYC admin non encore implémentés
- `trustScore` utilisé comme proxy pour `averageRating` dans `CourierSummaryResponse` (valeur toujours 0 en l'absence du module Review)
- Package `users/` (doublon) vide — résidu à supprimer

---

### 4.3 Package `course` — ✅ Complet

#### Endpoints
| Méthode | URL | Description |
|---------|-----|-------------|
| POST | `/api/courses` | Crée une course (statut PUBLISHED) |
| GET | `/api/courses/my-courses` | Courses du client connecté (avec chatRoomId) |
| GET | `/api/courses/published` | Toutes les courses en statut PUBLISHED |
| GET | `/api/courses/{id}` | Détail d'une course (ownership vérifié) |
| PUT | `/api/courses/{id}` | Modifie une course (PUBLISHED uniquement) |
| DELETE | `/api/courses/{id}` | Supprime une course (PUBLISHED uniquement) |
| GET | `/api/courses/my-missions` | Missions du coursier connecté (avec chatRoomId) |
| POST | `/api/courses/{courseId}/offers` | Crée une offre + ChatRoom |
| GET | `/api/courses/{courseId}/offers` | Liste les offres d'une course |
| POST | `/api/courses/{courseId}/accept-offer/{offerId}` | Accepte une offre → statut ASSIGNED |

#### Statuts de course (cycle de vie)
`PUBLISHED` → `ASSIGNED` → `IN_PROGRESS` → `PROOFS_SUBMITTED` → `COMPLETED` (+ `DISPUTED`, `CANCELLED`)

#### ⚠️ Lacunes identifiées
- `getCourseById()` vérifie l'ownership côté client mais pas côté coursier : un coursier peut interroger `GET /api/courses/{id}` et recevoir une 400 si ce n'est pas sa course — pas de vue "coursier" sur une course spécifique
- `getPublishedCourses()` retourne **toutes** les courses publiées sans filtrage par zone (feature non encore implémentée)
- Aucune pagination sur les listes
- Le champ `accepted_offer_id` est mis à jour lors de `acceptOffer()` mais `CourseOffer.status` des offres rejetées est bien mis à REJECTED

---

### 4.4 Package `chat` — ✅ Complet

#### Endpoints
| Protocole | Destination | Description |
|-----------|-------------|-------------|
| WebSocket STOMP | `/app/chat.send` | Envoie un message (TEXT, OFFER, SYSTEM) |
| WebSocket STOMP | `/topic/chat/{roomId}` | Abonnement pour recevoir les messages |
| HTTP GET | `/api/chat/rooms/{roomId}/messages` | Historique des messages triés par date ASC |

#### Types de messages
- `TEXT` : message texte ordinaire
- `OFFER` : carte d'offre du coursier (doit avoir `offerAmount > 0`)
- `SYSTEM` : messages système

#### ⚠️ Lacunes identifiées
- **Pas d'autorisation sur WebSocket** : n'importe qui avec un `roomId` peut s'abonner au topic et envoyer des messages — il n'y a aucune vérification que l'émetteur est bien participant du chat
- `ChatRestController.getMessages()` retourne les messages sans vérifier que le demandeur est client ou coursier de la room
- Le tarif minimum n'est pas vérifié sur les OFFER (le `platform_settings` est vide, la table est créée mais pas alimentée)
- L'archivage (`is_archived`) n'est jamais déclenché

---

### 4.5 Package `kyc` — ✅ Complet (stockage réel MinIO + validation fichiers)

#### Endpoints
| Méthode | URL | Description |
|---------|-----|-------------|
| POST | `/api/kyc/submit` | Upload recto/verso/selfie vers MinIO + soumission PENDING |
| GET | `/api/kyc/my-status` | Statut KYC du coursier connecté |

#### Limites multipart configurées (session 34)
```properties
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=35MB
```

#### ⚠️ Lacunes identifiées
- **Aucun endpoint admin pour approuver/rejeter** — les KYC restent PENDING indéfiniment (TICK-038)
- Les clés MinIO sont stockées mais `getPresignedUrl()` n'est jamais appelé pour afficher les documents à l'admin

---

### 4.6 Package `payment` — ✅ Simulé

#### Endpoints
| Méthode | URL | Description |
|---------|-----|-------------|
| POST | `/api/payment/initiate` | Simule un paiement, crée une entrée dans `escrow_ledger` |

#### Logique simulée
- Calcul côté serveur : `base = fraisReels + tarifCoursier`, `fraisService = base × 5%`, `total = base + fraisService`
- Met la course en `IN_PROGRESS` et `escrowStatus = HELD`
- Crée une ligne `EscrowEntry` (type=HOLD, status=PENDING, providerRef=`PAY-<UUID>`)
- **Aucun appel réel** vers Stripe, MTN MoMo ou Orange Money

#### ⚠️ Lacunes identifiées
- Aucun endpoint de validation/libération de l'escrow (TICK-031)
- Aucune intégration réelle avec les fournisseurs de paiement
- Aucun mécanisme de validation automatique à 72h (scheduler)

---

### 4.7 Package `config` — ✅ Complet

| Fichier | Rôle |
|---------|------|
| `SecurityConfig.java` | JWT stateless, CORS, routes publiques, 401 au lieu de 403 |
| `WebSocketConfig.java` | STOMP `/ws`, broker `/topic`, préfixe `/app` |
| `MinioConfig.java` | Bean `MinioClient` |
| `HealthController.java` | `GET /api/health` → 200 OK |

---

### 4.8 Package `shared` — ✅ Complet

| Fichier | Rôle |
|---------|------|
| `FileStorageService.java` | Upload MinIO + URL présignée 1h, création bucket idempotente, noms de fichiers originaux préservés (`<uuid>_<nom-sanitisé>`) |
| `BusinessException.java` | RuntimeException → HTTP 400 |
| `ErrorResponse.java` | Corps standard des erreurs |
| `GlobalExceptionHandler.java` | Gère Business (400), Validation (400), Auth (401), FileStorage (503), Generic (500) |

#### Migrations Flyway — état complet
| Migration | Fichier | Contenu |
|-----------|---------|---------|
| V1 | `V1__init_schema.sql` | Tables `users`, `kyc_submissions` |
| V2 | `V2__create_all_tables.sql` | 11 autres tables |
| V3 | `V3__add_fullname_to_users.sql` | ADD COLUMN `full_name VARCHAR(255)` |
| V4 | `V4__add_message_type.sql` | ADD COLUMNS `message_type`, `offer_amount` sur `chat_messages` |
| V5 | `V5__add_kyc_status_to_users.sql` | ADD COLUMN `kyc_status VARCHAR(20)` + 3 index |
| V6 | `V6__fix_country_column_size.sql` | `ALTER COLUMN country TYPE VARCHAR(100)` (était VARCHAR(2)) |

---

### 4.9 Packages vides (Sprint 4+)

| Package | Tables SQL disponibles | Sprint cible |
|---------|------------------------|--------------|
| `proof/` | `proofs` ✅ | Sprint 4 (TICK-028) |
| `review/` | `reviews` ✅ | Sprint 5 (TICK-032) |
| `dispute/` | `disputes` ✅ | Sprint 5 (TICK-034) |
| `report/` | `report` ✅ | Sprint 5 (TICK-036) |
| `notify/` | — | Sprint 6 (TICK-040) |
| `admin/` | `commission_configs`, `platform_settings` ✅ | Sprint 6 (TICK-038) |

---

## 5. FRONTEND — INVENTAIRE DES COMPOSANTS

### 5.1 Composants d'authentification (`features/auth/`) — ✅ Complets

| Composant | Route | Description |
|-----------|-------|-------------|
| `LoginComponent` | `/login` | Formulaire email/password, redirect par rôle, auto-redirect si déjà connecté, toggle thème/langue |
| `RegisterComponent` | `/register` | Sélecteur rôle CLIENT/COURIER (cards), champs coursier conditionnels, validation mots de passe, redirect vers OTP |
| `OtpComponent` | `/verify-otp` | 6 inputs indépendants, auto-focus, paste, timer 60s, renvoi via endpoint dédié |
| `ForgotPasswordComponent` | `/forgot-password` | Formulaire email, écran confirmation, cooldown 60s |
| `ResetPasswordComponent` | `/reset-password` | Formulaire nouveau mot de passe, token queryParam, toggle visibilité |

---

### 5.2 Composants Client (`features/client/`) — ✅ Complets

| Composant | Route | Description |
|-----------|-------|-------------|
| `ClientDashboardComponent` | `/client/dashboard` | Métriques, liste courses actives avec badges statut, liens Chat et Détails, CTA contextuel |
| `CreateCourseComponent` | `/client/create-course`, `/client/edit-course/:id` | Formulaire 3 étapes, sélecteur type course, ville+quartier → zone, date+heure → scheduledAt, mode édition |
| `SelectCourierComponent` | `/client/select-courier/:courseId` | Liste coursiers avec stats, "Choisir et discuter" → createOffer → redirect chat |
| `CourseDetailComponent` | `/client/course-detail/:courseId` | Timeline 5 étapes, informations financières, boutons Chat/Preuves/Litige selon statut |
| `PayComponent` | `/client/pay/:roomId` | Double déclaration fraisRéels + tarifCoursier, calcul dynamique total, 3 méthodes paiement |

---

### 5.3 Composants Coursier (`features/courier/`) — ✅ Complets

| Composant | Route | Description |
|-----------|-------|-------------|
| `CourierDashboardComponent` | `/courier/dashboard` | Bannière KYC redesignée (dégradé ambré, lisible), métriques, missions actives, nouvelles demandes (modal), bouton Chat/Preuves |
| `KycComponent` | `/courier/kyc` | Formulaire KYC 4 étapes, zones upload avec validation taille/type (max 10 Mo, JPG/PNG/PDF), messages d'erreur inline, barre de progression, statut PENDING/APPROVED affiché |

---

### 5.4 Composant Chat (`features/chat/`) — ✅ Complet

| Composant | Route | Description |
|-----------|-------|-------------|
| `ChatComponent` | `/chat/:roomId` | Layout pleine hauteur, STOMP WebSocket, historique HTTP, bulles messages, **carte d'offre** (OFFER type), panel "Proposer un tarif" (COURIER), "Accepter et payer" → `/client/pay/:roomId` (CLIENT) |

---

### 5.5 Composant Profil (`features/shared/`) — ✅ Complet

| Composant | Routes | Description |
|-----------|--------|-------------|
| `ProfileComponent` | `/client/profile`, `/courier/profile` | Composant réutilisable, affichage adapté selon le rôle, GET/PUT `/api/users/me`, badge KYC (COURIER), lien vers `/forgot-password` |

---

### 5.6 Services (`core/services/`) — ✅ Complets

| Service | Endpoints consommés | Fonctionnalités |
|---------|---------------------|-----------------|
| `AuthService` | `POST /api/auth/*` | login, register, verifyOtp, resendOtp, refreshAccessToken, logout, localStorage (jwt_token, refresh_token, user_id, user_role, user_full_name, user_email) |
| `CourseService` | `GET/POST/PUT /api/courses/*` | CRUD courses, offres, missions, getCourierList |
| `ChatService` | WebSocket STOMP + `GET /api/chat/rooms/{id}/messages` | connect(), sendMessage(), sendOffer(), historique, déconnexion |
| `PaymentService` | `POST /api/payment/initiate` | initiate() |
| `ThemeService` | — | Signal isDarkMode, toggleTheme(), persistance localStorage, data-theme sur `<html>` |
| `ToastService` | — | Signal-based toast stack, success/error/info — design unifié dans tout l'app (fond sombre, icônes SVG, barre de progression) |
| `ApiService` | `GET /api/health` | healthCheck() |

---

### 5.7 Guards et Intercepteurs (`core/`) — ✅ Complets

| Fichier | Rôle |
|---------|------|
| `auth.guard.ts` | Vérifie `jwt_token` en localStorage → redirect `/login` si absent |
| `role.guard.ts` | Compare `user_role` vs `route.data.role` → redirect `/login` si mismatch |
| `auth.interceptor.ts` | Injecte `Authorization: Bearer` + gère les 401 (refresh automatique avec partage des requêtes parallèles via `share()`) |

---

### 5.8 Composants partagés (`shared/components/`) — ✅ Complets

| Composant | Rôle |
|-----------|------|
| `AppShellComponent` | Layout global : sidebar (sélection par rôle), topbar (hamburger, fil d'Ariane, toggle thème), overlay mobile, fermeture sur NavigationEnd |
| `SidebarClientComponent` | Sidebar espace client : Dashboard, Nouvelle course, Historique, Mon profil, Déconnexion |
| `SidebarCourierComponent` | Sidebar espace coursier : Dashboard, Gains, Historique, KYC, Mon profil, Déconnexion |
| `SidebarAdminComponent` | Sidebar espace admin : Dashboard, KYC, Litiges, Signalements, Commissions, Utilisateurs, Déconnexion |

---

## 6. ROUTES FRONTEND — ÉTAT COMPLET

| Route | Statut | Guard | Composant |
|-------|--------|-------|-----------|
| `/` | ✅ | — | Redirect `/login` |
| `/login` | ✅ | — | LoginComponent |
| `/register` | ✅ | — | RegisterComponent |
| `/verify-otp` | ✅ | — | OtpComponent |
| `/forgot-password` | ✅ | — | ForgotPasswordComponent |
| `/reset-password` | ✅ | — | ResetPasswordComponent |
| `/client/dashboard` | ✅ | authGuard + roleGuard(CLIENT) | ClientDashboardComponent |
| `/client/create-course` | ✅ | authGuard + roleGuard(CLIENT) | CreateCourseComponent |
| `/client/edit-course/:id` | ✅ | authGuard + roleGuard(CLIENT) | CreateCourseComponent |
| `/client/select-courier/:courseId` | ✅ | authGuard + roleGuard(CLIENT) | SelectCourierComponent |
| `/client/pay/:roomId` | ✅ | authGuard + roleGuard(CLIENT) | PayComponent |
| `/client/course-detail/:courseId` | ✅ | authGuard + roleGuard(CLIENT) | CourseDetailComponent |
| `/client/profile` | ✅ | authGuard + roleGuard(CLIENT) | ProfileComponent |
| `/client/validate/:courseId` | ⬜ | — | Non implémenté (Sprint 4) |
| `/client/rate/:courseId` | ⬜ | — | Non implémenté (Sprint 5) |
| `/client/dispute-form/:courseId` | ⬜ | — | Non implémenté (Sprint 5) |
| `/client/history` | ⬜ | — | Non implémenté (Sprint 6) |
| `/courier/dashboard` | ✅ | authGuard + roleGuard(COURIER) | CourierDashboardComponent |
| `/courier/kyc` | ✅ | authGuard + roleGuard(COURIER) | KycComponent |
| `/courier/profile` | ✅ | authGuard + roleGuard(COURIER) | ProfileComponent |
| `/courier/proofs/:courseId` | ⬜ | — | Non implémenté (Sprint 4) |
| `/courier/rate-client/:courseId` | ⬜ | — | Non implémenté (Sprint 5) |
| `/courier/earnings` | ⬜ | — | Non implémenté (Sprint 6) |
| `/courier/history` | ⬜ | — | Non implémenté (Sprint 6) |
| `/chat/:roomId` | ✅ | authGuard | ChatComponent |
| `/report-user/:userId` | ⬜ | — | Non implémenté (Sprint 5) |
| `/` (landing) | ⬜ | — | Non implémenté (Sprint 7) |

---

## 7. CONFIGURATION ET INFRASTRUCTURE

### application.properties — état actuel
| Paramètre | Valeur | État |
|-----------|--------|------|
| `server.port` | 8080 | ✅ |
| `spring.datasource.*` | PostgreSQL localhost:5432 | ✅ |
| `spring.jpa.hibernate.ddl-auto` | validate | ✅ |
| `spring.flyway.enabled` | true | ✅ |
| `jwt.secret` | depuis `.env` | ✅ |
| `jwt.expiration` | 900000 ms (15 min) | ✅ |
| `jwt.refresh-expiration` | 604800000 ms (7 jours) | ✅ |
| `spring.data.redis.*` | localhost:6379 | ✅ |
| `brevo.api.*` | REST API Brevo | ✅ |
| `app.otp.*` | TTL 5 min, dev-log=true | ✅ (⚠️ dev-log à false en prod) |
| `app.frontend.url` | http://localhost:4200 | ✅ |
| `minio.*` | localhost:9000, credentials minioadmin | ✅ |
| `spring.servlet.multipart.max-file-size` | **10MB** (ajouté session 34) | ✅ |
| `spring.servlet.multipart.max-request-size` | **35MB** (ajouté session 34) | ✅ |

### Infrastructure Docker (`docker-compose.yml`)
| Service | Image | Port | État |
|---------|-------|------|------|
| postgres | postgres:16-alpine | 5432 | ✅ |
| redis | redis:7-alpine | 6379 | ✅ |
| minio | pgsty/silo:latest | 9000/9001 | ✅ (⚠️ image non standard) |
| pgadmin | dpage/pgadmin4 | 5050 | ✅ |

### CI/CD
- Fichier `.github/workflows/ci.yml` présent (non audité en détail)

---

## 8. ANOMALIES ET RISQUES IDENTIFIÉS

### 🔴 Critiques (à corriger avant mise en production)

| # | Anomalie | Localisation | Impact | Session |
|---|----------|--------------|--------|---------|
| 1 | **Pas d'autorisation sur WebSocket** | `ChatController.java` | N'importe qui peut envoyer/recevoir des messages dans n'importe quelle room | — |
| 2 | **`GET /api/chat/rooms/{id}/messages`** ne vérifie pas la participation | `ChatRestController.java` | Exposition de l'historique de chat à des tiers | — |
| 3 | **Secrets en dur** dans `application.properties` (minio credentials) | `application.properties` | Risque de commit de secrets | — |
| 4 | **`app.otp.dev-log=true`** journalise les codes OTP dans les logs | `application.properties` | Exposition des OTP en production | — |
| 5 | **KYC jamais approuvé** (aucun endpoint admin existant) | `kyc/`, `admin/` | Les coursiers sont bloqués | — |
| 6 | **`OfferService` vérifie `kycStatus == "APPROVED"`** avec `==` Java | `OfferService.java` | Bug latent : peut ne jamais passer si les chaînes ne sont pas internées | — |

### 🟡 Importants (à corriger avant lancement public)

| # | Anomalie | Localisation | Impact | Session |
|---|----------|--------------|--------|---------|
| 7 | **emailVerified** jamais mis à jour après OTP | `AuthService.verifyOtp()` | Utilisateur sans email vérifié peut se connecter | — |
| 8 | **Double déclaration** : `client/pay/:roomId` reçoit `roomId` mais `PaymentService` attend `courseId` | `PayComponent`, `PaymentController` | Confusion entre IDs | — |
| 9 | **Filtrage coursiers non vérifié** : retourne tous ACTIVE, pas que APPROVED | `UserController.java` | Coursiers sans KYC dans la liste | — |
| 10 | **Pas de pagination** sur `getMyCourses`, `getMyMissions`, `getPublishedCourses` | `CourseService.java` | Performance dégradée | — |
| 11 | **Image MinIO non standard** (`pgsty/silo:latest`) dans docker-compose | `docker-compose.yml` | Comportement imprévisible | — |
| 12 | **Package `users/` doublon** vide | Backend racine | Confusion | — |

### ✅ Anomalies corrigées en session 34

| # | Anomalie | Correction |
|---|----------|------------|
| C1 | `ChatRoomRepository.findByCourseId()` retournait `Optional` → `IncorrectResultSizeDataAccessException` avec 2+ offres | Changé en `List<ChatRoom>` + `.stream().findFirst()` |
| C2 | `country VARCHAR(2)` en BDD → 500 sur `PUT /api/users/me` avec un nom de pays complet | Migration V6 : `ALTER COLUMN country TYPE VARCHAR(100)` |
| C3 | `Failed to fetch` sur soumission KYC avec fichiers > 1 MB | `max-file-size=10MB` + `max-request-size=35MB` dans `application.properties` |
| C4 | Aucune validation fichier côté frontend (taille/type) | `validateFile()` dans `KycComponent` + messages d'erreur inline |
| C5 | Noms de fichiers MinIO = UUID brut (impossible à identifier) | `sanitizeFilename()` dans `FileStorageService` → `<uuid>_<nom-original>` |
| C6 | Bannière KYC illisible (classes globales trop pâles) | Redesign `.kyc-banner` scopé dans `CourierDashboardComponent` |
| C7 | Toast notifications : fond rouge plat, pas d'icône, texte illisible | `ToastComponent` entièrement réécrit (fond sombre, icônes SVG, barre de progression) |

---

## 9. CE QUI RESTE À IMPLÉMENTER (Sprints 4–7)

### Sprint 4 — Preuves + Paiement Escrow

| Ticket | Type | Description |
|--------|------|-------------|
| TICK-028 | BE | Module Preuves : entité `Proof`, upload MinIO bucket `proofs`, SHA-256 anti-doublon, statut PROOFS_SUBMITTED, auto-validate à +72h |
| TICK-029 | FE | `ProofsComponent` (coursier) : upload vidéo ≤10s + photos + reçus, barre de progression |
| TICK-030 | FE | `ValidateComponent` (client) : affichage preuves (URLs présignées), boutons Valider/Litige, countdown 72h |
| TICK-031 | BE | `POST /api/courses/{id}/validate` : libération escrow simulée, scheduler 72h |

### Sprint 5 — Notation + Litiges + Signalements

| Ticket | Type | Description |
|--------|------|-------------|
| TICK-032 | BE | Module Review : double notation obligatoire, calcul trustScore, suspension auto (2 notes ≤ 2★ / 30j) |
| TICK-033 | FE | `RateComponent` (client + coursier) : sélecteur étoiles, commentaire |
| TICK-034 | BE | Module Dispute : ouverture de litige, blocage escrow, résolution admin |
| TICK-035 | FE | `DisputeFormComponent` : sélecteur de motif par rôle |
| TICK-036 | BE | Module Report : comptage sur 30j glissants, suspension automatique à 3 signalements |
| TICK-037 | FE | `ReportUserComponent` : formulaire de signalement |

### Sprint 6 — Admin + Notifications

| Ticket | Type | Description |
|--------|------|-------------|
| TICK-038 | BE | Module Admin complet : KYC (approbation/rejet), litiges, signalements, utilisateurs, commissions |
| TICK-039 | FE | Composants Admin : dashboard, KYC viewer, gestion litiges/signalements/commissions/utilisateurs |
| TICK-040 | BE | Module Notifications Brevo : emails transactionnels sur tous les événements métier |
| TICK-041 | FE | `HistoryComponent` (client + coursier) |
| TICK-042 | FE | `EarningsComponent` (coursier) |

### Sprint 7 — Qualité, sécurité & production

| Ticket | Type | Description |
|--------|------|-------------|
| TICK-043 | BE | MapStruct pour mapping entités ↔ DTOs |
| TICK-044 | BE | SpringDoc OpenAPI + Swagger UI (dev uniquement) |
| TICK-045 | BE | Hardening : rate limiting, validation MIME, logs JWT, profils Spring |
| TICK-046 | FE | Landing page `/` |
| TICK-047 | FE | Pages publiques FAQ, Legal, Support |
| TICK-048 | BE | Profils Spring dev/prod, Dockerfile |
| TICK-049 | FE | Environments Angular dev/prod |
| TICK-050 | FULL | Tests d'intégration |

---

## 10. MATRICE DE COUVERTURE FONCTIONNELLE

| Fonctionnalité métier | Backend | Frontend | État global |
|----------------------|---------|----------|-------------|
| Inscription / OTP | ✅ | ✅ | ✅ Complet |
| Connexion / JWT | ✅ | ✅ | ✅ Complet |
| Refresh token | ✅ | ✅ | ✅ Complet |
| Reset mot de passe | ✅ | ✅ | ✅ Complet |
| Création de course | ✅ | ✅ | ✅ Complet |
| Sélection du coursier | ✅ | ✅ | ✅ Complet |
| Chat temps réel (STOMP) | ✅ | ✅ | ✅ Complet |
| Carte d'offre dans le chat | ✅ | ✅ | ✅ Complet |
| Paiement (simulé) | ✅ | ✅ | ✅ Simulé |
| Suivi de course (timeline) | — | ✅ | ⚠️ Frontend only |
| KYC soumission | ✅ MinIO | ✅ | ✅ Complet |
| KYC approbation (admin) | ⬜ | ⬜ | ⬜ Sprint 6 |
| Profil utilisateur | ✅ | ✅ | ✅ Complet |
| Preuves de livraison | ⬜ | ⬜ | ⬜ Sprint 4 |
| Validation client + escrow | ⬜ | ⬜ | ⬜ Sprint 4 |
| Notation mutuelle | ⬜ | ⬜ | ⬜ Sprint 5 |
| Litiges | ⬜ | ⬜ | ⬜ Sprint 5 |
| Signalements | ⬜ | ⬜ | ⬜ Sprint 5 |
| Notifications email | ⬜ | — | ⬜ Sprint 6 |
| Back-office admin | ⬜ | ⬜ | ⬜ Sprint 6 |
| Landing page | — | ⬜ | ⬜ Sprint 7 |
| Mise en production | ⬜ | ⬜ | ⬜ Sprint 7 |

---

## 11. MÉTRIQUES DU CODE

| Composant | Fichiers | Lignes approx. |
|-----------|---------|----------------|
| Backend Java | ~45 fichiers | ~3 500 lignes |
| Frontend TypeScript | ~30 fichiers | ~7 000 lignes |
| Migrations SQL | 5 fichiers | ~200 lignes |
| CSS (design system) | 3 fichiers | ~2 500 lignes |

---

*Rapport généré automatiquement par Kiro CLI — ConfianceCoursier v0.3 (Sprint 3 complet)*
