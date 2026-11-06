-- TICK-064 : durée de la vidéo de preuve, lue côté serveur (conteneurs MP4/MOV/3GP).
-- NULL pour une vidéo dont la durée n'a pas pu être lue (WebM…) : « à vérifier ».
ALTER TABLE proofs
    ADD COLUMN IF NOT EXISTS video_duration_ms BIGINT;
