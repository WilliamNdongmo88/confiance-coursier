package com.confiancecoursier.backend.proof.service;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Inspection du contenu réel d'un fichier de preuve (TICK-064), sans dépendance externe.
 *
 * <ul>
 *   <li>{@link #detect(byte[])} : type déduit des octets de signature (le Content-Type déclaré
 *       par le navigateur n'est pas fiable).</li>
 *   <li>{@link #videoDurationMillis(byte[])} : durée d'une vidéo ISO-BMFF (MP4, MOV, 3GP) lue dans
 *       la boîte {@code moov/mvhd}. Les autres conteneurs (WebM) renvoient {@code empty} :
 *       la durée est alors « à vérifier ».</li>
 * </ul>
 */
public final class ProofFileInspector {

    /** Familles de fichiers reconnues. */
    public enum Kind {
        JPEG("image/jpeg"), PNG("image/png"), WEBP("image/webp"), HEIC("image/heic"),
        PDF("application/pdf"),
        MP4("video/mp4"), QUICKTIME("video/quicktime"), THREE_GP("video/3gpp"), WEBM("video/webm");

        public final String mimeType;

        Kind(String mimeType) {
            this.mimeType = mimeType;
        }

        public boolean isImage() {
            return this == JPEG || this == PNG || this == WEBP || this == HEIC;
        }

        public boolean isVideo() {
            return this == MP4 || this == QUICKTIME || this == THREE_GP || this == WEBM;
        }
    }

    private ProofFileInspector() {
    }

    public static Optional<Kind> detect(byte[] b) {
        if (b == null || b.length < 12) return Optional.empty();
        if ((b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return Optional.of(Kind.JPEG);
        if ((b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return Optional.of(Kind.PNG);
        if (ascii(b, 0, 4).equals("RIFF") && ascii(b, 8, 4).equals("WEBP")) return Optional.of(Kind.WEBP);
        if (ascii(b, 0, 5).equals("%PDF-")) return Optional.of(Kind.PDF);
        if ((b[0] & 0xFF) == 0x1A && (b[1] & 0xFF) == 0x45 && (b[2] & 0xFF) == 0xDF && (b[3] & 0xFF) == 0xA3) {
            return Optional.of(Kind.WEBM);
        }
        if (ascii(b, 4, 4).equals("ftyp")) {
            String brand = ascii(b, 8, 4);
            if (brand.startsWith("hei") || brand.startsWith("hev") || brand.equals("mif1") || brand.equals("msf1")) {
                return Optional.of(Kind.HEIC);
            }
            if (brand.equals("qt  ")) return Optional.of(Kind.QUICKTIME);
            if (brand.startsWith("3g")) return Optional.of(Kind.THREE_GP);
            return Optional.of(Kind.MP4); // isom, mp41, mp42, avc1, M4V, dash…
        }
        return Optional.empty();
    }

    /** Durée en millisecondes lue dans {@code moov/mvhd}, ou {@code empty} si illisible. */
    public static Optional<Long> videoDurationMillis(byte[] data) {
        try {
            ByteBuffer buf = ByteBuffer.wrap(data);
            Optional<int[]> moov = findBox(buf, 0, data.length, "moov");
            if (moov.isEmpty()) return Optional.empty();
            Optional<int[]> mvhd = findBox(buf, moov.get()[0], moov.get()[1], "mvhd");
            if (mvhd.isEmpty()) return Optional.empty();

            int p = mvhd.get()[0];
            int version = buf.get(p) & 0xFF;
            p += 4; // version + flags
            long timescale;
            long duration;
            if (version == 1) {
                p += 16; // creation + modification (64 bits)
                timescale = Integer.toUnsignedLong(buf.getInt(p));
                duration = buf.getLong(p + 4);
            } else {
                p += 8;  // creation + modification (32 bits)
                timescale = Integer.toUnsignedLong(buf.getInt(p));
                duration = Integer.toUnsignedLong(buf.getInt(p + 4));
            }
            if (timescale <= 0 || duration < 0) return Optional.empty();
            return Optional.of(duration * 1000 / timescale);
        } catch (RuntimeException e) {
            return Optional.empty(); // fichier tronqué ou non conforme
        }
    }

    /**
     * Cherche une boîte de type {@code type} entre {@code start} et {@code end}.
     * @return [début du contenu, fin de la boîte]
     */
    private static Optional<int[]> findBox(ByteBuffer buf, int start, int end, String type) {
        int p = start;
        while (p + 8 <= end) {
            long size = Integer.toUnsignedLong(buf.getInt(p));
            String t = new String(new byte[]{buf.get(p + 4), buf.get(p + 5), buf.get(p + 6), buf.get(p + 7)},
                    StandardCharsets.ISO_8859_1);
            int header = 8;
            if (size == 1) {          // taille sur 64 bits
                size = buf.getLong(p + 8);
                header = 16;
            } else if (size == 0) {   // jusqu'à la fin
                size = end - p;
            }
            if (size < header || p + size > end) return Optional.empty();
            if (t.equals(type)) return Optional.of(new int[]{p + header, (int) (p + size)});
            p += (int) size;
        }
        return Optional.empty();
    }

    private static String ascii(byte[] b, int off, int len) {
        if (b.length < off + len) return "";
        return new String(b, off, len, StandardCharsets.ISO_8859_1);
    }
}
