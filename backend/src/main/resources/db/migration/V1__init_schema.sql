CREATE TABLE users (
                       id BIGSERIAL PRIMARY KEY,
                       email VARCHAR(255) UNIQUE NOT NULL,
                       phone VARCHAR(20),
                       password_hash VARCHAR(255) NOT NULL,
                       role VARCHAR(20) NOT NULL,
                       country VARCHAR(2),
                       city VARCHAR(100),
                       status VARCHAR(20) DEFAULT 'ACTIVE',
                       trust_score DECIMAL(3,2) DEFAULT 0,
                       badge VARCHAR(30),
                       created_at TIMESTAMP DEFAULT NOW(),
                       updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE kyc_submissions (
                                 id BIGSERIAL PRIMARY KEY,
                                 user_id BIGINT REFERENCES users(id),
                                 document_type VARCHAR(20),
                                 front_file_key VARCHAR(500) NOT NULL,
                                 back_file_key VARCHAR(500) NOT NULL,
                                 selfie_file_key VARCHAR(500) NOT NULL,
                                 status VARCHAR(20) DEFAULT 'PENDING',
                                 reviewed_by BIGINT REFERENCES users(id),
                                 reviewed_at TIMESTAMP,
                                 rejection_reason TEXT,
                                 created_at TIMESTAMP DEFAULT NOW()
);