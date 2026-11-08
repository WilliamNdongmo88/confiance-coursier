-- TICK-093 : historique des changements de réglages (commissions, règles et délais, reversements).
-- Une ligne par valeur modifiée : ancienne valeur, nouvelle valeur (NULL = valeur effacée), qui, quand.
CREATE TABLE platform_setting_changes (
    id          BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(50)  NOT NULL,
    old_value   VARCHAR(255) NULL,
    new_value   VARCHAR(255) NULL,
    changed_by  BIGINT       NULL REFERENCES users(id),
    changed_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_setting_changes_changed_at ON platform_setting_changes (changed_at DESC);
