package com.confiancecoursier.backend.proof;

import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.proof.api.dto.ProofResponse;
import com.confiancecoursier.backend.proof.domain.Proof;
import com.confiancecoursier.backend.proof.repository.ProofRepository;
import com.confiancecoursier.backend.proof.service.ProofService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import com.confiancecoursier.backend.shared.util.FileStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** TICK-064 — brouillons, contrôles serveur, reprise sans doublon, soumission complète. Course 100 : client 1, coursier 2. */
class ProofServiceTest {

    private final List<Proof> stored = new ArrayList<>();
    private ProofRepository proofs;
    private CourseRepository courses;
    private FileStorageService storage;
    private NotificationService notifications;
    private ProofService service;
    private Course course;

    @BeforeEach
    void setUp() {
        proofs = mock(ProofRepository.class);
        courses = mock(CourseRepository.class);
        storage = mock(FileStorageService.class);
        notifications = mock(NotificationService.class);

        when(proofs.save(any(Proof.class))).thenAnswer(i -> {
            Proof p = i.getArgument(0);
            p.setId((long) stored.size() + 1);
            stored.add(p);
            return p;
        });
        when(proofs.findByCourseIdAndFileHash(anyLong(), anyString())).thenAnswer(i -> stored.stream()
                .filter(p -> p.getFileHash().equals(i.getArgument(1))).findFirst());
        when(proofs.countByCourseId(100L)).thenAnswer(i -> (long) stored.size());
        when(proofs.countByCourseIdAndProofType(eq(100L), anyString())).thenAnswer(i -> stored.stream()
                .filter(p -> p.getProofType().equals(i.getArgument(1))).count());
        when(storage.uploadFile(any(), anyString(), anyString())).thenAnswer(i -> "proofs/100/2/" + stored.size());
        when(storage.getPresignedUrl(anyString(), anyString())).thenReturn("https://minio/presigned");

        course = Course.builder().id(100L).clientId(1L).courierId(2L).description("Pharmacie")
                .status("IN_PROGRESS").realCosts(BigDecimal.ZERO).build();
        when(courses.findByIdForUpdate(100L)).thenReturn(Optional.of(course));
        when(courses.findById(100L)).thenReturn(Optional.of(course));

        service = new ProofService(proofs, courses, storage, notifications);
        ReflectionTestUtils.setField(service, "proofsBucket", "delivery-proofs");
    }

    private static MockMultipartFile file(byte[] content, String declaredType) {
        return new MockMultipartFile("file", "f", declaredType, content);
    }

    private ProofResponse upload(byte[] content, String type) {
        return service.uploadProof(100L, 2L, file(content, "application/octet-stream"), type);
    }

    // ── Brouillons ───────────────────────────────────────────────────────────

    @Test
    void firstProofNoLongerStartsTheSeventyTwoHours() {
        upload(ProofTestFiles.jpeg(1), "PHOTO");
        assertThat(course.getStatus()).isEqualTo("IN_PROGRESS");
        assertThat(course.getAutoValidateAt()).isNull();
        verifyNoInteractions(notifications);
    }

    @Test
    void retryOfSameFileReturnsExistingProofInsteadOfDuplicateError() {
        ProofResponse first = upload(ProofTestFiles.jpeg(1), "PHOTO");
        ProofResponse retry = upload(ProofTestFiles.jpeg(1), "PHOTO");

        assertThat(retry.id()).isEqualTo(first.id());
        assertThat(stored).hasSize(1);
        verify(storage, times(1)).uploadFile(any(), anyString(), anyString());
    }

    @Test
    void storedMimeTypeIsTheDetectedOne() {
        // le navigateur annonce application/octet-stream : on enregistre le vrai type
        assertThat(upload(ProofTestFiles.pdf(), "RECEIPT").mimeType()).isEqualTo("application/pdf");
    }

