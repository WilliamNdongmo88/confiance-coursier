# AGENT CONTEXT — confiance-coursier
> Fichier de continuité pour tout agent IA qui reprend ce projet.
> Mis à jour au : 2026-11-05 (session 48)
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

### Session 39 — TICK-034/035/036/037 : Sprint 5 complet — Litiges + Signalements

#### TICK-034 [BE] — Module Litiges (Dispute)
- **`dispute/domain/Dispute.java`** : entité `disputes` — `courseId, openedBy, motifCode, description, status(OPEN), decision, decidedBy, decidedAt`
- **`dispute/repository/DisputeRepository.java`** : `findByCourseId`, `findByStatus`, `findByCourseIdAndStatus` (anti-doublon)
- **`dispute/api/dto/OpenDisputeRequest.java`** : record `motifCode (@Pattern L-[CF][1-6]) + description (@Size 20-2000)`
- **`dispute/api/dto/DisputeResponse.java`** : record + factory `from(Dispute)`
- **`dispute/service/DisputeService.java`** : `openDispute()` — vérifie participant + un seul OPEN par course + passe course en DISPUTED + escrowStatus=DISPUTED ; `resolveDispute()` (admin) — applique décision + remet COMPLETED + escrow RELEASED/REFUNDED
- **`dispute/api/DisputeController.java`** : `POST /api/disputes?courseId=` + `GET /api/disputes/{id}` + `POST /api/disputes/{id}/resolve`

#### TICK-036 [BE] — Module Signalements (Report)
- **`report/domain/Report.java`** : entité `reports` — `reporterId, targetId, motif, description, status(OPEN), decision`
- **`report/repository/ReportRepository.java`** : `findByStatus`, `findByTargetIdAndCreatedAtAfter` (fenêtre 30j)
- **`report/api/dto/SubmitReportRequest.java`** : record validé `targetId, motif (@Pattern), description`
- **`report/service/ReportService.java`** : `submitReport()` — anti-auto-signalement + `checkAndSuspendIfNeeded()` (≥3 signalements en 30j → SUSPENDED) ; `processReport()` admin — SUSPENSION/AVERTISSEMENT/REJET
- **`report/api/ReportController.java`** : `POST /api/reports` + `POST /api/reports/{id}/process`
- **Build backend** : `mvnw compile` → **exit 0**

#### TICK-035 [FE] — DisputeFormComponent
- **`features/shared/dispute-form/dispute-form.component.ts`** : fidèle à `maquette-v2/client/dispute-form.html`
  - Alerte warning bloquante + sélecteur de motifs groupés (côté Client L-C1..L-C6 / côté Coursier L-F1..L-F4) + textarea description (min 20 chars)
  - `POST /api/disputes?courseId=...` → toast + redirect dashboard
  - Routes : `/client/dispute-form/:courseId` + `/courier/dispute-form/:courseId`

