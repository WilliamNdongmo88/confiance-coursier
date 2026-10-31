# AGENT CONTEXT — confiance-coursier
> Fichier de continuité pour tout agent IA qui reprend ce projet.
> Mis à jour au : 2026-10-28 (ajout specs V4/V5)
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
│   │   ├── BackendApplication.java   ← @SpringBootApplication (CORRIGÉ — plus d'exclude DataSource)
│   │   ├── config/
│   │   │   ├── SecurityConfig.java   ← JWT, CORS, routes publiques
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
│   │   │   │   └── dto/
│   │   │   │       ├── RegisterRequest.java     ← email, password, fullName, phone, role
│   │   │   │       ├── LoginRequest.java        ← email, password
│   │   │   │       ├── AuthResponse.java        ← token, email, role, userId
│   │   │   │       ├── OtpResponse.java         ← message, otpRequired
│   │   │   │       └── VerifyOtpRequest.java    ← email, otp
│   │   │   ├── service/
│   │   │   │   ├── AuthService.java             ← register/login/verifyOtp
│   │   │   │   ├── JwtService.java              ← generate/validate JWT HS256
│   │   │   │   ├── JwtAuthenticationFilter.java ← OncePerRequestFilter, extrait Bearer token
│   │   │   │   ├── OtpService.java              ← Redis, TTL 5min, usage unique
│   │   │   │   └── UserDetailsServiceImpl.java  ← charge User par email
│   │   │   ├── domain/               ← VIDE
│   │   │   └── repository/           ← VIDE
│   │   ├── user/
│   │   │   ├── domain/User.java      ← @Entity users, Lombok @Builder
│   │   │   └── repository/UserRepository.java ← findByEmail, existsByEmail
│   │   ├── course/
│   │   │   ├── api/
│   │   │   │   ├── CourseController.java  ← CRUD + getPublished + missions + acceptOffer
│   │   │   │   ├── OfferController.java   ← POST/GET offres par course
│   │   │   │   └── dto/
│   │   │   │       ├── CreateCourseRequest.java ← description, zone, scheduledAt, suggestedBudget
│   │   │   │       └── CourseResponse.java      ← fromEntity(), MANQUE champs financiers
│   │   │   ├── domain/
│   │   │   │   ├── Course.java        ← @Entity courses
│   │   │   │   └── CourseOffer.java   ← @Entity course_offers
│   │   │   ├── repository/
│   │   │   │   ├── CourseRepository.java      ← findByStatus, findByClientId
│   │   │   │   └── CourseOfferRepository.java ← findByCourseId, existsByCourseIdAndCourierId
│   │   │   └── service/
│   │   │       ├── CourseService.java  ← CRUD courses
│   │   │       └── OfferService.java   ← createOffer, acceptOffer, getOffers
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
│   │   ├── application.properties    ← DB, JPA, Flyway, JWT, Redis config
│   │   └── db/migration/
│   │       ├── V1__init_schema.sql   ← tables: users, kyc_submissions
│   │       └── V2__create_all_tables.sql ← 10 tables (voir §4)
│   └── src/test/java/.../auth/
│       └── AuthControllerTest.java   ← CORRIGÉ et déplacé dans src/test
│
├── frontend/                         ← Angular 21 / Tailwind CSS v4 / Lucide
│   ├── src/
│   │   ├── app/
│   │   │   ├── app.ts               ← <router-outlet> + <app-toast>
│   │   │   ├── app.config.ts        ← provideHttpClient(withFetch, withInterceptorsFromDi)
│   │   │   ├── app.routes.ts        ← toutes les routes (voir §6)
│   │   │   ├── core/services/
│   │   │   │   ├── auth.service.ts  ← login/register/verifyOtp + localStorage token
│   │   │   │   ├── course.service.ts← CRUD courses + offres
│   │   │   │   ├── chat.service.ts  ← STOMP WebSocket + HTTP historique
│   │   │   │   ├── toast.service.ts ← signal-based toast stack
│   │   │   │   └── api.service.ts   ← healthCheck()
│   │   │   └── features/auth/
│   │   │       ├── login/login.component.ts
│   │   │       ├── register/register.component.ts
│   │   │       ├── otp/otp.component.ts
│   │   │       ├── client/dashboard/client-dashboard.component.ts
│   │   │       ├── client/create-course/create-course.component.ts
│   │   │       ├── courier/dashboard/courier-dashboard.component.ts
│   │   │       └── chat/chat.component.ts
│   │   ├── proxy.conf.json          ← /api → http://localhost:8080
│   │   └── styles.scss              ← @use '@angular/material', @use 'tailwindcss'
│   ├── angular.json                 ← proxyConfig: src/proxy.conf.json (CORRIGÉ)
│   └── postcss.config.json          ← @tailwindcss/postcss (Tailwind v4)
│
└── docker-compose.yml               ← postgres:5432, redis:6379, minio:9000, pgadmin:5050
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
jwt.secret=<hex_secret>
jwt.expiration=900000          ← 15 minutes
jwt.refresh-expiration=604800000 ← 7 jours (NON implémenté dans le code)
spring.data.redis.host=localhost
spring.data.redis.port=6379
```

---

## 6. ROUTES FRONTEND

| Path | Composant | Authentification requise |
|------|-----------|--------------------------|
| `/login` | LoginComponent | Non |
| `/register` | RegisterComponent | Non |
| `/verify-otp` | OtpComponent | Non |
| `/client/dashboard` | ClientDashboardComponent | Oui (pas de guard !) |
| `/client/create-course` | CreateCourseComponent | Oui (pas de guard !) |
| `/client/edit-course/:id` | CreateCourseComponent | Oui (pas de guard !) |
| `/courier/dashboard` | CourierDashboardComponent | Oui (pas de guard !) |
| `/chat/:roomId` | ChatComponent | Oui (pas de guard !) |

**⚠ Aucun guard Angular n'est implémenté — toutes les routes sont accessibles sans token.**

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
- Lecture exhaustive de tous les fichiers backend et frontend
- Inventaire complet dressé (voir §8 ci-dessous)

---

## 8. PROBLÈMES CONNUS À CORRIGER (backlog technique)

### Backend

| Priorité | Problème | Fichier | Correction suggérée |
|----------|----------|---------|---------------------|
| 🔴 HAUTE | `fullName` ignoré dans `register()` — champ absent sur `User` | `User.java`, `AuthService.java` | Ajouter `fullName` (ou `firstName`+`lastName`) à l'entité `User` et au `V1` (ou V3 migration) |
| 🔴 HAUTE | `roomId` incorrect dans le chat — on passe `course.id` au lieu de `chatRoom.id` | `CourseController`, `OfferController`, dashboards Angular | Exposer le `chatRoom.id` dans `CourseResponse` ou via endpoint dédié |
| 🟡 MOYENNE | `getMyCourses()` et `getMyMissions()` font `findAll()` en mémoire | `CourseService.java` | Utiliser `findByClientIdOrderByCreatedAtDesc()` qui existe déjà + ajouter `findByCourierIdOrderByCreatedAtDesc()` dans `CourseRepository` |
| 🟡 MOYENNE | Refresh token configuré mais non implémenté | `JwtService.java`, `AuthService.java` | Ajouter `POST /api/auth/refresh` + `generateRefreshToken()` + stocker en Redis |
| 🟡 MOYENNE | `OfferController` utilise `Map<String,Object>` au lieu d'un DTO | `OfferController.java` | Créer `CreateOfferRequest.java` (amount, details) avec `@Valid` |
| 🟡 MOYENNE | `CourseResponse` n'expose pas les champs financiers | `CourseResponse.java` | Ajouter courseAmount, currency, commissionAmount, acceptedOfferId |
| 🟢 BASSE | `emailVerified` non implémenté (TODO dans le code) | `User.java`, `AuthService.java` | Ajouter colonne `email_verified BOOLEAN DEFAULT FALSE` via migration V3 |
| 🟢 BASSE | OTP simulé par `System.out.println` | `OtpService.java` | Intégrer un vrai service email (SendGrid/Mailgun) ou SMS (Twilio) |
| 🟢 BASSE | `suggestedBudget` dans `CreateCourseRequest` déclaré mais jamais utilisé | `CourseService.java` | Soit l'utiliser, soit le supprimer |

### Frontend

| Priorité | Problème | Fichier | Correction suggérée |
|----------|----------|---------|---------------------|
| 🔴 HAUTE | Aucun guard Angular — routes protégées accessibles sans token | `app.routes.ts` | Créer `authGuard` + `roleGuard` (CLIENT/COURIER) et les appliquer sur les routes |
| 🔴 HAUTE | `roomId` incorrect (course.id utilisé à la place de chatRoom.id) | Dashboards client + coursier | Récupérer le vrai `chatRoom.id` depuis l'API |
| 🟡 MOYENNE | `logout()` ne supprime que `jwt_token` | `auth.service.ts` | Supprimer aussi `user_id` et `user_role` |
| 🟡 MOYENNE | `OtpComponent` utilise `alert()` au lieu de `ToastService` | `otp.component.ts` | Remplacer `alert()` par `toastService.error/success()` |
| 🟡 MOYENNE | Pas d'état d'authentification réactif | `auth.service.ts` | Ajouter un `BehaviorSubject<boolean>` ou signal `isLoggedIn` |
| 🟢 BASSE | Duplication path `''` et `client/create-course` dans les routes | `app.routes.ts` | Nettoyer les doublons |

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