    @Test
    void wrongFormatForTypeIsRefused() {
        assertThatThrownBy(() -> upload(ProofTestFiles.pdf(), "PHOTO")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> upload(ProofTestFiles.jpeg(1), "VIDEO")).isInstanceOf(BusinessException.class);
        // un exécutable renommé en .jpg et annoncé image/jpeg
        assertThatThrownBy(() -> service.uploadProof(100L, 2L, file(ProofTestFiles.exe(), "image/jpeg"), "PHOTO"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("non reconnu");
        assertThat(stored).isEmpty();
    }

    @Test
    void videoOfFifteenSecondsIsRefused() {
        assertThatThrownBy(() -> upload(ProofTestFiles.mp4(15_000), "VIDEO"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("10 secondes");
        assertThat(stored).isEmpty();
    }

    @Test
    void videoOfTenSecondsIsAcceptedWithDuration() {
        assertThat(upload(ProofTestFiles.mp4(10_000), "VIDEO").videoDurationMs()).isEqualTo(10_000L);
    }

    @Test
    void webmVideoIsAcceptedButDurationIsToBeChecked() {
        assertThat(upload(ProofTestFiles.webm(), "VIDEO").videoDurationMs()).isNull();
    }

    @Test
    void onlyOneVideoPerCourse() {
        upload(ProofTestFiles.mp4(5_000), "VIDEO");
        assertThatThrownBy(() -> upload(ProofTestFiles.mp4(6_000), "VIDEO")).isInstanceOf(BusinessException.class);
    }

    @Test
    void photoOverTenMegabytesIsRefused() {
        byte[] big = new byte[10 * 1024 * 1024 + 1];
        System.arraycopy(ProofTestFiles.jpeg(1), 0, big, 0, 13);
        assertThatThrownBy(() -> upload(big, "PHOTO")).isInstanceOf(BusinessException.class).hasMessageContaining("10 Mo");
    }

    @Test
    void onlyAssignedCourierCanUploadAndOnlyWhileInProgress() {
        assertThatThrownBy(() -> service.uploadProof(100L, 9L, file(ProofTestFiles.jpeg(1), "image/jpeg"), "PHOTO"))
                .isInstanceOf(ForbiddenException.class);
        course.setStatus("PROOFS_SUBMITTED");
        assertThatThrownBy(() -> upload(ProofTestFiles.jpeg(2), "PHOTO")).isInstanceOf(ConflictException.class);
    }

    @Test
    void draftCanBeDeletedBeforeSubmission() {
        ProofResponse p = upload(ProofTestFiles.jpeg(1), "PHOTO");
        when(proofs.findById(p.id())).thenReturn(Optional.of(stored.get(0)));

        service.deleteDraftProof(100L, p.id(), 2L);

        verify(proofs).delete(stored.get(0));
        verify(storage).deleteFile(anyString(), eq("delivery-proofs"));
    }

    // ── Soumission ───────────────────────────────────────────────────────────

    @Test
    void incompleteSubmissionGivesClearMessage() {
        upload(ProofTestFiles.jpeg(1), "PHOTO");
        assertThatThrownBy(() -> service.submitProofs(100L, 2L))
                .isInstanceOf(BusinessException.class).hasMessageContaining("vidéo");
        assertThat(course.getStatus()).isEqualTo("IN_PROGRESS");
    }

    @Test
    void receiptRequiredWhenRealCostsWerePaid() {
        course.setRealCosts(new BigDecimal("15000"));
        upload(ProofTestFiles.mp4(8_000), "VIDEO");
        upload(ProofTestFiles.jpeg(1), "PHOTO");
        assertThatThrownBy(() -> service.submitProofs(100L, 2L))
                .isInstanceOf(BusinessException.class).hasMessageContaining("reçu");

        upload(ProofTestFiles.pdf(), "RECEIPT");
        service.submitProofs(100L, 2L);
        assertThat(course.getStatus()).isEqualTo("PROOFS_SUBMITTED");
    }

    @Test
    void completeSubmissionStartsSeventyTwoHoursOnceAndIsIdempotent() {
        upload(ProofTestFiles.mp4(8_000), "VIDEO");
        upload(ProofTestFiles.jpeg(1), "PHOTO");

        ProofService.SubmissionResult first = service.submitProofs(100L, 2L);
        ProofService.SubmissionResult again = service.submitProofs(100L, 2L);

        assertThat(first.status()).isEqualTo("PROOFS_SUBMITTED");
        assertThat(first.autoValidateAt()).isNotNull();
        assertThat(again.autoValidateAt()).isEqualTo(first.autoValidateAt());
        verify(notifications, times(1)).notifyProofsSubmitted(1L, 100L);
    }

    @Test
    void clientDoesNotSeeDraftsButSeesSubmittedProofs() {
        upload(ProofTestFiles.jpeg(1), "PHOTO");
        when(proofs.findByCourseIdOrderByUploadedAtAsc(100L)).thenReturn(stored);

        assertThat(service.getProofs(100L, 1L)).isEmpty();
        assertThat(service.getProofs(100L, 2L)).hasSize(1);

        course.setStatus("PROOFS_SUBMITTED");
        assertThat(service.getProofs(100L, 1L)).hasSize(1);
        assertThatThrownBy(() -> service.getProofs(100L, 9L)).isInstanceOf(ForbiddenException.class);
    }
}
