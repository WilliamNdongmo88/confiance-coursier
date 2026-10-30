-- =========================================================
-- 1. COURSES (Modifiée pour la publication à tous)
-- =========================================================
CREATE TABLE courses (
                         id BIGSERIAL PRIMARY KEY,
                         client_id BIGINT REFERENCES users(id),
                         courier_id BIGINT REFERENCES users(id), -- Nullable au départ
                         description TEXT NOT NULL,
                         zone VARCHAR(200),
                         scheduled_at TIMESTAMP,
                         status VARCHAR(30) DEFAULT 'PUBLISHED', -- PUBLISHED, NEGOTIATING, ASSIGNED, IN_PROGRESS, PROOFS_SUBMITTED, COMPLETED, DISPUTED
                         course_amount DECIMAL(12,2),
                         commission_rate DECIMAL(5,2),
                         commission_amount DECIMAL(12,2),
                         total_amount DECIMAL(12,2),
                         currency VARCHAR(3) DEFAULT 'XAF',
                         escrow_status VARCHAR(20),
                         paid_at TIMESTAMP,
                         completed_at TIMESTAMP,
                         auto_validate_at TIMESTAMP,
                         published_at TIMESTAMP DEFAULT NOW(),
                         accepted_offer_id BIGINT,
                         created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_courses_status_published ON courses(status) WHERE status = 'PUBLISHED';

-- =========================================================
-- 2. COURSE OFFERS (Offres des coursiers)
-- =========================================================
CREATE TABLE course_offers (
                               id BIGSERIAL PRIMARY KEY,
                               course_id BIGINT REFERENCES courses(id),
                               courier_id BIGINT REFERENCES users(id),
                               amount DECIMAL(12,2),
                               details TEXT,
                               status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, ACCEPTED, REJECTED
                               created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- 3. CHAT ROOMS & MESSAGES
-- =========================================================
CREATE TABLE chat_rooms (
                            id BIGSERIAL PRIMARY KEY,
                            course_id BIGINT REFERENCES courses(id),
                            client_id BIGINT REFERENCES users(id),
                            courier_id BIGINT REFERENCES users(id),
                            is_archived BOOLEAN DEFAULT FALSE,
                            created_at TIMESTAMP DEFAULT NOW(),
                            UNIQUE(course_id, courier_id) -- Un coursier ne peut avoir qu'un chat par course
);

CREATE TABLE chat_messages (
                               id BIGSERIAL PRIMARY KEY,
                               room_id BIGINT REFERENCES chat_rooms(id),
                               sender_id BIGINT REFERENCES users(id),
                               content TEXT,
                               file_key VARCHAR(500),
                               attachment_type VARCHAR(20),
                               is_read BOOLEAN DEFAULT FALSE,
                               created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_room_time ON chat_messages(room_id, created_at DESC);

-- =========================================================
-- 4. PROOFS (Preuves)
-- =========================================================
CREATE TABLE proofs (
                        id BIGSERIAL PRIMARY KEY,
                        course_id BIGINT REFERENCES courses(id),
                        courier_id BIGINT REFERENCES users(id),
                        proof_type VARCHAR(20) NOT NULL,
                        file_key VARCHAR(500) NOT NULL,
                        file_hash VARCHAR(64) NOT NULL,
                        file_size BIGINT,
                        mime_type VARCHAR(100),
                        latitude DECIMAL(10,7),
                        longitude DECIMAL(10,7),
                        captured_at TIMESTAMP,
                        uploaded_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_proofs_course ON proofs(course_id);

-- =========================================================
-- 5. REVIEWS (Notations)
-- =========================================================
CREATE TABLE reviews (
                         id BIGSERIAL PRIMARY KEY,
                         course_id BIGINT REFERENCES courses(id) UNIQUE,
                         author_id BIGINT REFERENCES users(id),
                         target_id BIGINT REFERENCES users(id),
                         reviewer_role VARCHAR(20),
                         stars INT CHECK (stars BETWEEN 1 AND 5),
                         comment TEXT,
                         created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- 6. DISPUTES (Litiges)
-- =========================================================
CREATE TABLE disputes (
                          id BIGSERIAL PRIMARY KEY,
                          course_id BIGINT REFERENCES courses(id),
                          opened_by BIGINT REFERENCES users(id),
                          motif_code VARCHAR(10) NOT NULL,
                          description TEXT,
                          status VARCHAR(20) DEFAULT 'OPEN',
                          decision VARCHAR(30),
                          decided_by BIGINT REFERENCES users(id),
                          decided_at TIMESTAMP,
                          created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- 7. REPORTS (Signalements)
-- =========================================================
CREATE TABLE reports (
                         id BIGSERIAL PRIMARY KEY,
                         reporter_id BIGINT REFERENCES users(id),
                         target_id BIGINT REFERENCES users(id),
                         motif VARCHAR(30) NOT NULL,
                         description TEXT,
                         status VARCHAR(20) DEFAULT 'OPEN',
                         decision VARCHAR(30),
                         decided_by BIGINT REFERENCES users(id),
                         decided_at TIMESTAMP,
                         created_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- 8. COMMISSION CONFIG & PLATFORM SETTINGS
-- =========================================================
CREATE TABLE commission_configs (
                                    id BIGSERIAL PRIMARY KEY,
                                    scope VARCHAR(20) NOT NULL,
                                    target_id BIGINT,
                                    rate DECIMAL(5,2),
                                    fixed_amount DECIMAL(12,2),
                                    effective_from TIMESTAMP DEFAULT NOW(),
                                    effective_to TIMESTAMP,
                                    created_by BIGINT REFERENCES users(id)
);

CREATE TABLE platform_settings (
                                   id BIGSERIAL PRIMARY KEY,
                                   setting_key VARCHAR(50) UNIQUE NOT NULL,
                                   setting_value VARCHAR(255) NOT NULL,
                                   updated_by BIGINT REFERENCES users(id),
                                   updated_at TIMESTAMP DEFAULT NOW()
);

-- =========================================================
-- 9. ESCROW LEDGER (Registre des mouvements financiers)
-- =========================================================
CREATE TABLE escrow_ledger (
                               id BIGSERIAL PRIMARY KEY,
                               course_id BIGINT REFERENCES courses(id),
                               entry_type VARCHAR(20),
                               amount DECIMAL(12,2),
                               provider VARCHAR(20),
                               provider_ref VARCHAR(200),
                               status VARCHAR(20),
                               created_at TIMESTAMP DEFAULT NOW()
);