# SPÉCIFICATION TECHNIQUE V3.0

## Projet : ConfianceCoursier — Plateforme de coursier de confiance

**Statut : Validé**
**Dernière mise à jour : 22 Octobre 2025**

---

## 1. ARCHITECTURE GLOBALE

### 1.1 Architecture : Monolithe Modulaire

- Un seul déployable (Jar Spring Boot) + Angular build servi par Nginx.
- Modules métier clairement séparés → migration microservices possible plus tard.
- **Services externes** : PostgreSQL (données), Redis (cache/OTP), **MinIO/S3** (fichiers), Brevo (emails).

### 1.2 Modules métier

| Module  | Responsabilité                       |
| ------- | ------------------------------------ |
| Auth    | JWT, OTP, refresh token              |
| User    | Profils, rôles                       |
| KYC     | Upload pièces, validation admin      |
| Course  | Création, cycle de vie, attribution  |
| Chat    | WebSocket STOMP + persistance        |
| Payment | Escrow, Stripe, MoMo/Orange          |
| Proof   | Vidéo/photo/reçu, EXIF, hash SHA-256 |
| Review  | Notation, confiance                  |
| Dispute | Litiges, arbitrage                   |
| Notify  | Emails asynchrones                   |
| Admin   | Back-office                          |

---

## 2. STACK TECHNIQUE

### 2.1 Backend

| Composant        | Choix                      | Version  |
| ---------------- | -------------------------- | -------- |
| Langage          | Java                       | 21 (LTS) |
| Framework        | Spring Boot                | 3.3+     |
| Sécurité         | Spring Security            | 6.3+     |
| ORM              | Spring Data JPA            | 3.3+     |
| Migrations       | Flyway                     | 10+      |
| WebSocket        | Spring WebSocket (STOMP)   | —        |
| Mapping          | MapStruct                  | 1.6+     |
| Doc API          | SpringDoc OpenAPI          | 2.6+     |
| **SDK Stockage** | **AWS SDK v2 / MinIO SDK** | **2.x**  |

### 2.2 Frontend

| Composant        | Choix                                     |
| ---------------- | ----------------------------------------- |
| Framework        | **Angular 20 ou plus récent** (20, 21…)   |
| UI               | Angular Material + Tailwind CSS           |
| PWA              | @angular/pwa                              |
| État             | Signals (stable Angular 20+)              |
| i18n             | Transloco / ngx-translate                 |
| Temps réel       | STOMP.js + SockJS                         |
| Change Detection | Zoneless (préparé pour activation future) |

**Justification Angular 20+** : Angular 20 (mai 2025) supporté jusqu'à **novembre 2026**. Si Angular 21 sort avant le démarrage du projet, on bascule dessus (support plus long, features supplémentaires). Le code reste compatible grâce aux composants standalone et à l'API Signals.

### 2.3 Stockage

| Service                                          | Usage                      |
| ------------------------------------------------ | -------------------------- |
| PostgreSQL 16                                    | Données relationnelles     |
| Redis 7                                          | Cache, OTP, présence chat  |
| **MinIO** (dev) / **S3 ou Cloudflare R2** (prod) | Vidéos, photos, reçus, KYC |

**Points d'attention S3/MinIO** :

- **MinIO** en local : S3-compatible, gratuit, aucune limite.
- **Cloudflare R2** en prod : moins cher que S3, pas de frais d'egress.
- **AWS S3** en prod : si volume faible ou région critique.
- API **identique** (S3-compatible) → migration triviale entre les deux.

### 2.4 Services externes

| Service          | Usage                           |
| ---------------- | ------------------------------- |
| Stripe Connect   | Paiement international + escrow |
| Niobi / DIRA SDK | MTN MoMo + Orange Money         |
| Brevo            | Emails transactionnels          |
| Sentry           | Monitoring                      |

---

## 3. MODÈLE DE DONNÉES (POSTGRESQL)

### 3.1 Users & KYC