#### TICK-037 [FE] — ReportUserComponent
- **`features/shared/report-user/report-user.component.ts`** : fidèle à `maquette-v2/client/report-user.html`
  - Utilisateur signalé en lecture seule (depuis `:userId` dans l'URL) + sélecteur 5 motifs + textarea
  - `POST /api/reports` → toast + redirect dashboard
  - Route `/report-user/:userId` avec `authGuard` (accessible aux deux rôles)
- **Build frontend** : `ng build --configuration development` → **exit 0** (zéro warning)
- **Sprint 5 marqué ✅ Complet**

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

### Session 40 — TICK-038 [BE] : Module Admin — KYC + Litiges + Signalements + Users + Commissions

#### Contexte
- **Divergence identifiée et corrigée** : TICKETS.md montrait Sprint 4 et 5 (TICK-029 à TICK-037) au statut ⬜, alors que AGENT_CONTEXT.md (Sessions 35-39) et la vérification des fichiers réels prouvent qu'ils sont terminés. Tous les statuts ont été mis à jour en ✅ dans TICKETS.md (corps + tableau récapitulatif + tableau des sprints).

#### Fichiers créés

- **`admin/domain/PlatformSetting.java`** : entité JPA `platform_settings` — `settingKey` (unique), `settingValue`, `updatedBy`, `updatedAt` (`@PrePersist` + `@PreUpdate`)
- **`admin/repository/PlatformSettingRepository.java`** : `findBySettingKey(String)`
- **`admin/service/CommissionService.java`** :
  - `getCommissionSettings()` → lit `commission_rate_client` (défaut 0), `commission_rate_courier` (défaut 20), `tarif_minimum_coursier` (défaut 5000) depuis `platform_settings`
  - `updateCommissionSettings(request, adminId)` → upsert des 3 clés dans `platform_settings`
- **`admin/api/AdminKycController.java`** :
  - `GET /api/admin/kyc?status=PENDING` → liste des soumissions avec infos utilisateur + URLs présignées MinIO (`AdminKycResponse`)
  - `POST /api/admin/kyc/{id}/approve` → `KycService.approveKyc()`
  - `POST /api/admin/kyc/{id}/reject` → body `RejectKycRequest` → `KycService.rejectKyc()`
- **`admin/api/AdminDisputeController.java`** :
  - `GET /api/admin/disputes?status=OPEN` → `DisputeService.getDisputesByStatus()`
  - `POST /api/admin/disputes/{id}/resolve?decision=LIBERATION` → `DisputeService.resolveDispute()`
- **`admin/api/AdminReportController.java`** :
  - `GET /api/admin/reports?status=OPEN` → `ReportService.getReportsByStatus()`
  - `POST /api/admin/reports/{id}/process?decision=SUSPENSION` → `ReportService.processReport()`
- **`admin/api/AdminUserController.java`** :
  - `GET /api/admin/users?role=&status=` → liste filtrable (combinaisons role/status/all) via `UserProfileResponse`
  - `POST /api/admin/users/{id}/suspend` → `user.status = SUSPENDED`
  - `POST /api/admin/users/{id}/activate` → `user.status = ACTIVE`
- **`admin/api/AdminCommissionController.java`** :
  - `GET /api/admin/commissions` → `CommissionService.getCommissionSettings()`
  - `PUT /api/admin/commissions` → body `UpdateCommissionRequest` → `CommissionService.updateCommissionSettings()`
- **`admin/api/dto/RejectKycRequest.java`** : record `@NotBlank @Size(min=10,max=500) String rejectionReason`
- **`admin/api/dto/UpdateCommissionRequest.java`** : record `commissionRateClient`, `commissionRateCourier`, `tarifMinimumCoursier` (tous `@NotNull @DecimalMin`)
- **`admin/api/dto/CommissionSettingsResponse.java`** : DTO avec `defaults()` (0% / 20% / 5000 XAF)
- **`admin/api/dto/AdminKycResponse.java`** : record avec `of(KycSubmission, User, frontUrl, backUrl, selfieUrl)` — inclut userId, userFullName, userEmail, documentType, status, rejectionReason, URLs présignées

#### Fichiers modifiés

- **`config/SecurityConfig.java`** : ajout `.requestMatchers("/api/admin/**").hasRole("ADMIN")` avant `.anyRequest().authenticated()` — seuls les ADMIN peuvent accéder aux routes admin (vérifié : `UserDetailsServiceImpl` mappe `"ROLE_" + role`)
- **`kyc/service/KycService.java`** : ajout de 3 méthodes admin :
  - `getAllKycByStatus(status)` → `findByStatus()` ou `findAll()`
  - `approveKyc(submissionId, adminId)` → `submission.status = APPROVED` + `reviewedBy/reviewedAt` + `user.kycStatus = APPROVED`
  - `rejectKyc(submissionId, adminId, reason)` → `submission.status = REJECTED` + `rejectionReason` + `user.kycStatus = REJECTED`
- **`dispute/service/DisputeService.java`** : ajout `getDisputesByStatus(status)` → `findByStatus()` ou `findAll()`, retourne `List<DisputeResponse>`
- **`report/service/ReportService.java`** : ajout `getReportsByStatus(status)` → `findByStatus()` ou `findAll()`, retourne `List<ReportResponse>`
- **`user/repository/UserRepository.java`** : ajout `findByRole(String)`, `findByStatus(String)`, `findByRoleAndStatus(String, String)` pour le filtrage admin

#### Build
- **`mvnw compile`** → **exit 0** (99 fichiers source compilés, JDK 21)
- **`mvnw test-compile`** → **exit 0** (2 fichiers de test compilés)
- Warnings préexistants uniquement (Lombok `@Builder.Default` sur Course/ChatMessage, API dépréciée dans JwtAuthenticationFilter)

#### Critères d'acceptance vérifiés
- ✅ Seul l'ADMIN peut accéder aux routes `/api/admin/**` (SecurityConfig `hasRole("ADMIN")`)
- ✅ La validation KYC met à jour le statut du coursier (`KycService.approveKyc/rejectKyc` → `user.kycStatus`)
- ✅ La config commissions est persistée dans `platform_settings` (`CommissionService` + `PlatformSettingRepository`)

### Session 41 — TICK-039 [FE] : Composants Admin frontend

#### Fichiers créés

- **`core/services/admin.service.ts`** : service Angular centralisant tous les appels API admin (`/api/admin/*`) — interfaces TypeScript matchant les DTOs backend (AdminKycResponse, DisputeResponse, ReportResponse, UserProfileResponse, CommissionSettings)
- **`features/admin/dashboard/dashboard.component.ts`** : fidèle à `maquette-v2/admin/dashboard.html`
  - Alerte "Actions requises" (KYC + litiges + signalements en attente)
  - 4 stat-cards (courses, commissions, coursiers actifs, clients actifs)
  - 3 colonnes de tâches : KYC en attente, signalements, litiges à arbitrer
  - Liens vers les pages détaillées
- **`features/admin/kyc/kyc.component.ts`** : fidèle à `maquette-v2/admin/kyc.html`
  - Liste des soumissions KYC avec avatar, nom, email, type de document, statut
  - Thumbnails cliquables vers URLs présignées MinIO (recto, verso, selfie)
  - Boutons Approuver / Refuser (refus avec textarea raison min. 10 chars)
  - Cartes des soumissions déjà traitées affichées en grisé
- **`features/admin/disputes/disputes.component.ts`** : fidèle à `maquette-v2/admin/disputes.html`
  - Cartes de litiges avec ID course, motif, parties, description
  - Boutons "Rembourser le client" (REMBOURSEMENT_TOTAL) / "Payer le coursier" (LIBERATION) / "Voir les échanges"
  - Litiges résolus affichés en grisé avec décision
- **`features/admin/reports/reports.component.ts`** : fidèle à `maquette-v2/admin/reports.html`
  - Cartes de signalements avec ID, motif, parties, description
  - Boutons "Classer sans suite" (REJET) / "Suspendre" (SUSPENSION) / "Avertir" (AVERTISSEMENT)
  - Rappel de la règle 3/30j dans une alerte
- **`features/admin/commissions/commissions.component.ts`** : fidèle à `maquette-v2/admin/commissions.html`
  - 3 rate-cards : taux client (slider 0-10%), taux coursier (slider 0-40%), tarif minimum (input XAF)
  - Simulation en temps réel (frais réels 15 000 + tarif 6 250 → total client / net coursier)
  - Bouton "Enregistrer" → `PUT /api/admin/commissions`
  - Layout étroit (`[narrow]="true"`)
- **`features/admin/users/users.component.ts`** : fidèle à `maquette-v2/admin/users.html`
  - Barre de filtres : recherche texte + filtre rôle + filtre statut
  - Tableau desktop (utilisateur, rôle, KYC, inscription, statut, actions)
  - Cartes mobile (responsive)
  - Boutons Suspendre / Réactiver selon le statut courant
  - Filtres combinables (recherche + rôle + statut) via `computed()`

#### Fichiers modifiés
- **`app.routes.ts`** : 6 routes admin ajoutées (`/admin/dashboard`, `/admin/kyc`, `/admin/disputes`, `/admin/reports`, `/admin/commissions`, `/admin/users`) avec `authGuard + roleGuard(ADMIN)`

#### Build
- **`ng build --configuration development`** → **exit 0** (zéro warning)
- Fixes appliqués pendant le build : typing `Record<string, string>` pour les `params` HTTP (TypeScript strict), imports Lucide unused supprimés, `DatePipe` importé dans le dashboard, `FormsModule` importé pour les composants avec `ngModel`, `computed` importé pour les signaux dérivés

#### Notes
- La `SidebarAdminComponent` (créée en TICK-008) pointait déjà vers les routes `/admin/*` — elle est maintenant fonctionnelle
- `AppShellComponent` sélectionne automatiquement la sidebar admin quand `role === 'ADMIN'`
- Les stat-cards du dashboard affichent "—" (pas d'API de stats globales — sera TICK-041/042 ou admin stats dédiées)

### Session 42 — TICK-040 [BE] : Module Notifications (Notify)

#### Contexte
Reprise d'un travail commencé en session précédente (log dans `text2.txt`). La session précédente avait créé `NotificationService.java` et modifié `KycService` + `ProofService`. Cette session a complété les 4 services restants.

#### Fichier créé (session précédente, vérifié)
- **`notify/service/NotificationService.java`** : service central d'envoi d'emails transactionnels via l'API REST Brevo (même approche que `OtpService` — `RestClient` + header `api-key`)
  - Méthode générique `sendEmail(String to, String subject, String htmlBody)` (best-effort : erreur Brevo journalisée, ne bloque jamais l'opération métier)
  - Template HTML standard (en-tête vert `#123b32`, carte blanche, design identique à l'email OTP)
  - 15 méthodes de notification couvrant tous les événements de la spec §10 :
    - KYC : `notifyKycSubmitted`, `notifyKycApproved`, `notifyKycRejected`
    - Course : `notifyCourseAssigned`, `notifyPaymentReceived` (client+coursier), `notifyProofsSubmitted`, `notifyCourseValidated`, `notifyAutoValidation` (client+coursier)
    - Litige : `notifyDisputeOpened` (admin), `notifyDisputeResolved` (client+coursier)
    - Signalement : `notifyReportReceived` (admin), `notifyReportDecision` (utilisateur signalé)
    - Notation : `notifyBadRating` (coursier+admin), `notifySuspension` (user+admin)
    - Badge : `notifyBadgeObtained`
  - `resolveEmail(userId)` : résout l'email via `UserRepository.findById`
  - `notifyAdmins(subject, htmlBody)` : notifie tous les users avec `role=ADMIN` via `userRepository.findByRole("ADMIN")`

#### Fichiers modifiés (session précédente — KycService + ProofService)
- **`kyc/service/KycService.java`** : injection `NotificationService` ; appels `notifyKycSubmitted` dans `submitKyc()`, `notifyKycApproved` dans `approveKyc()`, `notifyKycRejected` dans `rejectKyc()`
- **`proof/service/ProofService.java`** : injection `NotificationService` ; appel `notifyProofsSubmitted(course.getClientId(), courseId)` lors de la transition IN_PROGRESS → PROOFS_SUBMITTED

#### Fichiers modifiés (cette session — 5 services restants)
- **`payment/service/PaymentService.java`** : injection `NotificationService` ; `notifyPaymentReceived(clientId, courierId, total)` dans `initiate()` ; `notifyCourseValidated(courierId, courseId)` dans `validateCourse()` ; `notifyAutoValidation(clientId, courierId, courseId)` dans `autoValidateExpiredCourses()`
- **`review/service/ReviewService.java`** : injection `NotificationService` ; `notifyBadRating(targetId, stars)` dans `submitReview()` (uniquement si cible = COURIER) ; `notifySuspension(courierId)` dans `checkAndSuspendIfNeeded()` quand suspension auto déclenchée
- **`dispute/service/DisputeService.java`** : injection `NotificationService` ; `notifyDisputeOpened(openedBy, courseId)` dans `openDispute()` ; `notifyDisputeResolved(clientId, courierId, decision)` dans `resolveDispute()`
- **`report/service/ReportService.java`** : injection `NotificationService` ; `notifyReportReceived(reporterId, targetId)` dans `submitReport()` ; `notifyReportDecision(targetId, decision)` dans `processReport()` ; `notifySuspension(targetId)` dans `checkAndSuspendIfNeeded()` quand suspension auto déclenchée
- **`course/service/OfferService.java`** : injection `NotificationService` ; `notifyCourseAssigned(courierId, courseId)` dans `acceptOffer()` quand la course passe à ASSIGNED (remplace le TODO précédent)

#### Build
- `mvnw compile` → **exit 0** (100 source files, warnings préexistants uniquement)
- `mvnw test-compile` → **exit 0**

#### Critères d'acceptance vérifiés
- ✅ `NotificationService` créé avec méthode `sendEmail(String to, String subject, String htmlBody)` via Brevo REST API (réutilise le pattern TICK-012)
- ✅ Templates emails pour tous les événements clés de la spec §10
- ✅ `NotificationService` appelé depuis `KycService`, `ProofService`, `OfferService`, `PaymentService`, `ReviewService`, `DisputeService`, `ReportService`
- ✅ Les emails sont en FR (templates HTML en français)
- ✅ Build compile sans erreur

### Session 43 — TICK-041 [FE] : HistoryComponent (Client + Coursier)

#### Fichiers créés
- **`features/shared/history/history.component.ts`** : composant réutilisable CLIENT + COURSIER, fidèle aux maquettes `client/history.html` et `courier/history.html`
  - Détection du rôle depuis `localStorage('user_role')` — appelle `getMyCourses()` (client) ou `getMyMissions()` (coursier)
  - **Vue client** : `row-items` avec icône, titre (description — zone), date, montant, badge statut, lien "Voir détail" → `/client/course-detail/:id`
  - **Vue coursier** : tableau desktop (Date, Description, Net perçu, Statut, Chat) + cartes mobiles responsive — net perçu = `courseAmount × 0.80` (20% commission par défaut)
  - **Filtres** : dropdown statut (Tous/COMPLETED/IN_PROGRESS/PROOFS_SUBMITTED/ASSIGNED/PUBLISHED/CANCELLED/DISPUTED) + tri date (plus récentes/anciennes) via signals
  - `filteredCourses` computed : filtre par statut + tri par date
  - États : chargement, liste vide
  - Dark mode supporté via design system global
  - Styles scopés : table responsive (desktop) + cartes (mobile ≤ 640px)

#### Fichiers modifiés
- **`app.routes.ts`** : routes `/client/history` et `/courier/history` ajoutées avec `authGuard + roleGuard` respectifs + import `HistoryComponent`

#### Notes
- Les sidebars (`sidebar-client` et `sidebar-courier`) pointaient déjà vers `/client/history` et `/courier/history` — les liens sont maintenant fonctionnels
- Le nom du coursier/client n'est pas affiché (non retourné par l'API CourseResponse) — remplacé par zone + date dans les metas
- La note client dans la vue coursier n'est pas affichée (nécessiterait des appels API supplémentaires par course) — affiché "—" ou omis

#### Build
- `ng build --configuration development` → **exit 0** (zéro warning)

### Session 44 — TICK-042 [FE] : EarningsComponent (Coursier)

#### Fichiers créés
- **`features/courier/earnings/earnings.component.ts`** : composant coursier fidèle à `maquette-v2/courier/earnings.html`
  - Appelle `getMyMissions()`, filtre les courses COMPLETED avec `courseAmount > 0`, calcule pour chaque : brut (`courseAmount`), frais (brut × 20%), net (brut - frais)
  - **3 métriques** : revenus ce mois (net), frais de service (20%), courses ce mois (comptage)
  - **Total depuis inscription** : brut total, commissions déduites, net total
  - **Tableau transactions** desktop (Date, Course, Brut, Frais, Net, Statut "Versé") + cartes mobiles responsive
  - Calcul du mois courant via `getMonth() + getFullYear()`
  - Tri décroissant par date
  - États : chargement, liste vide avec lien vers dashboard
  - Taux de commission coursier 20% (constant `COURIER_COMMISSION_RATE`, configurable admin côté backend)

#### Fichiers modifiés
- **`app.routes.ts`** : route `/courier/earnings` ajoutée avec `authGuard + roleGuard(COURIER)` + import `EarningsComponent`

#### Notes
- La sidebar coursier pointait déjà vers `/courier/earnings` — le lien "Mes gains" est maintenant fonctionnel
- Le ticket mentionnait "Créer `GET /api/users/me/earnings`" mais le ticket est labellisé [FE] — les données sont calculées côté frontend à partir de `getMyMissions()` (les courses COMPLETED avec `courseAmount` contiennent toute l'info nécessaire)
- Le taux de commission est codé en dur à 20% (défaut) — une amélioration future pourrait récupérer le taux réel depuis l'API admin

#### Build
- `ng build --configuration development` → **exit 0** (zéro warning)

**Sprint 6 marqué ✅ Complet** (TICK-038 à TICK-042 tous terminés)

### Session 45 — Connexion admin (hors ticket)

#### Problème
Aucun moyen de créer un compte ADMIN — l'inscription ne permet que CLIENT et COURIER. Le LoginComponent redirigeait l'admin vers `/client/dashboard` au lieu de `/admin/dashboard`.

#### Solution — seed au démarrage via CommandLineRunner

#### Fichiers créés
- **`config/AdminSeeder.java`** : `CommandLineRunner` qui crée un compte admin au boot si aucun user avec `role=ADMIN` n'existe
  - Lit `admin.email` et `admin.password` depuis `@Value` (alimentés par `.env`)
  - Si les vars sont vides → log warning + skip
  - Si un admin existe déjà → log info + skip
  - Si l'email est déjà pris par un non-admin → log warning + skip
  - Sinon → crée l'user avec `BCryptPasswordEncoder.encode(password)`, role=ADMIN, status=ACTIVE, fullName="Administrateur"

#### Fichiers modifiés
- **`backend/.env`** : ajout `ADMIN_EMAIL=admin@confiancecoursier.com` + `ADMIN_PASSWORD=Admin123!`
- **`application.properties`** : ajout `admin.email=${ADMIN_EMAIL:}` + `admin.password=${ADMIN_PASSWORD:}`
- **`features/auth/login/login.component.ts`** : redirect `ADMIN` corrigé → `/admin/dashboard` (au lieu de `/client/dashboard`)

#### Flux de connexion admin
1. L'admin se connecte via `/login` (email + mot de passe) → flux OTP normal (Brevo)
2. Après vérification OTP → JWT avec `role=ADMIN`
3. `LoginComponent.redirectByRole('ADMIN')` → navigue vers `/admin/dashboard`
4. `AppShellComponent` sélectionne automatiquement `SidebarAdminComponent`

#### Build
- Backend : `mvnw compile` → **exit 0** (101 source files, warnings préexistants)
- Frontend : `ng build` → **exit 0** (zéro warning)

### Session 46 — Corrections UI admin dashboard (hors ticket)

#### Problèmes signalés
1. **Bouton "Examiner" dans la carte KYC en attente** : layout `flex row` avec `justify-content: space-between` → le bouton prenait toute la largeur disponible et cachait le nom + date.
2. **Stat-cards en mode mobile** : `repeat(auto-fit, minmax(190px, 1fr))` produisait un comportement imprévisible selon la largeur → cartes non centrées.

#### Corrections apportées — `features/admin/dashboard/dashboard.component.ts`

**Fix 1 — Task items (KYC, Signalements, Litiges) :**
- `.task-item` passe de `flex row + justify-content: space-between` à `flex-direction: column`
- Nouvelle classe `.task-action` : lien compact (bordure fine, `4px 10px` padding, hover fond coloré) positionné sous les infos
- `.task-action--danger` : variante rouge pour Signalements et Litiges
- Les boutons `btn btn-primary btn-sm` / `btn btn-danger btn-sm` remplacés par `task-action` / `task-action--danger` dans les 3 colonnes

**Fix 2 — Stats grid responsive :**
- Grille fixe `repeat(4, 1fr)` en desktop (remplace `auto-fit minmax`)
- `repeat(2, 1fr)` à ≤ 1024px (2 colonnes centrées)
- `1fr` à ≤ 480px (colonne unique, bien centré)

#### Build
- `ng build --configuration development` → **exit 0** (zéro warning)

### Session 47 — Modal prévisualisation media (hors ticket)

#### Problèmes signalés
- `admin/kyc` : clic sur les vignettes Recto/Verso/Selfie ouvrait `target="_blank"` (redirection page)
- `client/validate` : clic sur une preuve appelait `window.open()` (redirection page)

#### Solution — composant `MediaViewerComponent` réutilisable

#### Fichier créé
- **`shared/components/media-viewer/media-viewer.component.ts`** : modal plein écran de prévisualisation
  - Support **image** (`<img>`), **vidéo** (`<video controls autoplay>`), **PDF** (`<iframe>`)
  - Fond sombre semi-opaque (`rgba(0,0,0,.88)`) avec animation `fade-in`
  - **Toolbar** : label du document + bouton télécharger (lien `download`) + bouton fermer (×)
  - **Navigation flèches** gauche/droite (si `items.length > 1`) + indicateur de points cliquables
  - Fermeture : clic sur le backdrop, touche **Échap** (`@HostListener('document:keydown.escape')`)
  - Inputs : `items: MediaItem[]`, `activeIndex: number`, `open: boolean`
  - Output : `close: EventEmitter<void>`
  - `MediaItem` interface exportée : `{ url, type: 'image'|'video'|'pdf', label? }`

#### Fichiers modifiés

**`features/admin/kyc/kyc.component.ts`** :
- Import `MediaViewerComponent` + `MediaItem` ajouté
- Les 3 liens `<a href target="_blank">` remplacés par des `<button>` avec label sous l'icône
- Signaux ajoutés : `viewerOpen`, `viewerItems`, `viewerIndex`
- Méthode `openViewer(kyc, startIndex)` : construit la liste `[Recto, Verso, Selfie]` depuis les URLs MinIO et ouvre la modal au bon index
- Modal `<app-media-viewer>` ajoutée à la fin du template
- Style `.kyc-doc-thumb` mis à jour : `flex-direction: column` + label `.kyc-doc-label` + hover coloré vert

**`features/client/validate/validate.component.ts`** :
- Import `MediaViewerComponent` + `MediaItem` ajouté
- Signaux ajoutés : `viewerOpen`, `viewerItems`, `viewerIndex`
- `openProof(proof)` : remplace `window.open()` — construit la liste de tous les médias de la course (photos/vidéos/reçus), détermine le type (`image`/`video`/`pdf`) selon `proofType` et `mimeType`, ouvre la modal à l'index du media cliqué (navigation entre toutes les preuves)
- Modal `<app-media-viewer>` ajoutée à la fin du template

#### Build
- `ng build --configuration development` → **exit 0** (zéro warning)

---

### Session 48 — Plan d'amélioration + TICK-051 [BE] : rôle ADMIN interdit à l'inscription
- **Revue complète** du projet → `PLAN_AMELIORATION.md` (anomalies A-01…A-38, parcours cibles, escrow, tickets TICK-051+). **Lire ce plan en premier.**
- **TICK-051** :
  - `auth/api/dto/RegisterRequest.java` : `@Pattern("(?i)\s*(CLIENT|COURIER)\s*")` sur `role`
  - `auth/service/AuthService.java` : `SELF_REGISTRABLE_ROLES = {CLIENT, COURIER}` ; rôle normalisé (trim + upper) ; `BusinessException` sinon (défense en profondeur)
  - Tests (sans base) : `RegisterRequestValidationTest` (13) + `AuthServiceRegisterTest` (11) → 24/24 ✅
  - Vérif runtime (instance 8083) : ADMIN/admin → 400 ; CLIENT/COURIER → 200 ; comptes de test supprimés. Un seul ADMIN en base (le compte seedé).

---

### Session 48 (suite) — TICK-052 [BE] : décisions réservées à l'admin
- `dispute/api/DisputeController.java` : suppression de `POST /api/disputes/{id}/resolve` (ouvert à tout authentifié)
- `report/api/ReportController.java` : suppression de `POST /api/reports/{id}/process`
- Seules routes de décision restantes : `/api/admin/disputes/{id}/resolve` et `/api/admin/reports/{id}/process` (hasRole ADMIN) — déjà utilisées par `admin.service.ts`
- `GlobalExceptionHandler` : `NoResourceFoundException` → 404 et `HttpRequestMethodNotSupportedException` → 405 (avant : 500 via le handler générique)
- Test : `security/DecisionEndpointsAdminOnlyTest` (4) ; vérif runtime avec un token CLIENT : anciennes routes → 404, routes admin → 401 (refus ; le 403 propre est l'objet de TICK-067)

---

### Session 48 (suite) — TICK-053 [BE+FE] : suspension effective
- `User.isActive()` (statut `ACTIVE`) ; `UserDetailsServiceImpl` : `accountLocked(!isActive())`
- `SecurityConfig.authenticationProvider()` : contrôle du verrou **après** le mot de passe (pre-checks vides, post-checks = `AccountStatusUserDetailsChecker`) → mauvais mot de passe = 401 même si suspendu (pas de fuite d'état)
- `JwtAuthenticationFilter` : JWT d'un compte verrouillé ignoré → 401
- `AuthService.refreshAccessToken` : compte non actif → suppression du refresh Redis + `AccountSuspendedException` (403) ; nouvelle méthode `revokeSessions(userId)`
- `AdminUserController.suspend` : refus de l'auto-suspension (400) + `revokeSessions`
- `GlobalExceptionHandler` : `AccountSuspendedException` / `LockedException` / `DisabledException` → 403 « Votre compte est suspendu… »
- Front : `auth.interceptor.ts` → refresh 403 ⇒ `/login?reason=suspended` ; `login.component.ts` affiche le toast
- Les suspensions automatiques (`ReportService`, `ReviewService`) sont couvertes par le filtre + le refresh (pas de révocation explicite nécessaire)
- Tests : `security/AccountSuspensionTest` (10) — total 38 ✅ ; vérif runtime 8083 (9 contrôles OK, données de test supprimées) ; `ng build` OK

---

### Session 48 (suite) — TICK-054 [BE] : jeton d'accès ≠ refresh token
- `JwtService` : claim `typ` = `access` (generateToken) / `refresh` (generateRefreshToken, + `jti` UUID) ; `isAccessToken()`, `isRefreshToken()` ; `isTokenValid()` exige `typ=access` (jetons sans type refusés)
- `AuthService.extractEmailSafely` (refresh + logout) : n'accepte qu'un `typ=refresh`
- ⚠ Effet de bord attendu au déploiement : les sessions ouvertes avant ce changement (jetons sans `typ`) doivent se reconnecter une fois
- Tests : `auth/service/JwtTokenTypeTest` (5) — total 43 ✅ ; vérif runtime 8083 : refresh en Bearer → 401, access sur /refresh → 400, rotation OK, rejeu ancien refresh → 400

---

### Session 51 — Revue de conformité TICK-055 → TICK-061 et corrections (2026-11-05)

Revue du code des tickets 055 à 061 contre `PLAN_AMELIORATION.md`, puis correction de tous les écarts.

**Défauts bloquants trouvés et corrigés**
- `V12__escrow_service.sql` ne s'appliquait pas (`updated_by` BIGINT recevait `'SYSTEM'`) → le backend ne démarrait plus. V12 corrigée (`NULL`) — elle n'avait jamais été appliquée.
- `courses.real_costs` NOT NULL (V11) mais `Course.builder()` laissait `null` → création de course en échec. `@Builder.Default` = 0 + garde `@PrePersist`.
- `ChatSecurityTest` ne compilait plus depuis TICK-058 → `mvnw test` cassé.
- Deuxième offre d'un coursier refusée par l'index UNIQUE partiel (INSERT IDENTITY avant l'UPDATE SUPERSEDED) → `saveAndFlush` de l'ancienne offre.
- STOMP : un SEND direct vers `/topic/chat/{id}` était diffusé tel quel par le simple broker (faux expéditeur, SYSTEM, fausse offre) → SEND limité à `/app/**`.

**Escrow / argent (TICK-060/061)**
- Convention de signe : HOLD +, toutes les sorties − ; `EscrowService.close()` vérifie « somme du ledger = 0 » et annule sinon.
- `EscrowService` est désormais le seul à écrire le ledger et `escrowStatus` (`hold`, `markDisputed`, `release`, `refundTotal`, `split`). `refundPartial` supprimé.
- Partage : x au client (0 < x < total), z = min(frais plateforme, total − x), y = total − x − z au coursier ; course COMPLETED, escrow SPLIT.
- `refund_platform_fees` figé sur la course au remboursement ; `@Version` sur `Course` ; 409 sur conflit optimiste.
- Verrou `findByIdForUpdate` sur acceptation d'offre, soumission d'offre, validation client, auto-validation (course par course), ouverture et résolution de litige.
- Idempotence : rejeu refusé si autre client/course ; `@Size(max=64)` sur la clé.
- `GainsService` lit uniquement les lignes `PLATFORM_FEE` du ledger (`EscrowRepository`).

**Offres / chat (TICK-057/058/059)**
- Règles d'offre centralisées dans `OfferService.submitOffer` (rôle COURIER + KYC APPROVED + compte actif, course PUBLISHED sous verrou, entier XAF ≥ minimum). `ChatController` délègue.
- `chat_messages.offer_id` persisté ; l'historique expose `offerStatus` (transient) → « Accepter » seulement sur l'offre ACTIVE d'une course PUBLISHED, y compris après rechargement.
- Ancien `POST /api/courses/{id}/offers` + DTOs supprimés (contournaient le minimum).
- `POST /conversations` côté client : correspondant = coursier actif KYC APPROVED, course PUBLISHED (salon existant renvoyé tel quel).

**Migration V13** (`V13__ledger_signs_offers_cleanup.sql`) : normalisation des signes du ledger, `courses.refund_platform_fees`, `courses.version`, `chat_messages.offer_id`, offres < 1 XAF → REJECTED, offres PENDING résiduelles → SUPERSEDED.

**Frontend** : carte d'offre pilotée par `offerStatus` (+ bouton « Payer maintenant » si ASSIGNED), plus de 5000 / 20 % en dur dans le chat, page de paiement bloquée hors ASSIGNED, clé d'idempotence unique par visite, bouton « Partager » + confirmations dans l'admin Litiges, `createOffer` retiré du service.

**Tests** : 106 tests unitaires verts — nouveaux `EscrowServiceTest` (invariant ledger = 0, E2E-1/E2E-3), `OfferServiceTest`, `PaymentServiceTest`, `ChatAndOfferIdorTest` (MockMvc, rôles × ressources), `ChatSecurityTest` étendu (SEND direct refusé, KYC). `BackendApplicationTests` vert (schéma validé avec V13). `AuthControllerTest` en échec préexistant : `userRepository.deleteAll()` sur la base de dev bloqué par les FK (A-38 → TICK-096).

**Commandes** : tests unitaires `mvnw test "-Dtest=!BackendApplicationTests,!AuthControllerTest" "-Dsurefire.failIfNoSpecifiedTests=false"` ; `ng build --configuration development` OK ; `ng build` (prod) échoue sur les budgets (bundle 1,11 Mo > 1 Mo, style chat 9,1 ko > 8 ko), déjà le cas avant ces corrections.

---

### Session 52 — TICK-062 [FULL] : règles d'ouverture des litiges (2026-11-05)

- `DisputeService.openDispute` : verrou `findByIdForUpdate` ; seuls le client propriétaire et le coursier **assigné** (sinon 403) ; statut IN_PROGRESS ou PROOFS_SUBMITTED uniquement (sinon 409) ; un seul litige OPEN (409) ; motifs par rôle (client L-C1..C6, coursier L-F1..F4, sinon 400) ; gel du séquestre via `EscrowService.markDisputed` (toujours, le statut garantissant HELD).
- `OpenDisputeRequest` : pattern resserré `L-C[1-6]|L-F[1-4]`.
- Migration `V14__one_open_dispute_per_course.sql` : doublons OPEN existants clos (`decision = DOUBLON`) puis index UNIQUE partiel `idx_disputes_one_open_per_course`.
- Scheduler : déjà limité à PROOFS_SUBMITTED ; la course est rechargée sous verrou et ignorée si elle est passée en DISPUTED entre-temps (test ajouté).
- Front `dispute-form` : seuls les motifs du rôle connecté ; statut de la course chargé à l'ouverture → message « Litige impossible » et bouton désactivé hors IN_PROGRESS/PROOFS_SUBMITTED ; `*ngFor` remplacé par `@for`.
- Tests : `DisputeOpeningRulesTest` (13 cas) + `PaymentServiceTest.schedulerSkipsCourseDisputedInTheMeantime` → 120 tests unitaires verts ; `BackendApplicationTests` vert (V14 appliquée sur la base de dev).
- Hors périmètre (inchangé) : redirection vers `/client/dashboard` après envoi, y compris pour le coursier (TICK-072) ; bouton litige désactivé dans le détail client (TICK-084).

---

### Session 53 — TICK-063 [BE] : signalements anti-abus (2026-11-06)

- `ReportService.submitReport` : un seul signalement par paire (signaleur, cible) sur 30 jours glissants → 409 sinon (`existsByReporterIdAndTargetIdAndCreatedAtAfter`).
- Suspension automatique : `countDistinctReportersWithSharedCourse` (JPQL) compte les **signaleurs distincts** de la fenêtre ayant une course commune avec la cible (client ↔ coursier) ; signalements rejetés (`decision = REJET`) exclus ; seuil 3.
- ADMIN exclus de la suspension automatique et de la décision SUSPENSION d'un signalement ; compte déjà suspendu non re-notifié.
- Toute suspension (auto ou décision admin sur signalement) appelle `AuthService.revokeSessions` (TICK-053).
- Horloge injectable (`Clock`) pour tester la fenêtre de 30 jours.
- Tests : `ReportAntiAbuseTest` (8 cas) → 128 tests unitaires verts ; `BackendApplicationTests` vert (requête JPQL validée au démarrage). La requête elle-même sera couverte sur une vraie base avec Testcontainers (TICK-096).
- Limite connue : deux envois simultanés du même signaleur peuvent passer le contrôle de doublon (pas de contrainte SQL possible sur une fenêtre glissante) ; impact faible, le comptage reste par signaleur distinct.

---

### Session 54 — TICK-064 [FULL] : soumission de preuves complète et fiable (2026-11-06)

**Backend**
- `ProofService` en deux temps : `uploadProof` (brouillon, course IN_PROGRESS, coursier assigné, sous verrou) puis `submitProofs` (`POST /api/courses/{id}/proofs/submit`) qui exige 1 vidéo + ≥ 1 photo (+ ≥ 1 reçu si `realCosts` > 0), passe en PROOFS_SUBMITTED et démarre les 72 h. Idempotent. La 1re preuve ne déclenche plus rien.
- `DELETE /api/courses/{id}/proofs/{proofId}` : retrait d'un brouillon (MinIO + base).
- Reprise sans doublon : un fichier déjà reçu (même SHA-256, même type) renvoie la preuve existante.
- `ProofFileInspector` (sans dépendance) : type réel par signature d'octets (JPEG, PNG, WebP, HEIC, PDF, MP4/MOV/3GP, WebM) — le MIME enregistré est celui détecté ; durée vidéo lue dans `moov/mvhd` (MP4/MOV/3GP) → refus au-delà de 10 s (tolérance 10,5 s) ; WebM : durée NULL = « à vérifier ».
- Limites : vidéo 30 Mo, photo/reçu 10 Mo, 10 fichiers, 1 vidéo. Multipart global 30 Mo / 40 Mo ; KYC garde 10 Mo par document (contrôle ajouté dans `KycController`) ; `MaxUploadSizeExceededException` → 413.
- Le client ne voit pas les brouillons (liste vide tant que IN_PROGRESS) ; accès non participant → 403.
- `CourseResponse.realCosts` exposé (reçu obligatoire si > 0).
- Migration `V15__proof_video_duration.sql` : `proofs.video_duration_ms`.

**Frontend** (`courier/proofs`) : statut contrôlé au chargement (bloqué hors IN_PROGRESS) ; brouillons déjà reçus rechargés ; caméra d'abord (`capture="environment"` : Filmer / Photographier) + galerie ; durée vidéo vérifiée via `video.duration` ; progression en octets ; seuls les fichiers en échec sont renvoyés ; soumission finale puis retour au dashboard ; checklist des éléments obligatoires ; cibles ≥ 44 px. Champ « Message au client » retiré (il n'était envoyé nulle part).

**Tests** : `ProofFileInspectorTest` (4) + `ProofServiceTest` (15) → 147 tests unitaires verts ; `BackendApplicationTests` vert (V15 appliquée sur la base de dev).

---

### Session 55 — TICK-065 [BE] : scheduler de validation automatique robuste (2026-11-06)

- Nouveau `AutoValidationService` (remplace `PaymentService.autoValidateExpiredCourses`, supprimée) :
  requête ciblée `CourseRepository.findIdsDueForAutoValidation(now)` (`status = PROOFS_SUBMITTED AND auto_validate_at <= now`) ;
  **une transaction par course** (`TransactionTemplate`), course rechargée sous verrou et revérifiée (ignorée si validée, en litige ou échéance repoussée) ;
  emails **après commit** ; une erreur sur une course est journalisée (`error`) et n'arrête pas les suivantes ; une panne d'email n'annule pas la libération.
- `ValidationScheduler` : cron `${app.scheduler.validation.cron:0 */15 * * * *}` (toutes les 15 min au lieu de toutes les heures) + `@SchedulerLock(name = "autoValidateCourses")`.
- `config/SchedulingConfig` : bean `Clock` (injectable en test) ; ShedLock `JdbcTemplateLockProvider` (heure de la base), `@EnableSchedulerLock`.
- Dépendances : `shedlock-spring` et `shedlock-provider-jdbc-template` 7.9.0 (compatibles Spring 7 / Boot 4).
- Migration `V16__shedlock.sql` : table `shedlock` + index `courses(status, auto_validate_at)`.
- Validation manuelle (`PaymentService.validateCourse`) : email au coursier également envoyé après commit.
- Tests : `AutoValidationServiceTest` (8 cas, horloge fixe, ordre libération → commit → email, isolement des erreurs) → 154 tests unitaires verts ; `BackendApplicationTests` vert (V16 appliquée sur la base de dev). Test d'intégration sur vraie base : TICK-096/097 (Testcontainers).

---

### Session 56 — TICK-065b [FULL] : échéance de preuves et non-livraison (2026-11-06)

**Machine à états** : IN_PROGRESS → (échéance dépassée) **OVERDUE** → prolonger (IN_PROGRESS) | annuler (REFUNDED) | litige (DISPUTED) | 48 h sans action → REFUNDED (aucune preuve et aucun achat) ou litige automatique (motif `SYS-NL`). Aucun chemin ne libère les fonds au coursier.

**Backend**
- Migration `V17__proof_deadline_no_show.sql` : `courses.proof_deadline`, `extension_count`, `overdue_since`, `proof_reminder_sent_at` (+ index) ; paramètres `proof_deadline_hours` 24, `proof_reminder_hours_before` 6, `overdue_grace_hours` 48, `max_extensions` 2, `refund_platform_fees_on_courier_no_show` true ; table `courier_incidents` (UNIQUE course/type) ; rattrapage de l'échéance des courses IN_PROGRESS.
- `ProofDeadlinePolicy` : lecture des paramètres (défauts du plan) ; `deadlineFor(scheduledAt, paidAt)` = max(prévue, paiement) + 24 h, appliqué dans `PaymentService.initiate` (Clock injecté).
- `ProofDeadlineService` : `extend` (12/24 h, max 2, retour IN_PROGRESS), `cancelOverdue` (remboursement selon `refund_platform_fees_on_courier_no_show`, incident NO_SHOW), `processDeadlines` (rappel −6 h une fois, passage OVERDUE, décision après 48 h) — une transaction par course sous verrou, emails après commit, erreurs isolées. 2 incidents NO_SHOW en 30 j → coursier suspendu + sessions révoquées.
- `ProofDeadlineScheduler` : cron `${app.scheduler.proof-deadline.cron:0 5/15 * * * *}` + ShedLock `proofDeadlines`.
- Endpoints client : `POST /api/courses/{id}/extend` `{hours}` et `POST /api/courses/{id}/cancel-overdue`.
- `ProofService` : brouillons et soumission acceptés en OVERDUE (le coursier peut encore livrer) ; brouillons cachés au client. `DisputeService` : litige ouvrable en OVERDUE.
- `CourseResponse` : `proofDeadline`, `extensionCount`, `overdueSince`, `autoValidateAt`. `/api/commissions/public` : `maxExtensions`, `overdueGraceHours`.
- `NotificationService` : rappel, retard (coursier + client), prolongation, remboursement non-livraison, litige automatique (parties + admins).

**Frontend** : détail client — échéance et temps restant (IN_PROGRESS) ; carte « Le coursier est en retard » avec Prolonger 12 h / 24 h (restant lu du serveur), Annuler et être remboursé (confirmation), Ouvrir un litige, date de décision automatique. Missions coursier : échéance affichée, bouton Preuves aussi en OVERDUE. Statuts OVERDUE / REFUNDED / DISPUTED ajoutés aux badges (dashboards, historique). Formulaire de litige et écran Preuves acceptent OVERDUE. Admin Litiges : `SYS-NL` affiché « Litige automatique : non-livraison ».

**Tests** : `ProofDeadlineServiceTest` (14 cas : rappel unique, OVERDUE, prolongations max 2, annulation + incident, paramètre de remboursement, suspension au 2ᵉ incident, remboursement automatique, litige automatique si preuves partielles ou achats, jamais de libération, isolement des erreurs), `PaymentServiceTest` (échéance au paiement), `DisputeOpeningRulesTest` (OVERDUE) → 171 tests unitaires verts ; `BackendApplicationTests` vert (V17 appliquée).

---

### Session 57 — TICK-066 [BE] : OTP et 2FA admin durcis (2026-11-06)

- `OtpService` : 5 essais faux maximum puis code invalidé (429 « demandez un nouveau code ») ; compteur remis à zéro à chaque nouveau code ; quotas d'envoi **1/min et 5/h par email et par IP** (Redis `otp:rl:min:*`, `otp:rl:hour:*`) → `TooManyRequestsException` (429) ; email normalisé en minuscules ; `issueOtp` (sans quota) + `consumeSendQuota`. Paramètres `app.otp.max-attempts`, `app.otp.max-sends-per-hour`.
- IP : `ClientIpResolver` (`X-Forwarded-For` seulement si `app.security.trust-forwarded-for=true`). L'IP loopback n'est pas limitée (sinon tous les clients derrière le proxy de dev ou un reverse proxy local partageraient le quota) — en production derrière un proxy, activer `trust-forwarded-for`.
- `AuthService` : connexion = mot de passe **d'abord**, puis OTP ; 2FA appliquée à **tout compte `role=ADMIN`** (le champ `admin.email` n'est plus utilisé pour la 2FA) ; `requestAdminOtp(email, password, ip)` vérifie le mot de passe avant tout envoi ; `resendOtp` consomme le quota avant de tester l'existence du compte (pas d'énumération via 429).
- `POST /api/auth/admin-otp` attend désormais `{email, password}` (401 si identifiants faux) ; register et resend-otp transmettent l'IP.
- Front : login envoie le mot de passe à `/admin-otp` et affiche les erreurs 401/403/429 ; écran OTP affiche le message serveur (minute d'attente, essais épuisés).
- Tests : `OtpServiceTest` (9, Redis simulé), `AdminTwoFactorTest` (8) → 188 tests unitaires verts ; `BackendApplicationTests` vert.

---

### Session 58 — TICK-067 [BE] : rôles par route et codes HTTP justes (2026-11-06)

- `SecurityConfig` — rôles par route :
  - **CLIENT** : `POST /api/courses`, `PUT|DELETE /api/courses/*`, `GET /api/courses/my-courses`, `POST …/offers/*/accept`, `…/accept-offer/*`, `…/validate`, `…/extend`, `…/cancel-overdue`, `/api/payment/**`, `GET /api/users/couriers` ;
  - **COURIER** : `POST|DELETE /api/courses/*/proofs/**`, `/api/kyc/**`, `GET /api/courses/published`, `GET /api/courses/my-missions` ;
  - **CLIENT ou COURIER** : `POST …/conversations`, `…/review`, `/api/disputes`, `/api/reports` ;
  - lectures : authentifié (appartenance vérifiée dans les services) ; `/api/admin/**` inchangé (ADMIN).
- Refus de rôle → **403 JSON** (`accessDeniedHandler`) ; non authentifié → 401 JSON.
- `NotFoundException` (sous-classe de `BusinessException`, handler 404) : 55 « … introuvable / non trouvé » convertis ; 7 refus d'appartenance passés en `ForbiddenException` (403) ; `PaymentController` n'utilise plus `RuntimeException`.
- `CorrelationIdFilter` : identifiant par requête (en-tête `X-Correlation-Id` repris ou généré, MDC `correlationId`, renvoyé dans la réponse) ; le handler générique logge en `error` avec cet identifiant et renvoie « … (réf. xxxx) ».
- Tests : `RoleRouteMatrixTest` (`@WebMvcTest` sur la vraie `SecurityConfig`, 29 routes × 3 rôles + 401/403 JSON + routes publiques), `HttpStatusMappingTest` → 224 tests unitaires verts ; `BackendApplicationTests` vert.

---

### Session 59 — TICK-068 [BE] : secrets et configuration de production (2026-11-06)

- **Aucun secret versionné** : `application.properties` ne contient plus que des `${VAR}` — `DB_PASSWORD`, `JWT_SECRET_KEY`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` sans valeur par défaut ; `minioadmin` et le mot de passe PostgreSQL retirés (valeurs déplacées dans `backend/.env` local, ignoré par git). `docker-compose.yml` utilise `${DB_USERNAME:?…}`, `${DB_PASSWORD:?…}`, `${MINIO_*:?…}` → lancer avec `docker compose --env-file backend/.env up -d`.
- **Profils** : `spring.profiles.default=dev`. `application-dev.properties` : `show-sql`, Flyway DEBUG, `app.otp.dev-log=true`. Base : `dev-log=false`, `show-sql=false`. `application-prod.properties` : DB_URL, DB_USERNAME, REDIS_HOST, MINIO_URL, FRONTEND_URL, CORS_ALLOWED_ORIGINS obligatoires, aucun log d'OTP/SQL.
- `RequiredConfigurationCheck` (listener enregistré dans `main`) : arrêt au démarrage avec la **liste complète** des variables manquantes (6 toujours, +6 en prod) et renvoi vers `backend/.env.example`.
- `spring.config.import=optional:file:./.env[.properties],optional:file:./backend/.env[.properties]` : les tests Spring lisent aussi `backend/.env` (plus besoin de variables factices).
- Jeton de réinitialisation de mot de passe **plus journalisé** (`PasswordResetService`).
- CORS HTTP et WebSocket (`setAllowedOriginPatterns`, plus de `*`) lus dans `app.cors.allowed-origins` / `CORS_ALLOWED_ORIGINS` ; `PORT`, `REDIS_*`, `FRONTEND_URL`, `TRUST_FORWARDED_FOR` configurables.
- `backend/.env.example` (versionné) ; `.gitignore` : `!.env.example`, `backend/*.log`. Aucun `.log` n'était suivi par git. `application.yml` vide supprimé.
- Vérifications : profil prod lancé hors projet → échec explicite listant les 12 variables ; profil dev → démarrage OK depuis `backend/.env` (health 200, route protégée 401) ; `RequiredConfigurationCheckTest` (7, dont absence de secrets dans les fichiers versionnés) → 231 tests unitaires verts ; `BackendApplicationTests` vert sans variable factice.
- **À faire hors code** : l'ancien mot de passe PostgreSQL et `minioadmin` restent dans l'historique git → à changer avant toute mise en ligne.

---

### Session 60 — TICK-069 [BE] : index, contraintes et suppression de course (2026-11-06)

- Migration `V18__indexes.sql` (14 index) : `courses(client_id, created_at)`, `courses(courier_id, created_at)`, `course_offers(course_id, status)`, `course_offers(courier_id)`, `chat_rooms(courier_id)`, `chat_rooms(client_id)`, `escrow_ledger(course_id)`, `escrow_ledger(entry_type, created_at)`, `disputes(course_id)`, `disputes(status)`, `reports(target_id, created_at)`, `reports(reporter_id, target_id, created_at)`, `reports(status)`, `users(role, status, kyc_status)`. Contraintes déjà en place : offre ACTIVE unique (V10), litige OPEN unique (V14), salon `(course_id, courier_id)` unique (V2).
- `DELETE /api/courses/{id}` = **annulation douce** : course → CANCELLED sous verrou (plus de 500 FK), offres ACTIVE/ACCEPTED → REJECTED, salons archivés (lecture seule) ; possible en PUBLISHED ou ASSIGNED sans fonds en séquestre (409 sinon) ; idempotent ; propriétaire seulement (403).
- N+1 supprimés : `CourseService.getMyCourses` (salons en lot via `ChatRoomRepository.findByCourseIdIn`), `getMyMissions` (courses en lot via `findAllById`, salons indexés par course), `getPublishedCourses` (Set), `AdminKycController.listKyc` (utilisateurs en lot).
- Correctif lié à la revue TICK-057 : `GET /api/users/couriers` ne renvoie plus que les coursiers **KYC APPROVED** (les autres ne pouvaient de toute façon pas être contactés).
- Tests : `CourseServiceTest` (12 : annulation, refus après paiement, idempotence, nombre de requêtes des listes) → 243 tests unitaires verts ; `BackendApplicationTests` vert (V18 appliquée, 14 index vérifiés en base).

---

### Session 61 — TICK-070 [FULL] : données financières et de suivi exposées (2026-11-06)

- `CourseResponse` : `paidAt`, `completedAt`, `escrowStatus`, `clientName`, `courierName` (+ `proofDeadline`, `autoValidateAt`… de TICK-065b) ; montants selon la personne qui consulte (`CourseResponse.of(course, roomId, Viewer, …)`) :
  - **CLIENT** : `commissionRate`, `commissionAmount` (frais de service), `totalAmount`, `realCosts` — jamais la commission coursier ;
  - **COURIER** (assigné) : `commissionRateCourier`, `courierCommissionAmount` (= tarif − (net − achats)), `courierAmount` (net) — pas les frais client ni le total ;
  - **ADMIN** : tout ; **OTHER** (coursier consultant une demande publiée) : aucun montant de paiement.
- `CourseService` : toutes les réponses passent par `toResponse` (noms chargés en une requête via `UserRepository.findAllById`) ; `extend` / `cancel-overdue` renvoient la vue complète du client.
- Front : gains coursier = montants serveur (`courseAmount`, `courierCommissionAmount`, `courierAmount − realCosts`, date de clôture), taux affiché lu de `/api/commissions/public` ; historique : net coursier serveur (plus de `× 0.80`) ; admin commissions : plus de 5000 par défaut ; détail client : coursier, achats avancés, date de paiement. Grep : plus de `0.20`, `× 0.8`, `5000` métier dans le front.
- Tests : `CourseResponseVisibilityTest` (5) → 248 tests unitaires verts ; `BackendApplicationTests` vert.

---

### Session 62 — TICK-071 [FE] : chat fiabilisé (2026-11-06)

- `chat.service.ts` : SockJS sur l'URL **relative** `/ws` (proxy `ng serve` en dev, reverse proxy en prod) ; un seul salon écouté, `StompSubscription` libérée au changement de salon, à la reconnexion et dans `disconnect()` ; messages filtrés par `roomId` (aucune fuite entre salons) ; `connected$` exposé ; envoi hors connexion → texte conservé + message « votre message est conservé ».
- `proxy.conf.json` : entrée `/ws` (`ws: true`). Vérifié : `/ws/info` et poignée de main WebSocket **101** via le proxy (origine autorisée), 403 pour une origine non autorisée.
- `chat.component.ts` : bandeau « Reconnexion au chat… » ; menu **⋮** (Détails → `/client/course-detail/:courseId` pour le client, Signaler → `/report-user/:autreParticipant`, Litige → `/client|courier/dispute-form/:courseId`) ; `100dvh` (clavier mobile), barre de saisie sticky avec `safe-area-inset-bottom` ; cibles 44 px.
- CORS : `setAllowedOriginPatterns` ; profil dev : `http://localhost:4200`, `127.0.0.1:4200`, `192.168.*.*:4200`, `10.*.*.*:4200` (téléphone du réseau local avec `ng serve --host 0.0.0.0`) ; en prod `CORS_ALLOWED_ORIGINS`.
- Hors périmètre (inchangé) : badge « Vérifié » factice dans l'en-tête du chat (TICK-078).
- Tests : 249 backend verts (dont contexte) ; build front OK. Tests unitaires front du service de chat : TICK-099.

---

### Session 63 — TICK-072 [FE] : routage, landing, 404, redirections par rôle (2026-11-06)

- `core/auth/session.ts` : `homeForRole(role)`, `jwtExpiry`, `isJwtExpired`, `hasUsableSession` (accès valide, ou accès expiré + refresh valide).
- `authGuard` : vérifie l'expiration du JWT ; session périmée → nettoyage + `/login?returnUrl=…`. `roleGuard` : mauvais rôle → accueil **de son rôle** (plus `/login`). Nouveau `guestGuard` sur `''`, `/login`, `/register`, `/verify-otp`, `/forgot-password` : utilisateur connecté → son espace.
- Routes : `''` = `LandingComponent` provisoire (CTA `/register?role=CLIENT|COURIER`, remplacée par TICK-079) ; `/support` = `SupportComponent` (page simple, FAQ complète TICK-102) ; `**` = `NotFoundComponent` (retour vers l'espace ou l'accueil).
- Litige et signalement : redirection vers `homeForRole(rôle)` (le coursier n'est plus renvoyé vers `/client/dashboard` puis `/login`).
- Login : retour vers `returnUrl` s'il est interne (pas de `//`, `\`, `:`) et compatible avec le rôle, sinon accueil du rôle. Inscription : rôle présélectionné depuis `?role=`.
- Build front OK. Tests unitaires des guards : TICK-099 (outillage de test front à réparer, A-38).

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

#### TICK-061 [BE] — EscrowService et ledger équilibré (session 50)

- **`db/migration/V12__escrow_service.sql`** : seed `refund_platform_fees_on_full_refund=false` dans `platform_settings` ; colonne `refund_amount` sur `disputes` ; commentaire types ledger
- **`payment/service/EscrowService.java`** : créé — point d'entrée unique pour toutes les opérations escrow : `release()` (COURIER_PAYOUT + PLATFORM_FEE), `refundTotal()` (avec paramètre `refundPlatformFees`), `refundPartial()` (REFUND_CLIENT + SPLIT_COURIER + PLATFORM_FEE), `split()` (délègue), `shouldRefundPlatformFeesOnFullRefund()` lit `platform_settings`
- **`admin/service/CommissionService.java`** : ajout `getBooleanSetting(key, default)`
- **`payment/service/PaymentService.java`** : injection `EscrowService` ; `applyValidation()` délègue à `escrowService.release()` + met `completedAt`
- **`dispute/domain/Dispute.java`** : ajout champ `refundAmount`
- **`dispute/service/DisputeService.java`** : injection `EscrowService` ; `resolveDispute()` accepte `refundAmount` et appelle `EscrowService` selon la décision (REMBOURSEMENT_TOTAL/PARTIEL/LIBERATION/SANCTION) — le ledger est maintenant écrit à chaque résolution
- **`admin/api/AdminDisputeController.java`** : endpoint accepte désormais un body JSON `{decision, refundAmount}` (plus de queryParam) ; record `ResolveDisputeRequest` inline
- **`core/services/admin.service.ts`** : `resolveDispute()` envoie un body JSON avec `refundAmount` optionnel
- **`features/admin/disputes/disputes.component.ts`** : `resolve()` accepte `refundAmount?`
- **Build** : backend `mvnw compile` → exit 0 ; frontend `ng build` → exit 0



- **`db/migration/V11__payment_robustness.sql`** : colonnes `real_costs` et `idempotency_key` sur `courses` ; `idempotency_key` UNIQUE sur `escrow_ledger`
- **`course/domain/Course.java`** : ajout `realCosts` + `idempotencyKey`
- **`payment/domain/EscrowEntry.java`** : ajout `idempotencyKey`
- **`payment/api/dto/PaymentInitiateRequest.java`** : suppression `tarifCoursier` (plus de confiance au front) ; ajout `idempotencyKey` `@NotBlank` ; validation `@Pattern` sur `paymentMethod`
- **`payment/repository/EscrowRepository.java`** : ajout `findByIdempotencyKey()`
- **`course/repository/CourseRepository.java`** : ajout `findByIdForUpdate()` avec `@Lock(PESSIMISTIC_WRITE)`
- **`shared/exception/ConflictException.java`** : créée → HTTP 409
- **`shared/exception/GlobalExceptionHandler.java`** : handler `ConflictException` → 409
- **`payment/service/PaymentService.java`** : `initiate()` entièrement réécrit — idempotence (cherche la clé avant tout), verrou pessimiste, préconditions strictes (`ASSIGNED` + `courierId != null`), tarif lu de `course.courseAmount`, frais réels 0 autorisé, arrondi XAF entier, `paidAt` + `realCosts` + `idempotencyKey` persistés, HOLD `CONFIRMED` (non plus PENDING)
- **`core/services/payment.service.ts`** : suppression `tarifCoursier` ; ajout `idempotencyKey`
- **`features/client/pay/pay.component.ts`** : route `:courseId` (plus `:roomId`) ; tarif chargé depuis `GET /api/courses/{id}` (read-only) ; `fraisReels` initialisé à 0 ; `idempotencyKey` généré via `crypto.randomUUID()` ; `canPay()` actif dès que la course est chargée
- **`app.routes.ts`** : `client/pay/:roomId` → `client/pay/:courseId`
- **Build** : backend `mvnw compile` → exit 0 ; frontend `ng build` → exit 0



- **`course/service/OfferService.java`** : `acceptOffer()` accepte désormais les offres `ACTIVE` (TICK-058) ; exige `status=PUBLISHED` ; rejette les autres offres ACTIVE → `REJECTED` ; notifie les coursiers non retenus via `notifyCourierNotRetained()`
- **`notify/service/NotificationService.java`** : ajout `notifyCourierNotRetained(courierId, courseId)` — email "Offre non retenue"
- **`course/api/OfferController.java`** : nouveau endpoint `POST /api/courses/{courseId}/offers/{offerId}/accept` (CLIENT uniquement) → 204 No Content
- **`chat/api/ChatRestController.java`** : ajout `CourseRepository` ; `getRoomInfo()` expose désormais `courseStatus` (pilote la visibilité du bouton "Accepter et payer")
- **`core/services/course.service.ts`** : ajout `acceptOffer(courseId, offerId)` → `POST /api/courses/{courseId}/offers/{offerId}/accept`
- **`features/chat/chat.component.ts`** :
  - Interface `ChatMsg` : ajout `offerId`
  - Propriété `courseStatus` initialisée depuis `getRoomInfo`
  - Injection `CourseService`
  - `acceptOffer()` : appel API → toast + redirect `/client/pay/:courseId` après 1,2 s
  - Bouton "Accepter et payer" : visible uniquement si `courseStatus === 'PUBLISHED'` ; affiché "Offre acceptée" si ASSIGNED ; "Remplacée" sinon
  - Bouton "Proposer une offre" : masqué si `courseStatus !== 'PUBLISHED'`
  - Labels "20%" → `{{ commissionRateCourier }}%` dans la modal
- **Build** : backend `mvnw compile` → exit 0 ; frontend `ng build` → exit 0



- **`db/migration/V10__offer_status_active_superseded.sql`** : nouveaux statuts ACTIVE/SUPERSEDED ; migration PENDING → ACTIVE ; UNIQUE partiel `(course_id, courier_id)` WHERE `status='ACTIVE'`
- **`course/repository/CourseOfferRepository.java`** : `findByCourseIdAndCourierIdAndStatus()` + `findByCourseIdAndStatus()`
- **`chat/api/ChatController.java`** : un message OFFER crée/met à jour la `CourseOffer` ACTIVE du coursier (SUPERSEDED l'ancienne) ; contrôles : coursier du salon, KYC, course PUBLISHED, amount ≥ tarifMin (lu depuis `platform_settings`), arrondi XAF entier ; `offerId` inclus dans le payload STOMP
- **`chat/service/ChatAccessService.java`** : ajout `findCourse(courseId)`
- **`payment/api/CommissionPublicController.java`** : ajout `commissionRateCourier` dans la réponse
- **`features/chat/chat.component.ts`** : import `HttpClient` ; chargement `tarifMinimum` + `commissionRateCourier` depuis `/api/commissions/public` au `ngOnInit` ; suppression des 3 valeurs codées en dur (`5000` × 2, `0.20` × 1) remplacées par les propriétés chargées dynamiquement
- **Build** : backend `mvnw compile` → exit 0 ; frontend `ng build` → exit 0

---

### Session 49 — TICK-055 [BE+FE] : Sécuriser le WebSocket STOMP (confirmation état existant)

#### Audit de l'état réel
- Le ticket était **déjà implémenté** depuis la session 48 (code présent, compilable, fonctionnel).
- Aucune modification n'a été faite — le travail était complet.

#### Fichiers existants couvrant TICK-055
- **`config/StompAuthChannelInterceptor.java`** : `ChannelInterceptor` qui valide le JWT Bearer au CONNECT, pose le `Principal` (email), contrôle SUBSCRIBE (participant ou ADMIN via `ChatAccessService.canRead`), exige un `Principal` au SEND.
- **`chat/service/ChatAccessService.java`** : règles `isParticipant()` et `canRead()` ; l'ADMIN peut lire tous les salons.
- **`chat/api/ChatController.java`** : `senderId` toujours pris du `Principal` (jamais du payload) ; `SYSTEM` rejeté ; `OFFER` réservé au coursier du salon ; refus renvoyés sur `/user/queue/errors`.
- **`config/WebSocketConfig.java`** : intercepteur enregistré via `configureClientInboundChannel`.
- **`FE/core/services/chat.service.ts`** : `beforeConnect` rafraîchit le token et injecte `Authorization: Bearer <token>` dans les `connectHeaders` ; `/user/queue/errors` abonné au `onConnect`.

#### Critères d'acceptance vérifiés (par lecture du code)
- ✅ Connexion sans token → `AccessDeniedException` au CONNECT
- ✅ Abonnement à un salon tiers → refusé
- ✅ `senderId` falsifié → expéditeur réel enregistré
- ✅ Type SYSTEM → rejeté avec message sur `/user/queue/errors`
- ✅ Chat fonctionnel (code complet, build OK)

---

### Session 49 — TICK-056 [BE] : Contrôle de participation sur les API REST du chat et des offres

#### Fichiers créés
- **`shared/exception/ForbiddenException.java`** : nouvelle exception → HTTP 403 via `GlobalExceptionHandler` (distingue un refus d'accès d'une erreur métier 400).

#### Fichiers modifiés

- **`chat/api/ChatRestController.java`** :
  - Suppression de l'import `ChatRoomRepository` direct → injection de `ChatAccessService`
  - `GET /api/chat/rooms/{id}/messages` : ajout param `Principal`, appel `requireParticipant()` → 403 si non participant ni admin
  - `GET /api/chat/rooms/{id}` : idem + `resolveFullName()` retourne le `fullName` uniquement (jamais l'email) — fallback `"Utilisateur"` si fullName absent

- **`course/api/OfferController.java`** :
  - Ajout injection `CourseRepository`
  - `GET /api/courses/{courseId}/offers` avec `Principal` : CLIENT propriétaire → toutes les offres ; COURIER → uniquement sa propre offre (filtre sur `courierId`) ; ADMIN → toutes ; autre → 403

- **`shared/exception/GlobalExceptionHandler.java`** :
  - Import `ForbiddenException` ajouté
  - Nouveau handler `handleForbidden` → HTTP 403

#### Build
- `mvnw compile` → **exit 0**

#### Critères d'acceptance vérifiés (par lecture du code)
- ✅ `GET /rooms/{id}/messages` par un non-participant → `ForbiddenException` → 403
- ✅ `GET /rooms/{id}` → `clientName`/`courierName` = fullName, jamais email
- ✅ `GET /courses/{id}/offers` par un COURIER → uniquement sa propre offre
- ✅ `GET /courses/{id}/offers` par le CLIENT propriétaire → toutes les offres
- ✅ `GET /courses/{id}/offers` par un tiers → 403

---

### Session 49 — TICK-057 [FULL] : Ouvrir une conversation sans offre fictive

#### Problème corrigé (anomalie A-07)
- `select-courier.component.ts` et `courier/dashboard.component.ts` appelaient `createOffer(courseId, 0.01, 'Contact initial')` pour ouvrir un chat, créant de fausses offres en base et échouant sur le contrôle KYC (le client ne peut pas créer d'offre).

#### Fichiers modifiés

**Backend**
- **`course/api/CourseController.java`** :
  - Ajout injections `CourseRepository` + `ChatRoomRepository`
  - Nouveau endpoint `POST /api/courses/{courseId}/conversations` (TICK-057) :
    - CLIENT propriétaire : body `{ "courierId": N }` → crée ou récupère le salon `(courseId, courierId)` **sans créer d'offre**
    - COURSIER : body vide, KYC APPROVED requis, course PUBLISHED → salon pour lui-même
    - Idempotent : même appel répété = même `chatRoomId` renvoyé
    - Erreurs : 403 si non propriétaire/rôle non autorisé, 400 si KYC manquant ou course non PUBLISHED
  - `getCurrentUserId()` refactorisé via `resolveUser()` privé

**Frontend**
- **`core/services/course.service.ts`** : ajout méthode `openConversation(courseId, courierId?)` → `POST /api/courses/{courseId}/conversations`
- **`features/client/select-courier/select-courier.component.ts`** : `chooseCourier()` utilise désormais `openConversation(courseId, courier.id)` au lieu de `createOffer(0.01)`
- **`features/courier/dashboard/dashboard.component.ts`** : `acceptMission()` utilise désormais `openConversation(courseId)` au lieu de `createOffer(0.01)` ; message toast mis à jour ("Conversation ouverte. Proposez votre tarif au client.")

#### Vérifications
- `grep createOffer.*0\.01` → **zéro résultat** dans tout le frontend
- Backend `mvnw compile` → **exit 0**
- Frontend `ng build --configuration development` → **exit 0** (warnings préexistants uniquement)
