package com.confiancecoursier.backend.proof;

import com.confiancecoursier.backend.proof.service.ProofFileInspector;
import com.confiancecoursier.backend.proof.service.ProofFileInspector.Kind;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/** TICK-064 — détection du type réel et lecture de la durée vidéo. */
class ProofFileInspectorTest {

    @Test
    void detectsFormatsFromBytesNotFromDeclaredType() {
        assertThat(ProofFileInspector.detect(ProofTestFiles.jpeg(1))).contains(Kind.JPEG);
        assertThat(ProofFileInspector.detect(ProofTestFiles.pdf())).contains(Kind.PDF);
        assertThat(ProofFileInspector.detect(ProofTestFiles.mp4(5000))).contains(Kind.MP4);
        assertThat(ProofFileInspector.detect(ProofTestFiles.webm())).contains(Kind.WEBM);
        assertThat(ProofFileInspector.detect(ProofTestFiles.exe())).isEmpty();
        assertThat(ProofFileInspector.detect(new byte[3])).isEmpty();
    }

    @Test
    void readsMp4DurationForBothMvhdVersions() {
        assertThat(ProofFileInspector.videoDurationMillis(ProofTestFiles.mp4(8_000))).contains(8_000L);
        assertThat(ProofFileInspector.videoDurationMillis(ProofTestFiles.mp4(15_000, 1, false))).contains(15_000L);
    }

    @Test
    void readsDurationWhenMoovIsAfterMediaData() {
        assertThat(ProofFileInspector.videoDurationMillis(ProofTestFiles.mp4(9_500, 0, true))).contains(9_500L);
    }

    @Test
    void unreadableContainersGiveNoDuration() {
        assertThat(ProofFileInspector.videoDurationMillis(ProofTestFiles.webm())).isEmpty();
        assertThat(ProofFileInspector.videoDurationMillis(ProofTestFiles.jpeg(1))).isEmpty();
        byte[] truncated = java.util.Arrays.copyOf(ProofTestFiles.mp4(5000), 30);
        assertThat(ProofFileInspector.videoDurationMillis(truncated)).isEmpty();
    }
}
