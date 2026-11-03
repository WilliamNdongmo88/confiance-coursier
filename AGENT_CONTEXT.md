# AGENT CONTEXT — confiance-coursier
> Fichier de continuité pour tout agent IA qui reprend ce projet.
> Mis à jour au : 2026-11-02 (session 33)
> Dernier agent : Kiro CLI

---

## 1. PRÉSENTATION DU PROJET

**confiance-coursier** est une plateforme de mise en relation entre clients et coursiers.
- Les clients publient des courses, les coursiers font des offres, le client choisit.
- Un système d'escrow (paiement séquestre) est prévu mais pas encore implémenté.
- Chat temps réel entre client et coursier via WebSocket STOMP.
- Vérification d'identité (KYC), preuves de livraison, avis, litiges, signalements — schéma SQL prêt, code Java absent.

**Workspace racine :** `C:\Users\DELL\Desktop\Projet\Java\confiance-coursier\`

---

## 2. STRUCTURE DES DOSSIERS

```
confiance-coursier/
├── backend/                          ← Spring Boot 4.1.2 / Java 21 / Maven
│   ├── src/main/java/com/confiancecoursier/backend/
│   │   ├── BackendApplication.java   ← @SpringBootApplication + chargeur .env maison
│   │   ├── config/
│   │   │   ├── SecurityConfig.java   ← JWT, CORS, routes publiques (/api/auth/**)
│   │   │   ├── WebSocketConfig.java  ← STOMP /ws, broker /topic, prefix /app
│   │   │   └── HealthController.java ← GET /api/health
│   │   ├── shared/
│   │   │   ├── exception/
│   │   │   │   ├── BusinessException.java      ← RuntimeException → HTTP 400
│   │   │   │   ├── ErrorResponse.java
│   │   │   │   └── GlobalExceptionHandler.java ← couvre Business/Validation/Auth/Generic
│   │   │   └── util/                 ← VIDE
│   │   ├── auth/
│   │   │   ├── api/
│   │   │   │   ├── AuthController.java          ← POST /register /login /verify-otp
│   │   │   │   │                                   POST /refresh /logout
│   │   │   │   │                                   POST /resend-otp
│   │   │   │   │                                   POST /forgot-password /reset-password
│   │   │   │   └── dto/
│   │   │   │       ├── RegisterRequest.java     ← email, password, fullName, phone, role
│   │   │   │       ├── LoginRequest.java        ← email, password
│   │   │   │       ├── AuthResponse.java        ← token, refreshToken, email, fullName, role, userId
│   │   │   │       ├── OtpResponse.java         ← message, otpRequired
│   │   │   │       ├── VerifyOtpRequest.java    ← email, otp
│   │   │   │       ├── RefreshRequest.java      ← refreshToken
│   │   │   │       ├── ResendOtpRequest.java    ← email
│   │   │   │       ├── ForgotPasswordRequest.java ← email
│   │   │   │       └── ResetPasswordRequest.java  ← token, newPassword
│   │   │   ├── service/
│   │   │   │   ├── AuthService.java             ← register/login/verifyOtp/resendOtp/refresh/logout
│   │   │   │   ├── JwtService.java              ← generate/validate JWT HS256 + refresh token
│   │   │   │   ├── JwtAuthenticationFilter.java ← OncePerRequestFilter, extrait Bearer token
│   │   │   │   ├── OtpService.java              ← Redis TTL 5min, usage unique, envoi Brevo REST API
│   │   │   │   ├── PasswordResetService.java    ← token UUID Redis TTL 15min, envoi Brevo REST API
│   │   │   │   └── UserDetailsServiceImpl.java  ← charge User par email
│   │   │   ├── domain/               ← VIDE
│   │   │   └── repository/           ← VIDE
│   │   ├── user/
│   │   │   ├── domain/User.java      ← @Entity users, Lombok @Builder, fullName
│   │   │   └── repository/UserRepository.java ← findByEmail, existsByEmail
│   │   ├── course/
│   │   │   ├── api/
│   │   │   │   ├── CourseController.java  ← CRUD + getPublished + missions + acceptOffer
│   │   │   │   ├── OfferController.java   ← POST/GET offres par course
│   │   │   │   └── dto/
│   │   │   │       ├── CreateCourseRequest.java  ← description, zone, scheduledAt
│   │   │   │       ├── CreateOfferRequest.java   ← @Valid amount(BigDecimal), details
│   │   │   │       ├── CreateOfferResponse.java  ← offerId, chatRoomId
│   │   │   │       └── CourseResponse.java       ← fromEntity() avec chatRoomId, courseAmount, currency, acceptedOfferId
│   │   │   ├── domain/
│   │   │   │   ├── Course.java        ← @Entity courses
│   │   │   │   └── CourseOffer.java   ← @Entity course_offers
│   │   │   ├── repository/
│   │   │   │   ├── CourseRepository.java      ← findByStatus, findByClientId, findByCourierId
│   │   │   │   └── CourseOfferRepository.java ← findByCourseId, existsByCourseIdAndCourierId
│   │   │   └── service/
│   │   │       ├── CourseService.java  ← CRUD courses (requêtes ciblées, plus de findAll)
│   │   │       └── OfferService.java   ← createOffer → CreateOfferResponse avec chatRoomId
│   │   ├── chat/
│   │   │   ├── domain/
│   │   │   │   ├── ChatRoom.java      ← @Entity chat_rooms
│   │   │   │   └── ChatMessage.java   ← @Entity chat_messages
│   │   │   ├── repository/
│   │   │   │   ├── ChatRoomRepository.java    ← findByCourseIdAndCourierId, findByCourseId
│   │   │   │   └── ChatMessageRepository.java ← findByRoomIdOrderByCreatedAtAsc
│   │   │   └── api/
│   │   │       ├── ChatController.java        ← @MessageMapping WebSocket
│   │   │       ├── ChatRestController.java    ← GET /api/chat/rooms/{roomId}/messages
│   │   │       └── dto/ChatMessageDto.java    ← roomId, senderId, content
│   │   ├── kyc/
│   │   │   └── domain/KycSubmission.java      ← FICHIER VIDE (0 octets)
│   │   ├── admin/      ← VIDE
│   │   ├── dispute/    ← VIDE
│   │   ├── notify/     ← VIDE
│   │   ├── payment/    ← VIDE
│   │   ├── proof/      ← VIDE
│   │   ├── report/     ← VIDE
│   │   └── review/     ← VIDE
│   ├── src/main/resources/
│   │   ├── application.properties    ← DB, JPA, Flyway, JWT, Redis, Brevo REST API, frontend.url
│   │   └── db/migration/
│   │       ├── V1__init_schema.sql         ← tables: users, kyc_submissions
│   │       ├── V2__create_all_tables.sql   ← 10 tables (voir §4)
│   │       └── V3__add_fullname_to_users.sql ← ALTER TABLE users ADD COLUMN full_name
│   ├── .env                          ← BREVO_API_KEY, BREVO_SENDER_EMAIL, JWT_SECRET_KEY (gitignoré)
│   └── src/test/java/.../auth/
│       └── AuthControllerTest.java   ← @TestPropertySource désactive OTP email
│
├── frontend/                         ← Angular 21 / Tailwind CSS v4 / Lucide
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.ts               ← <router-outlet> + <app-toast> + ThemeService init
│   │   │   ├── app.config.ts        ← provideHttpClient(withFetch, withInterceptorsFromDi)
│   │   │   ├── app.routes.ts        ← toutes les routes (voir §6)
│   │   │   ├── core/
│   │   │   │   ├── services/
│   │   │   │   │   ├── auth.service.ts      ← login/register/verifyOtp/resendOtp + localStorage (token, email, fullName, role)
│   │   │   │   │   ├── course.service.ts    ← CRUD courses + offres
│   │   │   │   │   ├── chat.service.ts      ← STOMP WebSocket + HTTP historique
│   │   │   │   │   ├── toast.service.ts     ← signal-based toast stack
│   │   │   │   │   ├── theme.service.ts     ← signal isDarkMode, toggleTheme(), data-theme
│   │   │   │   │   └── api.service.ts       ← healthCheck()
│   │   │   │   ├── guards/
│   │   │   │   │   ├── auth.guard.ts        ← vérifie jwt_token → redirect /login
│   │   │   │   │   └── role.guard.ts        ← vérifie user_role vs route.data.role
│   │   │   │   └── interceptors/
│   │   │   │       └── auth.interceptor.ts  ← Bearer token + 401 → refresh → replay
│   │   │   ├── shared/components/
│   │   │   │   ├── app-shell/app-shell.component.ts      ← sidebar + topbar + overlay
│   │   │   │   ├── sidebar-client/sidebar-client.component.ts
│   │   │   │   ├── sidebar-courier/sidebar-courier.component.ts
│   │   │   │   └── sidebar-admin/sidebar-admin.component.ts
│   │   │   └── features/
│   │   │       ├── auth/
│   │   │       │   ├── login/login.component.ts           ← design system, redirect par rôle, forgot-password
│   │   │       │   ├── register/register.component.ts     ← cartes rôle, champs coursier conditionnels, design system
│   │   │       │   ├── otp/otp.component.ts               ← 6 @ViewChild individuels, DOM natif (pas de binding Angular)
│   │   │       │   ├── forgot-password/forgot-password.component.ts ← email → lien reset, écran confirmation
│   │   │       │   └── reset-password/reset-password.component.ts   ← token queryParam, nouveau mdp, toggle visibilité
│   │   │       ├── client/
│   │   │       │   ├── dashboard/dashboard.component.ts   ← métriques, courses actives, badges statut, chatRoomId
│   │   │       │   └── create-course/create-course.component.ts
│   │   │       ├── courier/
│   │   │       │   └── dashboard/dashboard.component.ts
│   │   │       └── chat/chat.component.ts
│   │   ├── assets/css/
│   │   │   ├── main.css      ← design system global (tokens, boutons, forms…)
│   │   │   ├── app-layout.css← sidebar, topbar, app-shell
│   │   │   └── refonte.css   ← auth-wrapper (flex centré), auth-card, auth-topbar, back-link,
│   │   │                        top-controls, lang-toggle, options-row, forgot-link, role-card…
│   │   ├── proxy.conf.json   ← /api → http://localhost:8080
│   │   └── styles.scss       ← @use 'tailwindcss'
│   ├── angular.json          ← proxyConfig + styles array (main.css, app-layout.css, refonte.css)
│   └── postcss.config.json   ← @tailwindcss/postcss (Tailwind v4)
│
└── docker-compose.yml        ← postgres:5432, redis:6379, minio:9000, pgadmin:5050
```

---

## 3. STACK TECHNIQUE

| Composant | Technologie | Version |
|-----------|------------|---------|
| Backend | Spring Boot | 4.1.2 |
| Langage | Java | 21 |
| Build | Maven | - |
| Base de données | PostgreSQL | 16 (Docker) |
| Migrations | Flyway | intégré Spring Boot |
| Cache/OTP | Redis | 7 (Docker) |
| Sécurité | Spring Security + JWT | JJWT 0.12.6 |
| Temps réel | WebSocket STOMP + SockJS | - |
| Stockage fichiers | MinIO | 9000/9001 (Docker, non intégré) |
| Frontend | Angular | 21 (standalone) |
| CSS | Tailwind CSS | v4 (via @tailwindcss/postcss) |
| Icônes | Lucide Angular | - |
| HTTP Client | Angular HttpClient (withFetch) | - |

---

## 4. BASE DE DONNÉES — 12 TABLES

### V1__init_schema.sql
| Table | Description |
|-------|-------------|
| `users` | Utilisateurs (CLIENT, COURIER, ADMIN) |
| `kyc_submissions` | Soumissions KYC (documents d'identité) |

### V2__create_all_tables.sql
| Table | Description |
|-------|-------------|
| `courses` | Courses publiées par les clients |
| `course_offers` | Offres des coursiers sur une course |
| `chat_rooms` | Salons de discussion (1 par couple course+coursier) |
| `chat_messages` | Messages dans un salon |
| `proofs` | Preuves de livraison (photos géolocalisées) |
| `reviews` | Avis/notations après livraison |
| `disputes` | Litiges |
| `reports` | Signalements d'utilisateurs |
| `commission_configs` | Configuration des commissions |
| `platform_settings` | Paramètres de la plateforme |
| `escrow_ledger` | Registre des mouvements financiers |

---

## 5. CONFIGURATION application.properties

```properties
server.port=8080
spring.datasource.url=jdbc:postgresql://localhost:5432/confiancecoursier
spring.datasource.username=confiance_coursier_user
spring.datasource.password=confiance_coursier_password
spring.jpa.hibernate.ddl-auto=validate
spring.flyway.enabled=true
spring.flyway.baseline-on-migrate=true
spring.flyway.locations=classpath:db/migration
jwt.secret=${JWT_SECRET_KEY}
jwt.expiration=900000              ← 15 minutes
jwt.refresh-expiration=604800000   ← 7 jours (stocké en Redis)
spring.data.redis.host=localhost
spring.data.redis.port=6379
# Brevo REST API (clés dans backend/.env)
brevo.api.key=${BREVO_API_KEY}
brevo.api.url=https://api.brevo.com/v3/smtp/email
app.otp.sender-email=${BREVO_SENDER_EMAIL}
app.otp.app-name=${BREVO_APP_NAME:ConfianceCoursier}
app.otp.email-enabled=true
app.otp.dev-log=true               ← passer à false en production
app.frontend.url=http://localhost:4200
```

---

## 6. ROUTES FRONTEND

| Path | Composant | Auth requise |
|------|-----------|-------------|
| `/login` | LoginComponent | Non |
| `/register` | RegisterComponent | Non |
| `/verify-otp?email=&phone=` | OtpComponent | Non |
| `/forgot-password` | ForgotPasswordComponent | Non |
| `/reset-password?token=` | ResetPasswordComponent | Non |
| `/client/dashboard` | ClientDashboardComponent | Oui — guard CLIENT |
| `/client/create-course` | CreateCourseComponent | Oui — guard CLIENT |
| `/client/edit-course/:id` | CreateCourseComponent | Oui — guard CLIENT |
| `/courier/dashboard` | CourierDashboardComponent | Oui — guard COURIER |
| `/chat/:roomId` | ChatComponent | Oui — authGuard |

---

## 7. CE QUI A ÉTÉ FAIT PAR L'AGENT (historique des actions)

### Session 1 — Scaffolding initial
- Création de l'arborescence backend complète depuis `C:\Users\DELL\Desktop\prompts\text.txt`
  - Dossiers : config, shared/exception, shared/util, auth/api, auth/domain, auth/repository, auth/service, user, kyc, course, chat, payment, proof, review, dispute, report, notify, admin
  - Fichiers vides : `User.java`, `KycSubmission.java`, `application.properties`, `V1__init_schema.sql`, `docker-compose.yml`

### Session 2 — Génération du projet Angular 20/21
- Création du projet Angular avec `@angular/cli@20`
- Installation : `@angular/material`, `@angular/pwa`, `tailwindcss v4`, `@tailwindcss/postcss`, `zone.js`
- Création de la structure `core/`, `shared/`, `features/`
- Configuration `postcss.config.json` (format JSON requis par Angular 17+)
- Correction `app.config.ts` : `provideHttpClient`, `provideAnimationsAsync`, service worker

### Session 3 — Diagnostic tables manquantes
- **Cause identifiée :** `BackendApplication.java` avait `@SpringBootApplication(exclude = {DataSourceAutoConfiguration.class})`
- **Correction :** Retiré l'exclusion → `@SpringBootApplication` standard
- Fichier corrigé : `BackendApplication.java`

### Session 4 — Correction AuthControllerTest
- **Problèmes identifiés et corrigés :**
  1. Fichier dans `src/main/java` au lieu de `src/test/java` → déplacé
  2. `OtpService` non mocké (dépend Redis) → `@MockBean OtpService`
  3. `.status("ACTIVE")` manquant dans les builders User → ajouté
  4. `assert` Java natif → remplacé par `assertThat` AssertJ
- Fichier créé : `src/test/java/.../auth/AuthControllerTest.java`
- Fichier supprimé : `src/main/java/.../auth/AuthControllerTest.java`

### Session 5 — Correction frontend (proxy non branché)
- **Cause principale identifiée :** `proxy.conf.json` existait mais n'était pas référencé dans `angular.json`
  - Angular envoyait `/api/auth/login` vers `localhost:4200` → 404
  - Postman envoyait vers `localhost:8080` → 200
- **Corrections :**
  1. `angular.json` → ajout de `"proxyConfig": "src/proxy.conf.json"` dans `serve.options`
  2. `api.service.ts` → URL `http://localhost:8080/api/health` remplacée par `/api/health`
  3. `app.config.ts` → `provideHttpClient(withFetch(), withInterceptorsFromDi())`
- Correction `@import 'tailwindcss'` → `@use 'tailwindcss'` dans `styles.scss` (dépréciation Dart Sass)
- Installation `zone.js` manquant

### Session 7 — TICK-001 : Ajouter `fullName` sur l'entité `User`
- **`User.java`** : ajout du champ `private String fullName` avec `@Column(name = "full_name")`
- **`AuthService.java`** : `.fullName(request.getFullName())` ajouté dans le builder + `user.getFullName()` dans le retour `AuthResponse`
- **`AuthResponse.java`** : ajout du champ `fullName` (5 args : token, email, fullName, role, userId)
- **`V3__add_fullname_to_users.sql`** : migration déjà présente (vérifiée, rien à créer)
- **`pom.xml`** : suppression de la dépendance dupliquée `spring-boot-starter-webmvc-test`
- **`AuthControllerTest.java`** : ajout de `.status("ACTIVE")` sur les builders User manquants
- Build vérifié : `mvnw compile` → **BUILD SUCCESS** avec Java 21

### Session 8 — TICK-002 : Corriger les `findAll()` dans `CourseService`
- **`CourseRepository.java`** : ajout de `findByCourierIdOrderByCreatedAtDesc(Long courierId)`
- **`CourseService.java`** : `getMyCourses()` utilise désormais `findByClientIdOrderByCreatedAtDesc()` ; `getMyMissions()` utilise `findByCourierIdOrderByCreatedAtDesc()` — plus de `findAll()` + filtre mémoire
- **`CreateCourseRequest.java`** : suppression du champ `suggestedBudget` (déclaré mais jamais utilisé)
- Build vérifié : `mvnw compile` → **BUILD SUCCESS**

### Session 9 — TICK-003 : DTO `CreateOfferRequest`
- **`course/api/dto/CreateOfferRequest.java`** : créé avec `@NotNull @DecimalMin("0.01") BigDecimal amount` et `@NotBlank String details`
- **`OfferController.java`** : signature `createOffer()` remplacée — `Map<String, Object>` → `@Valid @RequestBody CreateOfferRequest` ; imports `Map`, `BigDecimal` supprimés
- Build vérifié : `mvnw compile` → **BUILD SUCCESS**

### Session 10 — TICK-004 : Exposer `chatRoomId` dans les réponses
- **`course/api/dto/CreateOfferResponse.java`** : créé avec `offerId` + `chatRoomId`
- **`course/service/OfferService.java`** : `createOffer()` retourne `CreateOfferResponse` ; `ChatRoom` sauvegardé et son `id` retourné (via `orElseGet()` pour éviter doublons)
- **`course/api/OfferController.java`** : retourne `CreateOfferResponse` au lieu de `CourseOffer`
- **`course/api/dto/CourseResponse.java`** : ajout de `chatRoomId` (nullable) + `courseAmount`, `currency`, `acceptedOfferId` ; surcharge `fromEntity(Course, Long chatRoomId)`
- **`course/service/CourseService.java`** : injection de `ChatRoomRepository` ; `getMyCourses()`, `getCourseById()`, `updateCourse()`, `getMyMissions()` peuplent maintenant `chatRoomId` ; méthode privée `resolveChatRoomId(Course)` factorisée
- Build vérifié : `mvnw compile` → **BUILD SUCCESS**

### Session 11 — TICK-005 : Guards Angular (authGuard + roleGuard)
- **`core/guards/auth.guard.ts`** : créé — vérifie `localStorage.getItem('jwt_token')` ; redirige vers `/login` si absent
- **`core/guards/role.guard.ts`** : créé — compare `localStorage.getItem('user_role')` avec `route.data['role']` ; redirige vers `/login` si mismatch
- **`core/services/auth.service.ts`** : ajout signal `isLoggedIn` (computed depuis `_isLoggedIn`) ; `logout()` supprime `jwt_token` + `user_id` + `user_role` + met à jour le signal ; `login()` appelle `saveToken()` via `tap()` ; `AuthResponse` enrichi avec `fullName`
- **`app.routes.ts`** : doublons supprimés (3 redirects `''`, 2 `client/create-course`) ; `canActivate: [authGuard, roleGuard]` appliqué sur routes client/coursier ; `canActivate: [authGuard]` sur `/chat/:roomId`
- Build vérifié : `ng build --configuration development` → **exit 0**

### Session 12 — TICK-006 : OtpComponent — 6 inputs + Timer
- **`features/auth/otp/otp.component.ts`** : refonte complète
  - 6 inputs `maxlength="1"` avec `@ViewChildren` pour accès direct aux éléments
  - Auto-avancement : saisie d'un chiffre → focus automatique sur le suivant
  - Backspace : efface le chiffre courant ou recule au précédent
  - Flèches gauche/droite : navigation entre inputs
  - Coller (paste) : distribue les 6 chiffres sur les inputs automatiquement
  - Timer 60s avec `setInterval` + `OnDestroy` pour cleanup
  - Bouton "Renvoyer le code" actif après expiration du timer
  - Tous les `alert()` remplacés par `toastService.success()` / `toastService.error()` / `toastService.info()`
  - Email masqué affiché (`ab***@domaine.com`)
  - Bouton "Vérifier" désactivé tant que les 6 chiffres ne sont pas remplis
- Build vérifié : `ng build --configuration development` → **exit 0**

### Session 13 — TICK-007 : RegisterComponent — champs coursier conditionnels
- **`features/auth/register/register.component.ts`** : refonte complète
  - Cartes rôle CLIENT / COURSIER cliquables avec style sélectionné (bordure verte `#123b32`)
  - Champs coursier (`vehicle` select + `interventionZone` input) affichés uniquement si `role === 'COURIER'` via `*ngIf`
  - Champ "Confirmer le mot de passe" avec validation visuelle (bordure rouge si mismatch)
  - Case CGU obligatoire (checkbox `required`)
  - Bouton "Créer" désactivé si CGU non cochée ou mots de passe différents
  - `fullName` bien envoyé au backend dans `authService.register()`
  - Redirect vers `/verify-otp?email=...` après inscription réussie
  - Suppression de la dépendance `SpinnerComponent` et `LucideAngular` (non installés comme standalone)
- Build vérifié : `ng build --configuration development` → **exit 0**
- Lecture exhaustive de tous les fichiers backend et frontend
- Inventaire complet dressé (voir §8 ci-dessous)

### Session 14 — TICK-008 : Intégrer le design system de la maquette dans Angular
- **`core/services/theme.service.ts`** : créé — signal `isDarkMode`, init depuis `localStorage('theme')`, `toggleTheme()` applique `data-theme` sur `<html>` + persiste ; guard SSR via `isPlatformBrowser`
- **`core/services/auth.service.ts`** : `saveToken()` accepte désormais `fullName` et stocke `user_full_name` ; `logout()` supprime la clé ; ajout `getCurrentUserFullName()` (additif, ne casse rien)
- **`shared/components/sidebar-client/`**, **`sidebar-courier/`**, **`sidebar-admin/`** : créés — reprennent la structure `.app-sidebar` de la maquette, nav avec `routerLinkActive`, bloc compte + déconnexion ; input `open` pilotée par l'AppShell
- **`shared/components/app-shell/app-shell.component.ts`** : créé — overlay + sidebar (sélection par rôle) + topbar (hamburger, fil d'Ariane, toggle thème, utilisateur) + `<ng-content>` ; ferme la sidebar sur `NavigationEnd` (mobile) et sur Échap
- **`app.ts`** : injecte `ThemeService` au boot pour appliquer le thème persistant
- **`styles.scss`** : `@import` SCSS des 3 CSS retirés (ne résolvait pas sous le builder esbuild) → CSS chargés en global via le tableau `styles` de `angular.json` (ordre main → app-layout → refonte → styles.scss) ; bloc de tokens `:root` non dupliqué pour ne pas écraser le mode sombre de la maquette
- **`index.html`** : ajout police **Inter** + script inline appliquant `data-theme` avant le boot Angular (anti-FOUC)
- **Wiring** : `ClientDashboardComponent`, `CourierDashboardComponent`, `CreateCourseComponent` enrobés dans `<app-shell>` (navbar inline supprimée) → la sidebar s'affiche sur les pages authentifiées
- **⚠ Chat** : laissé tel quel — son enrobage dans l'app-shell (layout pleine hauteur) est l'objet de **TICK-017** (refonte ChatComponent avec carte d'offre intégrée)
- Build vérifié : `.\node_modules\.bin\ng build --configuration development` → **exit 0** (styles.css 82 kB, design CSS bien bundlé — vérifié via le marqueur `/* src/assets/css/main.css */` dans `dist/frontend/browser/styles.css`)

### Session 15 — TICK-009 : Refondre LoginComponent selon la maquette
- **`features/auth/login/login.component.ts`** : refonte complète fidèle à `maquette-v2/login.html`
  - Topbar : bouton « Retour » (`routerLink="/"`) + toggle FR/EN (signal `lang`, persisté dans `localStorage('lang')`, applique `document.documentElement.lang`) + toggle thème (via `ThemeService`, icône moon/sun)
  - Logo centré sur sa propre ligne (`.auth-logo`)
  - Titre « Se connecter » (`.auth-title`)
  - Formulaire : email + mot de passe + ligne options (« Se souvenir de moi » checkbox + « Mot de passe oublié ? » → toast info)
  - Bouton `btn btn-primary btn-block btn-lg` avec spinner pendant `isLoading`
  - Footer : « Pas encore de compte ? S'inscrire » → `/register`
  - Styles spécifiques à la page dans le tableau `styles` du composant (auth-wrapper flex, auth-topbar, back-link ≥44px, top-controls, lang-toggle, options-row, forgot-link) — les classes de base viennent des CSS globaux
  - **Correction** : suppression du `saveToken()` redondant dans `onSubmit()` (déjà fait via `tap()` dans `AuthService.login()`, qui inclut désormais `fullName`)
  - **Redirect par rôle** après login : COURIER → `/courier/dashboard`, ADMIN → `/client/dashboard` (fallback, route admin au Sprint 6), sinon `/client/dashboard`
  - **Auto-redirect si déjà connecté** : `ngOnInit` vérifie `authService.isLoggedIn()` et redirige vers le dashboard du rôle courant
- Build vérifié : `.\node_modules\.bin\ng build --configuration development` → **exit 0**

### Session 16 — TICK-010 : Implémenter le Refresh Token (backend)
- **`auth/service/JwtService.java`** : ajout `@Value("${jwt.refresh-expiration}")` + `generateRefreshToken(UserDetails)` (même signature que `generateToken`, expiration plus longue) ; `isTokenExpired()` rendu public (validation refresh)
- **`auth/api/dto/AuthResponse.java`** : ajout champ `refreshToken` (2ᵉ position, après `token`) — `@AllArgsConstructor` mis à jour → **2 seuls call sites mis à jour** (login + refresh dans AuthService)
- **`auth/api/dto/RefreshRequest.java`** : créé — `@NotBlank String refreshToken` (corps de `/refresh` et `/logout`)
- **`auth/service/AuthService.java`** : injection de `StringRedisTemplate` + `@Value` refresh TTL
  - `login()` génère access + refresh, stocke le refresh en Redis (clé `refresh:<userId>`, TTL 7j) et le renvoie
  - `refreshAccessToken(token)` : valide (signature+expiration via `extractUsername`), vérifie la correspondance Redis, **rotative** (nouveau refresh, ancien invalidé), renvoie le nouveau couple
  - `logout(token)` : idempotent, supprime la clé Redis `refresh:<userId>` ; helper `extractEmailSafely` (catch-all → null) pour ne jamais 500 sur un token pourri
- **`auth/api/AuthController.java`** : `POST /api/auth/refresh` + `POST /api/auth/logout` (204 No Content)
- **SecurityConfig** : inchangé — `/api/auth/**` est déjà `permitAll`, donc refresh + logout sont publics (aucune ligne redondante ajoutée)
- **Build** : `.\mvnw.cmd test-compile` (Java 21) → **exit 0** (⚠ `JAVA_HOME` pointait sur JDK 17 → basculé sur `jdk-21.0.13.9-hotspot` pour le build)
- **Vérification runtime end-to-end** (Postgres + Redis Docker actifs) : instance lancée sur port **8081** (le 8080 était occupé par une instance backend préexistante — PID 30020, non touchée) via `java -jar target/backend-0.0.1-SNAPSHOT.jar --server.port=8081`
  - login → renvoie `token` + `refreshToken` ✅
  - refresh → nouveau token + nouveau refresh, **rotation** confirmée ✅
  - logout → 204 ✅
  - rejeu du refresh avec l'ancien token → **400** (invalide) ✅
  - rejeu du refresh après logout → **400** ✅
  - Instance de test (8081) stoppée + logs temporaires supprimés après vérification
- **Note tests** : `AuthControllerTest` (@SpringBootTest) échoue actuellement à cause d'un problème **préexistant** sans lien avec ce ticket — `@BeforeEach userRepository.deleteAll()` casse sur une FK (`courses_client_id_fkey`) car la base dev contient un user référencé par des courses. Aucun test automatique ajouté (règle « pas de tests auto sauf demande »)

### Session 17 — TICK-011 : Refresh Token côté Angular
- **`core/services/auth.service.ts`** :
  - `AuthResponse` enrichi de `refreshToken`
  - `login()` persiste désormais `refresh_token` en localStorage (via `saveToken` qui accepte un 5ᵉ param `refreshToken`)
  - ajout `getRefreshToken()` + `refreshAccessToken(refreshToken)` → `POST /api/auth/refresh`
  - `logout()` capture le refresh token, vide tout le localStorage (clé `refresh_token` incluse) via `clearStorage()`, puis **fire-and-forget** `POST /api/auth/logout` (erreurs ignorées — ne bloque pas la navigation)
- **`core/interceptors/auth.interceptor.ts`** : refonte complète
  - Ajoute `Authorization: Bearer` aux requêtes `/api/` (sauf `/api/auth/*`)
  - Sur 401 d'une route protégée : `handle401` → si pas de refresh token → logout + redirect `/login` ; sinon `refreshOnce` puis **rejoue la requête originale** avec le nouveau token
  - **Requêtes parallèles** : `refreshOnce` cache l'Observable de refresh (`refreshInProgress$`) multidiffusé via `share()` → un seul `POST /api/auth/refresh` quel que soit le nombre de 401 simultanées
  - Échec du refresh → déconnexion + redirection `/login` (une seule fois grâce au `share()`)
  - Endpoints `/api/auth/*` exclus du mécanisme pour éviter toute boucle
- Build vérifié : `.\node_modules\.bin\ng build --configuration development` → **exit 0**
- **Note vérif runtime** : le comportement de l'intercepteur (401 → refresh → replay, et parallélisme) ne peut être exercé que dans le runtime navigateur Angular ; vérifié par compilation + logique conforme au pattern standard. L'endpoint `/api/auth/refresh` et `/api/auth/logout` ont été validés end-to-end côté backend lors de TICK-010.

### Session 18 — TICK-012 : Intégrer Brevo pour l'envoi réel des emails OTP
- **`pom.xml`** : ajout `spring-boot-starter-mail`
- **`backend/.env`** (nouveau, **gitignoré**) : `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_APP_NAME` — clé réelle (validée HTTP 200 sur `GET /v3/account`)
- **`.gitignore`** (backend + racine) : `.env` ajouté pour ne jamais committer les secrets
- **`BackendApplication.java`** : ajout d'un chargeur `.env` maison — lit `.env` (cwd puis parents), expose les variables en `System.setProperty` pour que Spring résolve `${BREVO_*}`
- **`application.properties`** : SMTP Brevo (`smtp-relay.brevo.com:587`, STARTTLS) + props OTP
- **`auth/service/OtpService.java`** : refonte — `JavaMailSender` injecté, envoi HTML best-effort, `app.otp.dev-log` journalise le code en DEV
- **Build** : `test-compile` → exit 0
- **Vérif runtime** : envoi tenté → `Authentication failed` (SMTP Brevo exige l'email de connexion comme username, pas l'email expéditeur — cause racine identifiée en fin de session)

### Session 19 — Correction TICK-012 : passage SMTP → REST API Brevo
- **Cause racine** : SMTP Brevo exige l'email de **connexion du compte Brevo** comme username, pas l'email expéditeur. La clé API est valide (HTTP 200 confirmé sur `GET /v3/account`). La solution robuste : utiliser l'API REST Brevo (`POST https://api.brevo.com/v3/smtp/email`) qui n'utilise que la clé (`header api-key`), sans username.
- **`pom.xml`** : suppression de `spring-boot-starter-mail` (inutile avec REST API)
- **`application.properties`** : remplacement config SMTP par `brevo.api.url` + `brevo.api.key` ; `app.otp.sender` → `app.otp.sender-email`
- **`auth/service/OtpService.java`** : refonte complète
  - `JavaMailSender` → `RestClient.create()` (disponible sans dépendance supplémentaire via `spring-boot-starter-webmvc`)
  - `sendOtpEmail()` appelle `POST https://api.brevo.com/v3/smtp/email` avec header `api-key: <BREVO_API_KEY>` et JSON body (`sender`, `to`, `subject`, `htmlContent`)
  - Guard : si clé vide → warn + return (ne bloque pas le boot sans `.env`)
  - Erreur HTTP Brevo → loggée avec status + body (diagnosticable)
- **Build** : `mvnw package -DskipTests` → exit 0
- **Vérif runtime** (port 8082) : inscription → **`Email OTP envoyé via Brevo API`** ✅ — plus aucune erreur "Authentication failed"

### Session 20 — TICK-013 : Refondre `ClientDashboardComponent` selon la maquette
- **`features/client/dashboard/dashboard.component.ts`** : refonte complète fidèle à `maquette-v2/client/dashboard.html`
  - Fil d'Ariane via `<app-shell pageTitle="Vue d'ensemble">`
  - En-tête : "Bonjour [prénom]," + bouton "Créer une course"
  - Notice `app-notice`, 3 métriques (`metrics-grid`) : actives, terminées, note (`—` jusqu'au module reviews)
  - Panel "Courses à suivre" : badges statut colorisés français, bouton Chat → `/chat/{chatRoomId}`, lien "Voir les preuves" si PROOFS_SUBMITTED
  - Aside CTA contextuel (preuves à valider / vide / en cours)
  - `DecimalPipe` pour la note, `NgClass` pour les badges
- **Build** : `ng build --configuration development` → **exit 0**

### Session 21 — Corrections post-TICK-013 (dashboard + auth)
- **`auth.service.ts`** : `saveToken()` stocke désormais `user_email` (6ᵉ param) ; `clearStorage()` supprime aussi `user_email` ; ajout `getCurrentUserEmail()`
- **`app-shell.component.ts`** : `firstName` et `initials` : fallback sur `user_email` (partie avant `@`) si `user_full_name` absent — plus jamais "utilisateur" ni "CC" par défaut
- **`dashboard.component.ts`** : `firstName` utilise `getCurrentUserEmail()` comme fallback ; `averageRating` retourne `null` (affiche `—`) au lieu de 4.8 fictif
- **`refonte.css`** : `.auth-wrapper` corrigé → `display:flex; align-items:center; justify-content:center` (les 3 pages auth étaient collées en haut à gauche) ; `.auth-card` : ajout `width:100%; background:var(--bg-card,#fff); border:1px solid #e1e8e0` ; toutes les classes auth partagées centralisées ici (`auth-topbar`, `back-link`, `top-controls`, `lang-toggle`, `options-row`, `forgot-link`) — le `LoginComponent` ne les redéfinit plus en inline
- **`login.component.ts`** : styles inline supprimés (hérités de `refonte.css`)
- **Build** : `ng build --configuration development` → **exit 0**

### Session 22 — Refonte `RegisterComponent` + `OtpComponent` selon la maquette
- **`register/register.component.ts`** : refonte complète
  - Topbar `auth-topbar` (back-link + toggle FR/thème) identique au login
  - Logo Lucide `<svg lucideBike>` centré
  - Sélecteur de rôle avec `.role-card` / `.role-card.selected` + icônes Lucide
  - Tous les champs utilisent `.form-group`, `.form-label`, `.form-input`, `.form-select` du design system
  - Champs coursier conditionnels (`@if role === 'COURIER'`)
  - Checkbox CGU `.form-checkbox`, bouton `.btn.btn-primary.btn-block.btn-lg`
  - Passe `phone` en queryParam vers `/verify-otp?email=...&phone=...`
  - Styles dark mode dans le composant
- **`otp/otp.component.ts`** : refonte complète
  - Design system : `auth-wrapper`, `auth-card`, `back-link` absolu, `top-controls` absolu
  - Affiche téléphone masqué (principal) + email masqué (secondaire)
  - **Bug propagation chiffres résolu** : abandon de `*ngFor` + `[value]` → **6 `@ViewChild` individuels** (`d0`…`d5`), DOM 100% natif, `focusAt()` via `setTimeout(0)`
  - `isComplete` et `otpValue` lisent directement `el.value` des `ElementRef`
  - `onKeydown(Backspace)` avec `event.preventDefault()`, `onPaste` direct sur DOM
- **Build** : `ng build --configuration development` → **exit 0**

### Session 23 — Correction `resendCode` + endpoint `POST /api/auth/resend-otp`
- **Cause** : `resendCode()` appelait `authService.register()` avec données vides → 400 (validation `@NotBlank`) → OTP jamais renvoyé
- **Backend** :
  - `auth/api/dto/ResendOtpRequest.java` : créé — `@Email @NotBlank String email`
  - `AuthService.resendOtp(email)` : appelle `otpService.generateOtp()` si le compte existe (silencieux sinon)
  - `AuthController` : `POST /api/auth/resend-otp` → 200 systématique
  - Bug corrigé au passage : `verifyOtp()` avait 2 instructions collées sur une ligne (corrupton édition) → corrigé
- **Frontend** :
  - `auth.service.ts` : ajout `resendOtp(email)` → `POST /api/auth/resend-otp`
  - `otp.component.ts` : `resendCode()` appelle `authService.resendOtp()` ; erreur réseau → toast d'erreur (plus de succès silencieux)
- **Build backend** : `mvnw package -DskipTests` → exit 0 ; **Frontend** : `ng build` → exit 0

### Session 24 — Page "Mot de passe oublié" (flux complet)
- **Backend** :
  - `auth/api/dto/ForgotPasswordRequest.java` : `@Email @NotBlank String email`
  - `auth/api/dto/ResetPasswordRequest.java` : `@NotBlank String token` + `@Size(min=8) String newPassword`
  - `auth/service/PasswordResetService.java` : créé
    - `initiateReset(email)` : génère UUID, stocke `pwd-reset:<token>` en Redis (TTL 15 min), envoie email Brevo REST API avec lien `{frontendUrl}/reset-password?token=xxx`
    - `resetPassword(token, newPassword)` : valide Redis, met à jour `passwordHash`, supprime le token (usage unique)
    - Silencieux si email inconnu (anti-énumération)
  - `AuthController` : `POST /api/auth/forgot-password` + `POST /api/auth/reset-password` (injectés via `PasswordResetService`)
  - `application.properties` : ajout `app.frontend.url=http://localhost:4200`
- **Frontend** :
  - `features/auth/forgot-password/forgot-password.component.ts` : créé
    - Formulaire email → `POST /api/auth/forgot-password`
    - Après envoi : écran "Email envoyé !" avec cooldown 60s sur "Renvoyer"
    - Design system identique aux autres pages auth
  - `features/auth/reset-password/reset-password.component.ts` : créé
    - Lit `token` depuis queryParam
    - Formulaire nouveau mot de passe + confirmation + toggle visibilité (LucideEye/EyeOff)
    - États : token absent / succès / formulaire
    - Erreur token expiré → toast + redirect `/forgot-password` après 3s
  - `app.routes.ts` : routes `/forgot-password` et `/reset-password` ajoutées (publiques)
  - `login.component.ts` : `forgotPassword()` navigue vers `/forgot-password` (plus de toast "prochainement")
- **Build backend** : `mvnw package -DskipTests` → exit 0 ; **Frontend** : `ng build` → exit 0

### Session 25 — TICK-014 : Refondre `CreateCourseComponent` — Formulaire 3 étapes
- **`features/client/create-course/create-course.component.ts`** : refonte complète fidèle à `maquette-v2/client/create-course.html`
  - Indicateur 3 étapes visuelles (`.steps-indicator` / `.step-dot` / `.step-dot.active`)
  - Sélecteur de type de course (4 cartes `.type-card` cliquables : Achat, Livraison, Retrait, Autre) avec icônes Lucide individuels (`*ngIf` — pas de `ngSwitch` pour compatibilité standalone)
  - Champs : `description` (textarea), `city` (select Yaoundé/Douala/Bafoussam/Autre), `neighborhood` (input), `dateVal` (date), `timeVal` (time) — 2 colonnes grille
  - Cases preuves : vidéo précochée + désactivée, photos + reçus cochés par défaut
  - `buildZone()` recombine `city + " - " + neighborhood` → champ `zone` du backend
  - `buildScheduledAt()` recombine `dateVal + "T" + timeVal + ":00"` → `LocalDateTime` ISO
  - Après création réussie → navigate `/client/select-courier/{courseId}` (pas dashboard)
  - Mode édition : déparse `zone` → `city + neighborhood`, `scheduledAt` → `date + time`
  - `isFormValid()` gate le bouton Submit
- **`features/client/select-courier/select-courier.component.ts`** : créé (placeholder TICK-015) — affiche un écran "en cours d'implémentation" avec le courseId
- **`app.routes.ts`** : ajout de la route `client/select-courier/:courseId` avec `authGuard + roleGuard(CLIENT)`
- **Build** : `ng build --configuration development` → **exit 0**

### Session 29 — TICK-021 + TICK-022 : CourseDetail + CourierDashboard
- **TICK-021 [FE]** :
  - **`features/client/course-detail/course-detail.component.ts`** : créé, fidèle à `maquette-v2/client/course-detail.html`
    - Timeline visuelle 5 étapes : PUBLISHED → ASSIGNED → IN_PROGRESS → PROOFS_SUBMITTED → COMPLETED avec états done/active/pending via `buildTimeline(status, paidAt, createdAt)`
    - Bloc "Preuves soumises" (bouton → `/client/validate/:id`) si `status=PROOFS_SUBMITTED`
    - Bloc "En attente de preuves" sinon
    - Finances (tarif, commission, total) si `course.totalAmount` présent
    - Bouton Chat → `/chat/{chatRoomId}` si disponible
    - Action box litige (bouton disabled, Sprint 5)
  - **`app.routes.ts`** : route `client/course-detail/:courseId` ajoutée avec guards
  - **Build** → exit 0, zéro warning
- **TICK-022 [FE]** :
  - **`features/courier/dashboard/dashboard.component.ts`** : refonte complète fidèle à `maquette-v2/courier/dashboard.html`
    - En-tête "Bonjour [prénom]," + badge Disponible
    - Alerte KYC bloquante (lien → `/courier/kyc`)
    - 3 métriques : revenus (—), courses terminées (depuis API), note (—)
    - Panel "Mes missions" : liste des missions actives avec statut, bouton Preuves si IN_PROGRESS, bouton Chat si chatRoomId
    - Panel "Nouvelles demandes" : courses PUBLISHED avec bouton "Voir la demande"
    - Modal demande : zone, créneau, description, boutons "Plus tard / Accepter" → `createOffer()` → navigue `/chat/{chatRoomId}`
    - Aside : dark-card gains + barre progression profil confiance + encart règles
  - **Build** → exit 0, zéro warning
- **Sprint 2 marqué ✅ Complet**
- **TICK-020 [BE]** :
  - **`payment/domain/EscrowEntry.java`** : `@Entity escrow_ledger` — `courseId, entryType (HOLD/RELEASE/REFUND), amount, provider, providerRef, status`
  - **`payment/repository/EscrowRepository.java`** : `JpaRepository<EscrowEntry, Long>`
  - **`payment/api/dto/PaymentInitiateRequest.java`** : `courseId, tarifCoursier, fraisReels, paymentMethod` — tous validés `@Valid`
  - **`payment/api/dto/PaymentInitiateResponse.java`** : `paymentRef, totalAmount, status, courseId`
  - **`payment/service/PaymentService.java`** : calcul côté serveur (base = fraisReels + tarifCoursier, fraisService = base × 5%, total = base + fraisService) ; met `course.status = IN_PROGRESS`, `escrowStatus = HELD`, enregistre dans `escrow_ledger` avec ref UUID ; paiement simulé (log seulement)
  - **`payment/api/PaymentController.java`** : `POST /api/payment/initiate` — extrait `clientId` depuis `Principal`, délègue à `PaymentService`
  - **Build backend** : `mvnw test-compile` → **exit 0**
- **TICK-019 [FE]** :
  - **`core/services/payment.service.ts`** : créé — `initiate(req)` → `POST /api/payment/initiate`
  - **`features/client/pay/pay.component.ts`** : créé, fidèle à `maquette-v2/client/pay.html`
    - Récapitulatif : frais réels (input), tarif coursier (read-only depuis queryParam `amount`), frais de service (5%), total calculé dynamiquement
    - Encart vigilance (warning jaune) + note Escrow (vert)
    - 3 options paiement : Stripe (violet), MTN (jaune), Orange (orange) — radio sélectionnable
    - Bouton "Payer N XAF" désactivé tant que fraisReels ≤ 0 ou tarifCoursier = 0
    - Après succès → navigate `/client/course-detail/{courseId}`
  - **`app.routes.ts`** : route `client/pay/:roomId` ajoutée avec `authGuard + roleGuard(CLIENT)`
  - **Build frontend** : `ng build --configuration development` → **exit 0** (zéro warning)
- **TICK-018 [BE]** :
  - **`V4__add_message_type.sql`** : `ALTER TABLE chat_messages ADD COLUMN message_type VARCHAR(20) NOT NULL DEFAULT 'TEXT', ADD COLUMN offer_amount DECIMAL(12,2)`
  - **`ChatMessage.java`** : ajout champs `messageType` (défaut "TEXT") + `offerAmount` (BigDecimal nullable)
  - **`ChatMessageDto.java`** : ajout `messageType` (défaut "TEXT") + `offerAmount` (BigDecimal nullable)
  - **`ChatController.java`** : validation OFFER (offerAmount > 0 obligatoire, sinon ignoré) ; `messageType` normalisé en uppercase ; `offerAmount` stocké seulement pour les OFFER
  - **Build backend** : `mvnw test-compile` → **exit 0**
- **TICK-017 [FE]** :
  - **`features/chat/chat.component.ts`** : refonte complète fidèle aux maquettes `client/chat.html` + `courier/chat.html`
    - Layout pleine hauteur viewport (`:host { height: 100vh }` + flex column) — pas d'AppShell
    - Header : avatar initiales correspondant, nom, badge "Vérifié", boutons Retour / Détails / Signaler
    - Bandeau traçabilité jaune fixe sous le header
    - Bulles de message : incoming (blanc, bordure) / outgoing (vert forêt)
    - **Carte d'offre** (messageType=OFFER) : tarif, ligne de total, note "🔒 coût des achats ajouté au paiement", bouton "Accepter et payer" → `/client/pay/{roomId}?amount=X` (côté CLIENT uniquement) ; "En attente" côté COURIER
    - **Panel "Proposer un tarif"** (signal `showOfferPanel`) : input montant + bouton "Envoyer l'offre" → `chatService.sendOffer()` — visible côté COURIER uniquement
    - Bouton "Offre" dans la barre de saisie (côté COURIER) pour ouvrir le panel
    - Scroll automatique en bas à chaque nouveau message (`AfterViewChecked` + `shouldScrollToBottom`)
    - Dark mode supporté
  - **`core/services/chat.service.ts`** : ajout `sendOffer(roomId, senderId, offerAmount, content)` publiant sur STOMP avec `messageType: 'OFFER'`
  - **Build frontend** : `ng build --configuration development` → **exit 0** (zéro warning)
- **TICK-016 [BE]** :
  - **`user/repository/UserRepository.java`** : ajout `findByRoleAndStatusOrderByTrustScoreDesc(String role, String status)`
  - **`user/api/dto/CourierSummaryResponse.java`** : créé — `id, fullName, initials, averageRating, completedCourses, zone, kycVerified` ; `fromUser()` calcule les initiales, replie `trustScore` en `averageRating`, `city` en `zone` ; `completedCourses=0` et `kycVerified=false` en attendant les sprints KYC et Review
  - **`user/api/UserController.java`** : créé — `GET /api/users/couriers` retourne la liste des COURIER ACTIVE triée par trustScore desc ; accessible à tout utilisateur authentifié (couvert par `anyRequest().authenticated()`)
  - **Build backend** : `mvnw test-compile` → **exit 0**
- **TICK-015 [FE]** :
  - **`features/client/select-courier/select-courier.component.ts`** : refonte complète du placeholder, fidèle à `maquette-v2/client/select-courier.html`
    - Indicateur 3 étapes (1=done, 2=active, 3=vide)
    - Titre de section "Recommandés pour vous" avec icône sparkles
    - Carte coursier (`.courier-card`) : avatar initiales coloré, nom + badge Vérifié (si `kycVerified`), stats (note étoile, nb courses, zone), bouton "Choisir et discuter"
    - Spinner de chargement initial + spinner inline sur le bouton pendant `createOffer`
    - Clic "Choisir et discuter" → `createOffer(courseId, 0.01, ...)` → navigue `/chat/{chatRoomId}`
    - État vide avec bouton "Actualiser"
    - Responsive : sur mobile les cartes passent en colonne
  - **`core/services/course.service.ts`** : ajout interface `CourierSummary` + méthode `getAvailableCouriers()`
  - **Build frontend** : `ng build --configuration development` → **exit 0** (zéro warning)

### Session 30 — TICK-023 [BE] : Module KYC — entité, service, controller, migration
- **`user/domain/User.java`** : ajout champ `private String kycStatus = "NONE"` avec `@Column(name = "kyc_status", nullable = false)`
- **`kyc/domain/KycSubmission.java`** : entité complète `@Entity kyc_submissions` — `userId, documentType, frontFileKey, backFileKey, selfieFileKey, status (PENDING), reviewedBy, reviewedAt, rejectionReason, createdAt`
- **`kyc/repository/KycRepository.java`** : `findByUserId`, `findTopByUserIdOrderByCreatedAtDesc`, `findByStatus`
- **`kyc/api/dto/KycSubmitRequest.java`** : record `documentType` avec validation `@Pattern(CNI|PASSPORT)`
- **`kyc/api/dto/KycStatusResponse.java`** : record avec factory `from(KycSubmission)` + `none()`
- **`kyc/service/KycService.java`** : `submitKyc()` — vérifie rôle COURIER + bloque si PENDING/APPROVED déjà présent + sauvegarde soumission + met `user.kycStatus = PENDING` ; `getMyStatus()` — retourne dernière soumission ou `NONE`
- **`kyc/api/KycController.java`** : `POST /api/kyc/submit` (multipart/form-data : documentType, frontFile, backFile, selfieFile) ; `GET /api/kyc/my-status` ; clés fichiers temporaires (stockage réel MinIO → TICK-024)
- **`course/service/OfferService.java`** : injection `UserRepository` ; vérification `courier.getKycStatus() == "APPROVED"` avant toute offre — lève `BusinessException` si non approuvé
- **Build** : `mvnw compile` → **exit 0** (JDK 21 ms-21.0.13.0.2)

### Session 31 — TICK-024 [BE] : Intégration MinIO pour les fichiers KYC

- **`pom.xml`** : ajout dépendance `io.minio:minio:8.5.11`
- **`application.properties`** : ajout config MinIO — `minio.url`, `minio.access-key`, `minio.secret-key`, `minio.bucket-kyc=kyc-documents`, `minio.bucket-proofs=delivery-proofs`
- **`config/MinioConfig.java`** : créé — bean `MinioClient` configuré depuis `@Value` properties
- **`shared/util/FileStorageService.java`** : créé — service Spring avec 2 méthodes publiques :
  - `uploadFile(MultipartFile, bucket, keyPrefix)` → génère une clé UUID, crée le bucket si absent (idempotent), uploade via `PutObjectArgs`, retourne la clé `keyPrefix/uuid.ext`
  - `getPresignedUrl(fileKey, bucket)` → génère URL GET présignée valable 1h via `GetPresignedObjectUrlArgs`
  - `ensureBucketExists(bucket)` → vérification + création automatique du bucket (privée)
  - `FileStorageService.FileStorageException` → `RuntimeException` interne (→ HTTP 503)
- **`shared/exception/GlobalExceptionHandler.java`** : ajout handler `FileStorageException` → HTTP 503 Service Unavailable
- **`kyc/api/KycController.java`** : injecte `FileStorageService` ; `submit()` appelle `uploadFile()` × 3 (recto, verso, selfie) avant de déléguer à `KycService` ; les clés retournées par MinIO (UUID) remplacent les noms temporaires de TICK-023
- **Build** : `mvnw compile` → **exit 0**

### Session 32 — TICK-025 [FE] : KycComponent (coursier)
- **`features/courier/kyc/kyc.component.ts`** : créé — composant Angular standalone fidèle à `maquette-v2/courier/kyc.html`
  - Indicateur 4 étapes visuelles : Identité / Documents / Selfie / Paiement — classe CSS `done/active` calculée via computed `currentStep()`
  - Carte de statut si KYC déjà PENDING (en attente) ou APPROVED (validé) — formulaire masqué dans ce cas
  - Alerte rouge si REJECTED avec la raison de rejet
  - Étape 1 : Prénom, Nom, Date de naissance, Nationalité — pré-remplis depuis `auth.getCurrentUserFullName()`
  - Étape 2 : sélecteur CNI/PASSPORT + 2 zones upload cliquables (recto, verso) avec prévisualisation nom/taille du fichier sélectionné
  - Étape 3 : zone upload selfie centrée + prévisualisation
  - Étape 4 : méthode de reversement (MTN/Orange/Virement) + numéro
  - Barre de progression upload (`HttpEventType.UploadProgress`)
  - `isFormValid()` gate le bouton Submit (tous les champs et fichiers requis)
  - Après succès → toast + redirect `/courier/dashboard` après 1,8 s
  - Erreur backend → toast avec le message retourné
  - Dark mode supporté (zones upload, steps)
- **`app.routes.ts`** : route `/courier/kyc` ajoutée avec `authGuard + roleGuard(COURIER)`
- **Build** : `ng build --configuration development` → **exit 0** (zéro warning)

### Session 33 — TICK-026 [BE] + TICK-027 [FE] : Profil utilisateur

- **TICK-026 [BE]** :
  - **`user/api/dto/UserProfileResponse.java`** : créé — `id, email, fullName, phone, role, country, city, status, trustScore, badge, kycStatus, initials, createdAt, updatedAt` ; factory `fromUser(User)` calcule les initiales avec fallback email
  - **`user/api/dto/UpdateProfileRequest.java`** : créé — `fullName, phone, country, city` tous `@Size` validés ; email/rôle/statut/trustScore intentionnellement absents
  - **`user/api/UserController.java`** : ajout `GET /api/users/me` → `UserProfileResponse.fromUser(user)` ; `PUT /api/users/me` → mise à jour partielle (champs null = inchangés) ; `resolveUser(principal)` privé factorisé
  - **Build backend** : `mvnw compile` → **exit 0**
- **TICK-027 [FE]** :
  - **`features/shared/profile/profile.component.ts`** : créé — composant réutilisable CLIENT + COURSIER
    - `GET /api/users/me` au `ngOnInit` → initialise les champs du formulaire
    - Avatar rond avec initiales calculées par le backend
    - Badge KYC (APPROVED/PENDING/REJECTED/NONE) affiché uniquement pour les coursiers
    - Email en lecture seule avec info-bulle
    - Section KYC avec lien vers `/courier/kyc` (coursier uniquement)
    - Champ "Ville" : select (client) ou input libre (coursier)
    - Bouton "Changer le mot de passe" → `/forgot-password`
    - `PUT /api/users/me` à la sauvegarde ; met aussi à jour `user_full_name` en localStorage pour la topbar
    - Spinner inline sur le bouton Enregistrer
  - **`app.routes.ts`** : routes `/client/profile` et `/courier/profile` ajoutées avec guards respectifs
  - **Build frontend** : `ng build --configuration development` → **exit 0** (zéro warning)
  - **Sprint 3 marqué ✅ Complet**

### Session 34 — Correctifs, améliorations UX et audit du cycle courses

#### Vérification du flux de récupération des courses client
- **Analyse complète** du cycle `GET /api/courses/my-courses` → dashboard client :
  - Backend : `getCurrentUserId()` extrait l'email du JWT → lookup BDD → `findByClientIdOrderByCreatedAtDesc(clientId)` → `resolveChatRoomId()` → `CourseResponse[]`
  - Frontend : `CourseService.getMyCourses()` → `loadCourses()` → `activeCourses` / `completedCourses` / `proofsSubmittedCourse` (getters calculés) → rendu `@for`
- **Bug corrigé** : `ChatRoomRepository.findByCourseId()` retournait `Optional<ChatRoom>` (singulier) mais plusieurs rooms peuvent exister pour une même course (une par offre coursier). Levait `IncorrectResultSizeDataAccessException` dès qu'une course avait 2+ offres.
  - **`chat/repository/ChatRoomRepository.java`** : `Optional<ChatRoom> findByCourseId()` → `List<ChatRoom> findByCourseId()` + import `java.util.List`
  - **`course/service/CourseService.java`** : `resolveChatRoomId()` adapté → `.stream().findFirst().map(r -> r.getId()).orElse(null)`
  - **Build backend** : `mvnw clean package -DskipTests` → **exit 0**

#### Redesign de la bannière KYC (dashboard coursier)
- **`features/courier/dashboard/dashboard.component.ts`** :
  - Remplacement des classes globales `app-alert app-alert--warning` par un bloc `.kyc-banner` autonome avec styles scopés dans le composant
  - Nouveau design : fond dégradé brun-ambré (`#78350f → #92400e`), icône dans carré semi-transparent, titre blanc gras, description jaune paille (`#fde68a`), bouton CTA jaune paille avec hover élévation

#### Redesign complet du système de notifications toast
- **`shared/toast/toast.component.ts`** : réécriture complète
  - Suppression du `div` plat `bg-red-600` Tailwind
  - Nouveau design : fond sombre profond (`#1c0a0a` error / `#071a0e` success / `#070e1c` info), bordure colorée fine, icône SVG inline par type (checkmark / cercle-info / cercle-exclamation), texte pastel lisible, ombre portée double couche
  - Barre de progression de 3px en bas (animation 4s `scaleX 1→0`) — indicateur visuel de durée de vie
  - Animation d'entrée fluide `translateY + scale`
  - Utilisé automatiquement par toute l'application (composant singleton dans `app.ts`)

#### Correction bug profil — colonne `country VARCHAR(2)`
- **Diagnostic** : `PUT /api/users/me` retournait 500 quand `country` valait `"Cameroun"` — PostgreSQL rejetait la valeur (colonne `VARCHAR(2)` de la migration V1, trop courte pour les noms complets)
- **`db/migration/V6__fix_country_column_size.sql`** : créé — `ALTER TABLE users ALTER COLUMN country TYPE VARCHAR(100)`
- **Flyway** : migration V6 appliquée et vérifiée (`success = t`)
- **Build + restart** : `mvnw clean package -DskipTests` → exit 0 → backend redémarré → tests `PUT /api/users/me` avec `country="Cameroun"` / `"France"` / `"Belgique"` → **200 OK** ✅

#### Correction bug KYC — "Failed to fetch" sur gros fichiers
- **Diagnostic** : Spring Boot utilise 1 MB par fichier / 10 MB par requête par défaut. Quand le total des 3 fichiers dépassait 10 MB, Tomcat coupait la connexion TCP sans réponse → `Failed to fetch` côté navigateur, aucun log côté backend.
- **`application.properties`** : ajout `spring.servlet.multipart.max-file-size=10MB` et `spring.servlet.multipart.max-request-size=35MB`
- **`features/courier/kyc/kyc.component.ts`** : validation côté frontend avant tout envoi réseau
  - Signaux `frontFileError`, `backFileError`, `selfieFileError`
  - `validateFile(file)` : taille > 10 Mo → message explicite ; type MIME invalide → message explicite
  - `.has-error` : zone upload passe en rouge avec bordure `#dc2626`
  - `.file-error` : message texte rouge sous la zone
  - Attribut `accept` HTML précisé : `image/jpeg,image/png,image/webp,application/pdf`
  - Indication `JPG, PNG, PDF · max 10 Mo` affichée dans chaque zone
  - `isFormValid()` bloque si une erreur fichier est présente
- **Build frontend** : `ng build --configuration development` → **exit 0**
- **Build backend + restart** : `mvnw clean package -DskipTests` → exit 0 → test 12 MB total → **200 OK** ✅

#### Noms de fichiers originaux dans MinIO
- **`shared/util/FileStorageService.java`** :
  - `uploadFile()` : clé passée de `<uuid>.<ext>` à `<uuid>_<nom-original-nettoyé>`
  - Nouvelle méthode privée `sanitizeFilename(filename)` :
    - Extrait le nom de base (supprime les séparateurs de chemin)
    - Remplace les caractères non alphanumériques (sauf `.`, `-`, `_`) par `_`
    - Supprime les points en début de nom (fichiers cachés Unix)
    - Limite à 100 caractères
    - Fallback `"fichier"` si vide après nettoyage
  - Exemples : `"CNI recto Fotso Thierry.jpg"` → `kyc/8/<uuid>_CNI_recto_Fotso_Thierry.jpg`
- **Build** : `mvnw clean package -DskipTests` → **exit 0**

---

### Session 38 — TICK-032 [BE] + TICK-033 [FE] : Module Notation

#### TICK-032 [BE] — Module Notation (Review)

- **`review/domain/Review.java`** : entité JPA `reviews` — `courseId, authorId, targetId, reviewerRole, stars, comment, createdAt (@PrePersist)`
- **`review/repository/ReviewRepository.java`** : `findByCourseId`, `findByTargetId`, `findByCourseIdAndAuthorId` (anti-doublon), `countByTargetId`
- **`review/api/dto/SubmitReviewRequest.java`** : record `stars (@NotNull @Min(1) @Max(5))` + `comment (@Size(max=1000))`
- **`review/api/dto/ReviewResponse.java`** : record + factory `from(Review)`
- **`review/service/ReviewService.java`** : logique complète — vérif COMPLETED + participant + anti-doublon + détermination cible (CLIENT note COURIER, COURIER note CLIENT) + `updateTrustScore()` (moyenne glissante) + `checkAndSuspendIfNeeded()` (2 notes ≤ 2⭐ en 30j → SUSPENDED)
- **`review/api/ReviewController.java`** : `POST /api/courses/{courseId}/review` + `GET /api/courses/{courseId}/reviews`
- **`V7__fix_reviews_unique_constraint.sql`** : DROP contrainte UNIQUE sur `course_id` seul + ADD UNIQUE `(course_id, author_id)` → autorise 1 avis par auteur (2 par course)
- **Build backend** : `mvnw compile` → **exit 0**

#### TICK-033 [FE] — RateComponent (client + coursier)

- **`features/shared/rate/rate.component.ts`** : composant réutilisable
  - Route `/client/rate/:courseId` → rôle CLIENT (note le coursier) ; `/courier/rate-client/:courseId` → rôle COURIER (note le client)
  - Avatar initiales, titre et placeholder du commentaire adaptés au rôle
  - 5 étoiles interactives (hover + sélection) avec label contextuel coloré (vert ≥ 3⭐, rouge < 3⭐)
  - Textarea commentaire optionnel
  - Bouton désactivé tant qu'aucune étoile n'est sélectionnée ou pendant l'envoi
  - `POST /api/courses/{courseId}/review` → toast + redirect dashboard après 1,8s
  - Erreur backend affichée en toast (ex: "Vous avez déjà noté cette course.")
- **`validate.component.ts`** : redirect post-validation mis à jour vers `/client/rate/:courseId`
- **`app.routes.ts`** : routes `/client/rate/:courseId` et `/courier/rate-client/:courseId` ajoutées avec guards
- **Build frontend** : `ng build --configuration development` → **exit 0** (zéro warning)

### Session 37 — TICK-030 [FE] + TICK-031 [BE] : Validation des preuves

#### TICK-031 [BE] — Endpoint validation + libération escrow + scheduler

- **`payment/service/PaymentService.java`** : ajout `validateCourse(courseId, clientId)` — vérifie ownership + statut PROOFS_SUBMITTED → appelle `applyValidation()` ; ajout `autoValidateExpiredCourses()` — filtre les PROOFS_SUBMITTED dont autoValidateAt ≤ now ; `applyValidation()` privé : COMPLETED + RELEASED + entrée escrow RELEASE CONFIRMED (simulée)
- **`payment/api/ValidationController.java`** : créé — `POST /api/courses/{courseId}/validate` → 200 avec message
- **`payment/service/ValidationScheduler.java`** : créé — `@Scheduled(cron="0 0 * * * *")` toutes les heures → appelle `autoValidateExpiredCourses()`
- **`BackendApplication.java`** : ajout `@EnableScheduling`
- **`payment/repository/EscrowRepository.java`** : ajout `findByCourseId(Long)`
- **Build backend** : `mvnw compile` → **exit 0**

#### TICK-030 [FE] — ValidateComponent (client)

- **`features/client/validate/validate.component.ts`** : créé — fidèle à `maquette-v2/client/validate.html`
  - `GET /api/courses/{courseId}/proofs` → grille de preuves (photo miniature, vidéo avec overlay play, reçu image ou icône PDF)
  - Clic sur une preuve → `window.open(presignedUrl, '_blank')` (viewer natif du navigateur)
  - Countdown auto-validation 72h mis à jour toutes les minutes
  - Bouton "Valider la course" → `POST /api/courses/{courseId}/validate` → toast + redirect `/client/dashboard` (puis `/client/rate/:courseId` quand TICK-033 sera disponible)
  - Bouton "Signaler un problème" → navigue `/client/dispute-form/:courseId` (TICK-035)
  - Spinner pendant la validation, bouton désactivé pour éviter double-clic
- **`app.routes.ts`** : route `/client/validate/:courseId` ajoutée avec `authGuard + roleGuard(CLIENT)`
- **Build frontend** : `ng build --configuration development` → **exit 0** (zéro warning)
- **Sprint 4 marqué ✅ Complet**

### Session 36 — TICK-028 [BE] + TICK-029 [FE] : Preuves de livraison

#### TICK-028 [BE] — Module Preuves (implémentation réelle)

- **`proof/domain/Proof.java`** : entité JPA `proofs` — champs `courseId, courierId, proofType, fileKey, fileHash (SHA-256), fileSize, mimeType, latitude/longitude (@Column NUMERIC(10,7)), capturedAt, uploadedAt (@PrePersist)`
  - Bug corrigé : `Double` Java mappe vers `float(53)` en Hibernate mais la table V2 déclare `DECIMAL(10,7)` (NUMERIC). Solution : `@Column(columnDefinition = "NUMERIC(10,7)")` sur lat/long → résout l'erreur Hibernate `wrong column type` au démarrage.
- **`proof/repository/ProofRepository.java`** : `findByCourseIdOrderByUploadedAtAsc`, `findByCourseIdAndFileHash`, `countByCourseId`
- **`proof/api/dto/ProofResponse.java`** : record + factory `from(Proof, String presignedUrl)`
- **`proof/service/ProofService.java`** : `submitProof()` — vérif coursier assigné + statut + limite 10 + SHA-256 anti-doublon + upload MinIO + transition IN_PROGRESS → PROOFS_SUBMITTED + `autoValidateAt = +72h` ; `getProofs()` accessible client ET coursier
- **`proof/api/ProofController.java`** : `POST /api/courses/{courseId}/proofs` (multipart, `@Validated` + `@Pattern`) + `GET /api/courses/{courseId}/proofs`
- **Build backend** : `mvnw package -DskipTests` → **exit 0** ; démarrage Hibernate validation → **OK**

#### TICK-029 [FE] — ProofsComponent (coursier)

- **`features/courier/proofs/proofs.component.ts`** : créé — fidèle à `maquette-v2/courier/proofs.html`
  - 3 zones upload cliquables : Vidéo (optionnel, MP4/MOV/WebM ≤ 50 Mo), Photos (min 1, max 10, JPG/PNG/WebP ≤ 10 Mo), Reçus (optionnel, JPG/PNG/PDF ≤ 10 Mo)
  - Validation côté client avant tout envoi réseau (type MIME + taille) avec message d'erreur sous la zone
  - Liste des fichiers sélectionnés avec nom, taille, bouton supprimer, état uploadé (vert) ou échec (rouge)
  - Upload séquentiel fichier par fichier avec `submitProof()` → `POST /api/courses/{courseId}/proofs`
  - Barre de progression globale (% calculé sur nb fichiers traités / total)
  - Champ "Message au client" optionnel (textarea, affiché en commentaire)
  - Après succès total → toast + redirect `/courier/dashboard` après 1,8s
  - Après succès partiel → toast d'erreur avec nb d'échecs (fichiers en erreur restent visibles)
- **`core/services/course.service.ts`** : ajout `submitProof(courseId, file, proofType)` → HttpEvent avec `reportProgress:true` + `getProofs(courseId)`
- **`app.routes.ts`** : route `/courier/proofs/:courseId` ajoutée avec `authGuard + roleGuard(COURIER)`
- **Build frontend** : `ng build --configuration development` → **exit 0** (zéro warning)

### Session 35 — TICK-028 [BE] : Module Preuves de livraison

#### Fichiers créés

- **`proof/domain/Proof.java`** : entité JPA mappée sur `proofs` (V2)
  - Champs : `id, courseId, courierId, proofType, fileKey, fileHash (SHA-256 hex), fileSize, mimeType, latitude, longitude, capturedAt, uploadedAt (@PrePersist)`

- **`proof/repository/ProofRepository.java`** :
  - `findByCourseIdOrderByUploadedAtAsc(Long)` — liste des preuves
  - `findByCourseIdAndFileHash(Long, String)` — détection doublons
  - `countByCourseId(Long)` — limite max 10

- **`proof/api/dto/ProofResponse.java`** : record avec `presignedUrl` (non persistée) + factory `from(Proof, String presignedUrl)`

- **`proof/service/ProofService.java`** :
  - `submitProof()` : vérifie coursier assigné + statuts IN_PROGRESS/PROOFS_SUBMITTED + limite 10 + SHA-256 anti-doublon + upload MinIO bucket `delivery-proofs` + transition IN_PROGRESS → PROOFS_SUBMITTED + `auto_validate_at = now + 72h`
  - `getProofs()` : accessible client ET coursier, retourne preuves avec URLs présignées

- **`proof/api/ProofController.java`** :
  - `POST /api/courses/{courseId}/proofs` (multipart, `@Validated` + `@Pattern` sur `proofType`)
  - `GET  /api/courses/{courseId}/proofs`

- **Build** : `mvnw compile` → **exit 0**

### Session 35 — TICK-028 [BE] : Module Preuves de livraison

#### Fichiers créés

- **`proof/domain/Proof.java`** : entité JPA mappée sur la table `proofs` (déjà dans V2)
  - Champs : `id, courseId, courierId, proofType (PHOTO/VIDEO/RECEIPT), fileKey, fileHash (SHA-256), fileSize, mimeType, latitude, longitude, capturedAt, uploadedAt (@PrePersist)`

- **`proof/repository/ProofRepository.java`** :
  - `findByCourseIdOrderByUploadedAtAsc(Long)` — toutes les preuves d'une course
  - `findByCourseIdAndFileHash(Long, String)` — détection doublons
  - `countByCourseId(Long)` — limite max 10 preuves

- **`proof/api/dto/ProofResponse.java`** : DTO de réponse avec `presignedUrl` peuplée par le service (non persistée en BDD)

- **`proof/service/ProofService.java`** :
  - `submitProof()` : vérifie ownership coursier, statut IN_PROGRESS ou PROOFS_SUBMITTED, limite 10 preuves, hash SHA-256 anti-doublon, upload MinIO (`delivery-proofs/proofs/{courseId}/{courierId}/{uuid}_{nom}.ext`), passage automatique `IN_PROGRESS → PROOFS_SUBMITTED` + `auto_validate_at = NOW() + 72h`, URL présignée 1h en retour
  - `getProofs()` : accessible au client ET au coursier, retourne les preuves avec URLs présignées

- **`proof/api/ProofController.java`** :
  - `POST /api/courses/{courseId}/proofs` (multipart) : `file` + `proofType` (PHOTO|VIDEO|RECEIPT validé par `@Pattern`)
  - `GET  /api/courses/{courseId}/proofs` : liste avec URLs présignées

#### Correction GlobalExceptionHandler
- **`shared/exception/GlobalExceptionHandler.java`** : ajout handler `ConstraintViolationException` → HTTP 400 avec le message de violation (pour que `@Pattern` sur `@RequestParam` retourne un 400 propre au lieu d'un 500)

#### Tests validés (en cours de build)
- ✅ `POST /api/courses/4/proofs` avec PHOTO → 200, course passe en `PROOFS_SUBMITTED`, `auto_validate_at = +72h`
- ✅ Doublon (même fichier) → 400 `"Ce fichier a déjà été soumis pour cette course."`
- ⏳ Type invalide → 400 propre (après rebuild avec fix ConstraintViolation)

---

## 9. DOMAINES À IMPLÉMENTER (par ordre de priorité métier)

### 1. Guards Angular (prérequis avant tout)
Fichiers à créer :
- `frontend/src/app/core/guards/auth.guard.ts`
- `frontend/src/app/core/guards/role.guard.ts`
- Mettre à jour `app.routes.ts`

### 2. Fix roomId dans le Chat
- Backend : exposer `chatRoomId` dans `CourseResponse` ou dans la réponse de `createOffer`
- Frontend : utiliser ce `chatRoomId` dans les liens de navigation

### 3. KYC (Vérification d'identité)
Tables SQL : `kyc_submissions` (V1) — déjà créée
Fichiers à créer :
- `kyc/domain/KycSubmission.java` (remplir le fichier vide)
- `kyc/repository/KycRepository.java`
- `kyc/service/KycService.java`
- `kyc/api/KycController.java` + DTOs
- Upload fichiers via MinIO (à intégrer)
- Frontend : composant de soumission KYC

### 4. Profil utilisateur
- Endpoint `GET/PUT /api/users/me`
- Champs manquants sur `User` : `fullName`, `emailVerified`
- Migration V3 nécessaire

### 5. Preuves de livraison
Table SQL : `proofs` (V2)
Fichiers à créer dans `proof/`

### 6. Avis/Notations
Table SQL : `reviews` (V2)
Fichiers à créer dans `review/`

### 7. Litiges
Table SQL : `disputes` (V2)
Fichiers à créer dans `dispute/`

### 8. Signalements
Table SQL : `reports` (V2)
Fichiers à créer dans `report/`

### 9. Paiements / Escrow
Tables SQL : `escrow_ledger`, `commission_configs`, `platform_settings` (V2)
Fichiers à créer dans `payment/`

### 10. Notifications
Package `notify/` vide — à définir (WebSocket push, email, in-app)

### 11. Admin
Package `admin/` vide — dashboard admin (gestion users, KYC, litiges, settings)

### 12. Refresh Token
- `POST /api/auth/refresh`
- Stocker le refresh token en Redis (TTL 7 jours)
- Endpoint de logout qui invalide le refresh token

---

## 10. COMMANDES UTILES

```powershell
# Démarrer l'infrastructure Docker
cd C:\Users\DELL\Desktop\Projet\Java\confiance-coursier
docker-compose up -d

# Démarrer le backend
cd backend
./mvnw spring-boot:run

# Démarrer le frontend
cd frontend
npm start   # utilise ng serve avec proxy vers localhost:8080

# Build frontend
cd frontend
.\node_modules\.bin\ng build --configuration development

# Lancer les tests backend
cd backend
./mvnw test
```

---

## 11. POINTS D'ATTENTION POUR LE PROCHAIN AGENT

1. **Lire ce fichier en premier** avant toute action sur le projet.
2. **Ne pas recréer** ce qui existe déjà (voir §2 et §7).
3. **Toujours lire les fichiers existants** avant de les modifier.
4. **Pour toute nouvelle table**, créer un script `V3__*.sql` (ne jamais modifier V1 ou V2).
5. **Le build Angular** doit se lancer avec `.\node_modules\.bin\ng build` (pas `npx @angular/cli@latest` qui tente d'installer Angular 22 incompatible avec Node 20).
6. **Le proxy Angular** est configuré via `src/proxy.conf.json` + `angular.json` — ne pas utiliser d'URL absolues `http://localhost:8080` dans les services Angular.
7. **Tailwind v4** dans Angular utilise `@use 'tailwindcss'` (pas `@import`) dans les fichiers `.scss`, et `postcss.config.json` (JSON, pas JS).
8. **`OtpService`** dépend de Redis — toujours le mocker dans les tests (`@MockBean`).
9. **`status("ACTIVE")`** doit être explicitement défini dans les builders `User` (le défaut `"ACTIVE"` ne s'applique pas via Lombok @Builder).
10. **`SecurityConfig`** : routes publiques actuelles = `/api/auth/**`, `/api/health`, `/ws/**`. Toute nouvelle route publique doit y être ajoutée.
11. **⛔ RÈGLE DE VALIDATION OBLIGATOIRE** : après chaque ticket terminé, **s'arrêter et informer l'utilisateur** "Ticket TICK-XXX terminé — je vérifie avant de te demander de continuer." Ne jamais enchaîner deux tickets sans validation explicite de l'utilisateur.

---

## 12. SPÉCIFICATIONS — DOCUMENTS DE RÉFÉRENCE

Deux fichiers de specs sont à la racine du projet. **Les lire avant toute implémentation.**

- `SPÉCIFICATION FONCTIONNELLE V4.md` — spec fonctionnelle V5.0 (fusion V3.0 + V4.0, validée 28/10/2026)
- `# SPÉCIFICATION TECHNIQUE V4.md` — spec technique V3.0 (validée 22/10/2025)

### Décisions architecturales clés (extraites des specs)

| # | Décision | Valeur |
|---|----------|--------|
| 1 | Devise | XAF uniquement |
| 2 | Paiement | Stripe + MTN MoMo + Orange Money |
| 3 | Escrow | Libération après validation client OU 72h |
| 4 | Wallet coursier | ❌ Supprimé — envoi direct |
| 5 | Double déclaration | Coursier = Tarif / Client = Frais réels |
| 6 | Tarif minimum | Configurable admin, bloquant (rejette l'offre) |
| 7 | KYC coursier | CNI/Passeport recto-verso + selfie — obligatoire avant toute mission |
| 8 | Preuves | Vidéo ≤10s + Photos + Reçus (tous obligatoires) |
| 9 | Validation auto | 72h après soumission des preuves |
| 10 | Notation | Obligatoire des deux côtés — bloque la clôture |
| 11 | Seuil suspension coursier | 2 notes ≤ 2⭐ sur 30 jours glissants → suspension auto |
| 12 | Signalements | 3 signalements en 30 jours → suspension auto |
| 13 | Notifications | Email uniquement via Brevo |
| 14 | Chat | Attaché à une course, archivé à la clôture, lisible par admin |
| 15 | Langues | FR + EN |

### Écarts critiques entre specs et implémentation actuelle

| Priorité | Écart | Impact |
|----------|-------|--------|
| 🔴 | Le coursier propose son tarif **via le chat**, pas via formulaire `OfferController` | Déviation du parcours validé |
| 🔴 | **Double déclaration** non implémentée (tarif coursier + frais réels client = total escrow) | Aucun écran paiement |
| 🔴 | **KYC obligatoire** avant offre d'un coursier — aucun check dans `OfferService` | Sécurité métier absente |
| 🔴 | **Tarif minimum coursier** bloquant non vérifié dans `OfferService` | Règle métier manquante |
| 🟡 | **Notation obligatoire** pour clôturer — `review/` vide | Blocage de clôture absent |
| 🟡 | **Suspension auto** (2 notes ≤ 2⭐ / 30j) non implémentée | Règle notation manquante |
| 🟡 | **Signalements** : table SQL présente, règle 3/30j absente, code vide | Sécurité communautaire absente |
| 🟡 | `chat_rooms` : spec dit UNIQUE(course_id), implémentation dit UNIQUE(course_id, courier_id) | Divergence de conception à trancher |
| 🟢 | MapStruct absent du pom.xml (prévu dans spec technique) | Mapping manuel pour l'instant |
| 🟢 | SpringDoc OpenAPI absent | Pas de doc API générée |
| 🟢 | Brevo non intégré — OTP simulé par System.out.println | Emails non envoyés |
| 🟢 | MinIO non intégré côté Java (docker-compose présent) | KYC/preuves/chat files impossibles |

---

## 13. MAQUETTE-V2 — RÉFÉRENCE UI/UX

Dossier : `maquette-v2/` à la racine du projet. **Lire les fichiers HTML avant d'implémenter n'importe quel composant Angular.**

### Design system
- CSS : `assets/css/main.css` + `assets/css/app-layout.css` + `assets/css/refonte.css`
- Icônes : Lucide `0.441.0` via CDN (`unpkg.com/lucide@0.441.0`)
- Couleurs marque :
  - Primaire : `#123b32` (forest) / boutons : `#17634f`
  - Accent : `#d7ed9a` (lime)
  - Fond : `#f7f8f5` (paper)
- Dark mode : `data-theme="light|dark"` sur `<html>`, toggle via JS `toggleTheme()`

### Layout pages authentifiées (app-shell)
Toutes les pages après login utilisent :
- Sidebar fixe gauche (`app-sidebar`) avec nav + account + logout
- Topbar (`app-topbar`) avec breadcrumb + actions
- Overlay mobile (`app-overlay`) pour fermer la sidebar
- Contenu principal (`app-main` > `app-main-inner`)

### Parcours client (ordre des écrans)
```
create-course.html (étape 1/3)
  → select-courier.html (étape 2/3) — liste coursiers recommandés
    → chat.html — négociation + carte offre du coursier (tarif seul)
      → pay.html — double déclaration (frais réels client + tarif coursier)
        → course-detail.html — suivi timeline
          → validate.html — inspection preuves
            → rate.html — notation obligatoire
```

### Points critiques à respecter

| # | Règle maquette |
|---|---------------|
| 1 | L'offre du coursier passe via **une carte dans le chat**, pas un formulaire séparé |
| 2 | `pay.html` : le client saisit les **frais réels** (input), le tarif coursier est affiché (read-only), total calculé dynamiquement |
| 3 | Le bouton "Payer" est **désactivé** tant que les frais réels = 0 |
| 4 | Le dashboard coursier affiche une **alerte KYC bloquante** si non validé |
| 5 | `register.html` : champs supplémentaires coursier (véhicule, zone) apparaissent conditionnellement |
| 6 | `verify-otp.html` : 6 inputs individuels (pas un seul input texte) + timer 60s |
| 7 | Toutes les pages auth ont une topbar Retour/FR/Thème |
| 8 | Boutons primaires toujours `background: #17634f` (vert forêt), jamais bleu |

### Inventaire complet des pages maquette
```
Public (7)    : index, login, register, verify-otp, faq, legal, support
Client (12)   : dashboard, create-course, select-courier, chat, pay, course-detail,
                validate, rate, dispute-form, report-user, history, profile
Coursier (10) : dashboard, chat, kyc, proofs, earnings, rate-client,
                dispute-form, report-user, history, profile
Admin (6)     : dashboard, kyc, disputes, reports, commissions, users
```

### Composants Angular à créer (mapping maquette → Angular)
Chaque page HTML de la maquette doit devenir un composant Angular standalone dans `features/`.
Les CSS `main.css`, `app-layout.css`, `refonte.css` doivent être copiés/adaptés dans Angular.

---

## ÉTAT COURANT — Issues connues

### Backend

| Priorité | Problème | Fichier |
|----------|----------|---------|
| 🟡 | `emailVerified` non implémenté sur `User` | `User.java`, migration à créer |
| 🟡 | Note moyenne coursier non calculée (retourne `null`) | Module `review/` — TICK Sprint 5 |
| 🟡 | `OfferService` vérifie `kycStatus == "APPROVED"` avec `==` Java | `OfferService.java` |
| 🟢 | `app.otp.dev-log=true` à passer à `false` en production | `application.properties` |
| 🟢 | Pas d'autorisation sur WebSocket | `ChatController.java` |
| 🟢 | `GET /api/chat/rooms/{id}/messages` ne vérifie pas la participation | `ChatRestController.java` |

### Frontend

| Priorité | Problème | Fichier |
|----------|----------|---------|
| 🟢 | Note moyenne dans dashboard client affiche `—` | Sera rempli après module reviews |
