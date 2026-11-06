package com.confiancecoursier.backend.shared.exception;

import com.confiancecoursier.backend.shared.util.FileStorageService;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.shared.exception.ForbiddenException;
import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // Ressource absente → 404 (TICK-067). Déclaré avant BusinessException : la classe la plus précise l'emporte.
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ErrorResponse> handleNotFound(NotFoundException ex) {
        ErrorResponse error = new ErrorResponse(HttpStatus.NOT_FOUND.value(), ex.getMessage(), LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    // Refus d'accès lié au rôle (méthode sécurisée, @PreAuthorize…) → 403 (TICK-067)
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(Exception ex) {
        ErrorResponse error = new ErrorResponse(HttpStatus.FORBIDDEN.value(),
                "Accès refusé : action non autorisée pour votre rôle.", LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    // Gère les violations de contraintes sur les @RequestParam / @PathVariable (@Validated)
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        String message = ex.getConstraintViolations().stream()
                .map(v -> v.getMessage())
                .collect(Collectors.joining(", "));
        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                message,
                LocalDateTime.now()
        );
        return ResponseEntity.badRequest().body(error);
    }

    // Gère nos exceptions métier (ex: "Email déjà utilisé")
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                ex.getMessage(),
                LocalDateTime.now()
        );
        return ResponseEntity.badRequest().body(error);
    }

    // Gère les erreurs de validation (@Valid sur les DTOs)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationExceptions(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));

        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                message,
                LocalDateTime.now()
        );
        return ResponseEntity.badRequest().body(error);
    }

    // Gère les identifiants incorrects (Login)
    @ExceptionHandler({BadCredentialsException.class, UsernameNotFoundException.class})
    public ResponseEntity<ErrorResponse> handleAuthenticationException(Exception ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.UNAUTHORIZED.value(),
                "Email ou mot de passe incorrect.",
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }

    // Accès refusé (IDOR, ressource appartenant à un autre utilisateur) → 403 — TICK-056/067
    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorResponse> handleForbidden(ForbiddenException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.FORBIDDEN.value(),
                ex.getMessage(),
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    // Conflit d'état (ex: course déjà payée, double paiement) → 409 — TICK-060
    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> handleConflict(ConflictException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                ex.getMessage(),
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    // Fichier au-delà de la limite multipart (30 Mo) → 413 avec un message lisible — TICK-064
    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> handleMaxUpload(Exception ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.PAYLOAD_TOO_LARGE.value(),
                "Fichier trop volumineux (30 Mo maximum pour une vidéo, 10 Mo pour une photo ou un reçu).",
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE).body(error);
    }

    // Limite de fréquence (OTP) → 429 — TICK-066
    @ExceptionHandler(TooManyRequestsException.class)
    public ResponseEntity<ErrorResponse> handleTooManyRequests(TooManyRequestsException ex) {
        ErrorResponse error = new ErrorResponse(HttpStatus.TOO_MANY_REQUESTS.value(), ex.getMessage(), LocalDateTime.now());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(error);
    }

    // Modification concurrente d'une course (@Version) → 409 — TICK-060
    @ExceptionHandler(org.springframework.orm.ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> handleOptimisticLock(Exception ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.CONFLICT.value(),
                "Cette course vient d'être modifiée par une autre action. Rechargez la page.",
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.CONFLICT).body(error);
    }

    // Email non vérifié (login après mot de passe correct) → 403 + code pour le front — TICK-074
    @ExceptionHandler(EmailNotVerifiedException.class)
    public ResponseEntity<ErrorResponse> handleEmailNotVerified(EmailNotVerifiedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse(
                HttpStatus.FORBIDDEN.value(), ex.getMessage(), LocalDateTime.now(), EmailNotVerifiedException.CODE));
    }

    // Compte suspendu / bloqué (login après mot de passe correct, ou refresh) → 403 — TICK-053
    @ExceptionHandler({AccountSuspendedException.class, LockedException.class, DisabledException.class})
    public ResponseEntity<ErrorResponse> handleAccountSuspended(Exception ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.FORBIDDEN.value(),
                AccountSuspendedException.DEFAULT_MESSAGE,
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }

    // Gère les erreurs de stockage de fichiers (MinIO)
    @ExceptionHandler(FileStorageService.FileStorageException.class)
    public ResponseEntity<ErrorResponse> handleFileStorageException(FileStorageService.FileStorageException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.SERVICE_UNAVAILABLE.value(),
                ex.getMessage(),
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(error);
    }

    // Route inexistante → 404 (sans ce handler, le handler générique renvoyait 500)
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResource(NoResourceFoundException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.NOT_FOUND.value(),
                "Ressource introuvable.",
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    // Méthode HTTP non supportée sur une route existante → 405
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
        ErrorResponse error = new ErrorResponse(
                HttpStatus.METHOD_NOT_ALLOWED.value(),
                "Méthode non autorisée.",
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED).body(error);
    }

    // Gère toutes les autres erreurs imprévues — journalisées en error avec l'identifiant de corrélation (TICK-067)
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneralException(Exception ex) {
        String ref = com.confiancecoursier.backend.shared.web.CorrelationIdFilter.current();
        log.error("[{}] Erreur inattendue : {}", ref, ex.toString(), ex);
        ErrorResponse error = new ErrorResponse(
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Une erreur interne est survenue. Veuillez réessayer. (réf. " + ref + ")",
                LocalDateTime.now()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}