```sql
CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20),
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL,  -- CLIENT, COURIER, ADMIN
    country         VARCHAR(2),
    city            VARCHAR(100),
    status          VARCHAR(20) DEFAULT 'ACTIVE',
    trust_score     DECIMAL(3,2) DEFAULT 0,
    badge           VARCHAR(30),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE kyc_submissions (
    id                   BIGSERIAL PRIMARY KEY,
    user_id              BIGINT REFERENCES users(id),
    document_type        VARCHAR(20),      -- CNI, PASSPORT
    front_file_key       VARCHAR(500) NOT NULL,  -- clé S3
    back_file_key        VARCHAR(500) NOT NULL,
    selfie_file_key      VARCHAR(500) NOT NULL,
    status               VARCHAR(20) DEFAULT 'PENDING',
    reviewed_by          BIGINT REFERENCES users(id),
    reviewed_at          TIMESTAMP,
    rejection_reason     TEXT,
    created_at           TIMESTAMP DEFAULT NOW()
);

CREATE TABLE courses (
    id                BIGSERIAL PRIMARY KEY,
    client_id         BIGINT REFERENCES users(id),
    courier_id        BIGINT REFERENCES users(id),           -- nullable, rempli à l'acceptation
    description       TEXT NOT NULL,
    zone              VARCHAR(200),
    scheduled_at      TIMESTAMP,
    status            VARCHAR(30) DEFAULT 'PUBLISHED',
    course_amount     DECIMAL(12,2),
    commission_rate   DECIMAL(5,2),
    commission_amount DECIMAL(12,2),
    total_amount      DECIMAL(12,2),
    currency          VARCHAR(3) DEFAULT 'XAF',
    escrow_status     VARCHAR(20),
    paid_at           TIMESTAMP,
    completed_at      TIMESTAMP,
    auto_validate_at  TIMESTAMP,
    accepted_offer_id BIGINT REFERENCES course_offers(id),   -- offre acceptée par le client
    created_at        TIMESTAMP DEFAULT NOW()
);

CREATE TABLE course_offers (
    id              BIGSERIAL PRIMARY KEY,
    course_id       BIGINT REFERENCES courses(id),
    courier_id      BIGINT REFERENCES users(id),
    amount          DECIMAL(12,2),
    details         TEXT,
    status          VARCHAR(20),           -- PENDING, ACCEPTED, REJECTED
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE escrow_ledger (
    id              BIGSERIAL PRIMARY KEY,
    course_id       BIGINT REFERENCES courses(id),
    entry_type      VARCHAR(20),           -- HOLD, RELEASE, REFUND, PARTIAL_REFUND
    amount          DECIMAL(12,2),
    provider        VARCHAR(20),           -- STRIPE, MTN, ORANGE
    provider_ref    VARCHAR(200),
    status          VARCHAR(20),           -- PENDING, CONFIRMED, FAILED
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chat_rooms (
    id           BIGSERIAL PRIMARY KEY,
    course_id    BIGINT REFERENCES courses(id) UNIQUE,
    client_id    BIGINT REFERENCES users(id),
    courier_id   BIGINT REFERENCES users(id),
    is_archived  BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE chat_messages (
    id               BIGSERIAL PRIMARY KEY,
    room_id          BIGINT REFERENCES chat_rooms(id),
    sender_id        BIGINT REFERENCES users(id),
    content          TEXT,
    file_key         VARCHAR(500),         -- clé S3 pièce jointe
    attachment_type  VARCHAR(20),          -- IMAGE, PDF
    is_read          BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_room_time ON chat_messages(room_id, created_at DESC);

CREATE TABLE proofs (
    id              BIGSERIAL PRIMARY KEY,
    course_id       BIGINT REFERENCES courses(id),
    courier_id      BIGINT REFERENCES users(id),
    proof_type      VARCHAR(20) NOT NULL,  -- VIDEO, PHOTO, RECEIPT
    file_key        VARCHAR(500) NOT NULL, -- clé S3
    file_hash       VARCHAR(64) NOT NULL,  -- SHA-256 anti-doublon
    file_size       BIGINT,
    mime_type       VARCHAR(100),
    latitude        DECIMAL(10,7),
    longitude       DECIMAL(10,7),
    captured_at     TIMESTAMP,             -- Extrait de l'EXIF
    uploaded_at     TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_proofs_course ON proofs(course_id);
CREATE INDEX idx_proofs_hash ON proofs(file_hash);

CREATE TABLE reviews (
    id              BIGSERIAL PRIMARY KEY,
    course_id       BIGINT REFERENCES courses(id) UNIQUE,
    author_id       BIGINT REFERENCES users(id),
    target_id       BIGINT REFERENCES users(id),
    reviewer_role   VARCHAR(20),
    stars           INT CHECK (stars BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE disputes (
    id              BIGSERIAL PRIMARY KEY,
    course_id       BIGINT REFERENCES courses(id),
    opened_by       BIGINT REFERENCES users(id),
    motif_code      VARCHAR(10) NOT NULL,
    description     TEXT,
    status          VARCHAR(20) DEFAULT 'OPEN',
    decision        VARCHAR(30),
    decided_by      BIGINT REFERENCES users(id),
    decided_at      TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE commission_configs (
    id              BIGSERIAL PRIMARY KEY,
    scope           VARCHAR(20) NOT NULL,  -- GLOBAL, COURIER, COURSE
    target_id       BIGINT,
    rate            DECIMAL(5,2),
    fixed_amount    DECIMAL(12,2),
    effective_from  TIMESTAMP DEFAULT NOW(),
    effective_to    TIMESTAMP,
    created_by      BIGINT REFERENCES users(id)
);

```
