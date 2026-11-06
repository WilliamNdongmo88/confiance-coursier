package com.confiancecoursier.backend.proof;

import java.io.ByteArrayOutputStream;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;

/** Fichiers synthétiques minimaux pour les tests de preuves (signatures d'octets réelles). */
final class ProofTestFiles {

    private ProofTestFiles() {
    }

    static byte[] jpeg(int salt) {
        return new byte[]{(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 16, 'J', 'F', 'I', 'F', 0, 1, (byte) salt};
    }

    static byte[] pdf() {
        return "%PDF-1.7\n1 0 obj << >> endobj\n".getBytes(StandardCharsets.ISO_8859_1);
    }

    static byte[] exe() {
        return new byte[]{'M', 'Z', (byte) 0x90, 0, 3, 0, 0, 0, 4, 0, 0, 0, (byte) 0xFF, (byte) 0xFF};
    }

    /** MP4 minimal : ftyp + moov/mvhd (version 0) d'une durée donnée. */
    static byte[] mp4(long durationMs) {
        return mp4(durationMs, 0, false);
    }

    /**
     * @param version    version de la boîte mvhd (0 = champs 32 bits, 1 = 64 bits)
     * @param moovAtEnd  place une boîte mdat avant moov (cas fréquent des enregistrements mobiles)
     */
    static byte[] mp4(long durationMs, int version, boolean moovAtEnd) {
        int timescale = 1000;
        ByteBuffer mvhdBody = ByteBuffer.allocate(version == 1 ? 32 : 20);
        mvhdBody.put((byte) version).put(new byte[3]);
        if (version == 1) {
            mvhdBody.putLong(0).putLong(0).putInt(timescale).putLong(durationMs);
        } else {
            mvhdBody.putInt(0).putInt(0).putInt(timescale).putInt((int) durationMs);
        }
        byte[] mvhd = box("mvhd", mvhdBody.array());
        byte[] moov = box("moov", mvhd);
        byte[] ftyp = box("ftyp", "isom\0\0\2\0isomiso2mp41".getBytes(StandardCharsets.ISO_8859_1));

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.writeBytes(ftyp);
        if (moovAtEnd) out.writeBytes(box("mdat", new byte[64]));
        out.writeBytes(moov);
        return out.toByteArray();
    }

    static byte[] box(String type, byte[] body) {
        ByteBuffer b = ByteBuffer.allocate(8 + body.length);
        b.putInt(8 + body.length).put(type.getBytes(StandardCharsets.ISO_8859_1)).put(body);
        return b.array();
    }

    static byte[] webm() {
        return new byte[]{0x1A, 0x45, (byte) 0xDF, (byte) 0xA3, 1, 0, 0, 0, 0, 0, 0, 0x1F, 0x42, (byte) 0x86};
    }
}
