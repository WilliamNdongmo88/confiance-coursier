package com.confiancecoursier.backend.admin.service;

import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatRoomRepository;
import com.confiancecoursier.backend.course.api.dto.CourseResponse;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.domain.CourseOffer;
import com.confiancecoursier.backend.course.repository.CourseOfferRepository;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.dispute.repository.DisputeRepository;
import com.confiancecoursier.backend.notify.service.NotificationService;
import com.confiancecoursier.backend.payment.repository.EscrowRepository;
import com.confiancecoursier.backend.payment.service.EscrowService;
import com.confiancecoursier.backend.proof.api.dto.ProofResponse;
import com.confiancecoursier.backend.proof.service.ProofService;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import com.confiancecoursier.backend.shared.exception.ConflictException;
import com.confiancecoursier.backend.shared.exception.NotFoundException;
import com.confiancecoursier.backend.user.domain.User;
import com.confiancecoursier.backend.user.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Gestion des courses par l'administrateur (TICK-091) : liste filtrable et paginée, dossier complet
 * (chronologie, registre du séquestre, preuves, discussions, litiges) et annulation avec motif.
 *
 * <p>« Bloquée » = en retard (OVERDUE), ou payée (séquestre HELD) depuis plus de {@value #BLOCKED_AFTER_HOURS} h
 * sans être terminée : une course qui demande l'attention de l'administrateur.
 */
@Service
public class AdminCourseService {

    public static final int BLOCKED_AFTER_HOURS = 72;
    static final Set<String> HELD_STATUSES = Set.of("IN_PROGRESS", "OVERDUE", "PROOFS_SUBMITTED");
    static final Set<String> UNPAID_STATUSES = Set.of("PUBLISHED", "ASSIGNED");

    private final CourseRepository courseRepository;
    private final UserRepository userRepository;
    private final EscrowRepository escrowRepository;
    private final EscrowService escrowService;
    private final ProofService proofService;
    private final ChatRoomRepository chatRoomRepository;
    private final CourseOfferRepository offerRepository;
    private final DisputeRepository disputeRepository;
    private final NotificationService notificationService;
    private final Clock clock;

    @org.springframework.beans.factory.annotation.Autowired
    public AdminCourseService(CourseRepository courseRepository, UserRepository userRepository,
                              EscrowRepository escrowRepository, EscrowService escrowService, ProofService proofService,
                              ChatRoomRepository chatRoomRepository, CourseOfferRepository offerRepository,
                              DisputeRepository disputeRepository, NotificationService notificationService) {
        this(courseRepository, userRepository, escrowRepository, escrowService, proofService, chatRoomRepository,
                offerRepository, disputeRepository, notificationService, Clock.systemDefaultZone());
    }

    AdminCourseService(CourseRepository courseRepository, UserRepository userRepository,
                       EscrowRepository escrowRepository, EscrowService escrowService, ProofService proofService,
                       ChatRoomRepository chatRoomRepository, CourseOfferRepository offerRepository,
                       DisputeRepository disputeRepository, NotificationService notificationService, Clock clock) {
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
        this.escrowRepository = escrowRepository;
        this.escrowService = escrowService;
        this.proofService = proofService;
        this.chatRoomRepository = chatRoomRepository;
        this.offerRepository = offerRepository;
        this.disputeRepository = disputeRepository;
        this.notificationService = notificationService;
        this.clock = clock;
    }

    // ─── Types de réponse ─────────────────────────────────────────────────────

    public record CourseRow(Long id, String description, String zone, String status, String escrowStatus,
                            String clientName, String courierName, BigDecimal totalAmount, BigDecimal courseAmount,
                            LocalDateTime createdAt, LocalDateTime scheduledAt, LocalDateTime paidAt, boolean blocked) {}

    public record CoursePage(List<CourseRow> items, long total, int page, int size) {}

    public record Party(Long id, String fullName, String email, String phone, String status) {}

    public record LedgerLine(Long id, String entryType, BigDecimal amount, String provider, String providerRef,
                             String status, LocalDateTime createdAt) {}

    public record RoomInfo(Long chatRoomId, Long courierId, String courierName, boolean archived, boolean retained) {}

    public record DisputeInfo(Long id, String motifCode, String status, String decision, LocalDateTime createdAt) {}

    public record TimelineEvent(String label, LocalDateTime at) {}

    public record CourseDetail(CourseResponse course, Party client, Party courier, boolean blocked,
                               List<TimelineEvent> timeline, List<LedgerLine> ledger, BigDecimal held,
                               List<ProofResponse> proofs, List<RoomInfo> rooms, List<DisputeInfo> disputes,
                               String cancelReason, LocalDateTime cancelledAt, String cancelAction) {}

    // ─── Liste ────────────────────────────────────────────────────────────────

    /**
     * @param status statut exact, ou {@code BLOCKED} (courses qui demandent l'attention), ou vide pour tout
     * @param q      recherche : numéro de course, description, nom / email / téléphone du client ou du coursier
     */
    @Transactional(readOnly = true)
    public CoursePage list(String status, String q, int page, int size) {
        int p = Math.max(0, page);
        int s = Math.min(Math.max(1, size), 100);
        LocalDateTime heldBefore = now().minusHours(BLOCKED_AFTER_HOURS);

        Specification<Course> spec = (root, query, cb) -> {
            List<Predicate> and = new ArrayList<>();
            String st = status == null ? "" : status.trim().toUpperCase();
            if ("BLOCKED".equals(st)) {
                and.add(cb.or(
                        cb.equal(root.get("status"), "OVERDUE"),
                        cb.and(root.get("status").in(HELD_STATUSES), cb.equal(root.get("escrowStatus"), "HELD"),
                                cb.lessThan(root.get("paidAt"), heldBefore))));
            } else if (!st.isEmpty()) {
                and.add(cb.equal(root.get("status"), st));
            }
            String term = q == null ? "" : q.trim().toLowerCase();
            if (!term.isEmpty()) {
                List<Predicate> or = new ArrayList<>();
                String like = "%" + term.replace("%", "").replace("_", "") + "%";
                or.add(cb.like(cb.lower(root.get("description")), like));
                or.add(cb.like(cb.lower(root.get("zone")), like));
                String digits = term.startsWith("#") ? term.substring(1) : term;
                if (digits.matches("\\d{1,18}")) or.add(cb.equal(root.get("id"), Long.parseLong(digits)));
                Set<Long> userIds = matchingUserIds(term);
                if (!userIds.isEmpty()) {
                    or.add(root.get("clientId").in(userIds));
                    or.add(root.get("courierId").in(userIds));
                }
                and.add(cb.or(or.toArray(new Predicate[0])));
            }
            return cb.and(and.toArray(new Predicate[0]));
        };

        Page<Course> result = courseRepository.findAll(spec, PageRequest.of(p, s, Sort.by(Sort.Direction.DESC, "createdAt")));
        Map<Long, String> names = names(result.getContent());
        List<CourseRow> rows = result.getContent().stream().map(c -> new CourseRow(
                c.getId(), c.getDescription(), c.getZone(), c.getStatus(), c.getEscrowStatus(),
                names.get(c.getClientId()), c.getCourierId() == null ? null : names.get(c.getCourierId()),
                c.getTotalAmount(), c.getCourseAmount(), c.getCreatedAt(), c.getScheduledAt(), c.getPaidAt(),
                isBlocked(c, heldBefore))).toList();
        return new CoursePage(rows, result.getTotalElements(), p, s);
    }

    private Set<Long> matchingUserIds(String term) {
        String compact = term.replace(" ", "");
        return userRepository.findAll().stream()
                .filter(u -> contains(u.getFullName(), term) || contains(u.getEmail(), term)
                        || (!compact.isEmpty() && u.getPhone() != null && u.getPhone().replace(" ", "").contains(compact)))
                .map(User::getId)
                .collect(Collectors.toCollection(HashSet::new));
    }

    private static boolean contains(String value, String term) {
        return value != null && value.toLowerCase().contains(term);
    }

    // ─── Dossier ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public CourseDetail detail(Long courseId) {
        Course c = courseRepository.findById(courseId).orElseThrow(() -> new NotFoundException("Course introuvable."));
        Map<Long, User> users = usersById(c);
        User client = users.get(c.getClientId());
        User courier = c.getCourierId() == null ? null : users.get(c.getCourierId());

        List<ChatRoom> rooms = chatRoomRepository.findByCourseId(courseId);
        Map<Long, String> roomNames = userRepository.findAllById(rooms.stream().map(ChatRoom::getCourierId).toList())
                .stream().collect(Collectors.toMap(User::getId, u -> displayName(u)));
        Long retainedRoom = c.getCourierId() == null ? null : rooms.stream()
                .filter(r -> c.getCourierId().equals(r.getCourierId())).map(ChatRoom::getId).findFirst().orElse(null);

        List<LedgerLine> ledger = escrowRepository.findByCourseId(courseId).stream()
                .sorted(java.util.Comparator.comparing(e -> e.getCreatedAt() == null ? LocalDateTime.MIN : e.getCreatedAt()))
                .map(e -> new LedgerLine(e.getId(), e.getEntryType(), e.getAmount(), e.getProvider(), e.getProviderRef(),
                        e.getStatus(), e.getCreatedAt()))
                .toList();

        CourseResponse dto = CourseResponse.of(c, retainedRoom, CourseResponse.Viewer.ADMIN,
                client == null ? null : displayName(client), courier == null ? null : displayName(courier));

        return new CourseDetail(dto, party(client), party(courier), isBlocked(c, now().minusHours(BLOCKED_AFTER_HOURS)),
                timeline(c), ledger, escrowRepository.sumByCourseId(courseId),
                proofService.getProofsForAdmin(courseId),
                rooms.stream().map(r -> new RoomInfo(r.getId(), r.getCourierId(), roomNames.getOrDefault(r.getCourierId(), "Coursier"),
                        Boolean.TRUE.equals(r.getIsArchived()), r.getId().equals(retainedRoom))).toList(),
                disputeRepository.findByCourseId(courseId).stream()
                        .map(d -> new DisputeInfo(d.getId(), d.getMotifCode(), d.getStatus(), d.getDecision(), d.getCreatedAt())).toList(),
                c.getCancelReason(), c.getCancelledAt(), cancelAction(c));
    }

    private static List<TimelineEvent> timeline(Course c) {
        List<TimelineEvent> t = new ArrayList<>();
        add(t, "Course créée", c.getCreatedAt());
        add(t, "Publiée", c.getPublishedAt());
        add(t, "Payée, argent bloqué en séquestre", c.getPaidAt());
        add(t, "Démarrée par le coursier", c.getStartedAt());
        add(t, "En retard sur les preuves", c.getOverdueSince());
        if (c.getAutoValidateAt() != null) add(t, "Validation automatique prévue", c.getAutoValidateAt());
        add(t, "Annulée par l'administration", c.getCancelledAt());
        add(t, "Clôturée", c.getCompletedAt());
        t.sort(java.util.Comparator.comparing(TimelineEvent::at));
        return t;
    }

    private static void add(List<TimelineEvent> t, String label, LocalDateTime at) {
        if (at != null) t.add(new TimelineEvent(label, at));
    }

    /** CANCEL (pas encore payée), REFUND (argent bloqué), ou null (aucune annulation possible ici). */
    static String cancelAction(Course c) {
        if (UNPAID_STATUSES.contains(c.getStatus()) && c.getEscrowStatus() == null) return "CANCEL";
        if (HELD_STATUSES.contains(c.getStatus()) && "HELD".equals(c.getEscrowStatus())) return "REFUND";
        return null;
    }

    // ─── Annulation ───────────────────────────────────────────────────────────

    /**
     * Annule la course avec un motif obligatoire. Pas encore payée : annulée (offres rejetées, discussions fermées).
     * Argent bloqué : client remboursé intégralement par le séquestre. Litige en cours : refusé (à trancher dans les litiges).
     */
    @Transactional
    public CourseDetail cancel(Long courseId, Long adminId, String reason) {
        String motif = reason == null ? "" : reason.trim();
        if (motif.length() < 10) {
            throw new BusinessException("Indiquez le motif de l'annulation (10 caractères minimum) : il est envoyé au client et au coursier.");
        }
        if (motif.length() > 500) motif = motif.substring(0, 500);

        Course c = courseRepository.findByIdForUpdate(courseId).orElseThrow(() -> new NotFoundException("Course introuvable."));
        if ("DISPUTED".equals(c.getStatus())) {
            throw new ConflictException("Un litige est en cours sur cette course : tranchez-le depuis l'écran des litiges.");
        }
        String action = cancelAction(c);
        if (action == null) {
            throw new ConflictException("Cette course ne peut plus être annulée (statut : " + c.getStatus() + ").");
        }

        if ("REFUND".equals(action)) {
            escrowService.refundTotal(c, true);
        } else {
            for (CourseOffer offer : offerRepository.findByCourseId(courseId)) {
                if ("ACTIVE".equals(offer.getStatus()) || "ACCEPTED".equals(offer.getStatus())) {
                    offer.setStatus("REJECTED");
                    offerRepository.save(offer);
                }
            }
            c.setStatus("CANCELLED");
        }
        for (ChatRoom room : chatRoomRepository.findByCourseId(courseId)) {
            if (!Boolean.TRUE.equals(room.getIsArchived())) {
                room.setIsArchived(true);
                chatRoomRepository.save(room);
            }
        }
        c.setCancelReason(motif);
        c.setCancelledBy(adminId);
        c.setCancelledAt(now());
        courseRepository.save(c);

        boolean refunded = "REFUND".equals(action);
        Long clientId = c.getClientId(), courierId = c.getCourierId();
        String finalMotif = motif;
        afterCommit(() -> notificationService.notifyCancelledByAdmin(clientId, courierId, courseId, finalMotif, refunded));
        return detail(courseId);
    }

    // ─── Utilitaires ──────────────────────────────────────────────────────────

    static boolean isBlocked(Course c, LocalDateTime heldBefore) {
        if ("OVERDUE".equals(c.getStatus())) return true;
        return HELD_STATUSES.contains(c.getStatus()) && "HELD".equals(c.getEscrowStatus())
                && c.getPaidAt() != null && c.getPaidAt().isBefore(heldBefore);
    }

    private Map<Long, String> names(Collection<Course> courses) {
        Set<Long> ids = new HashSet<>();
        for (Course c : courses) {
            ids.add(c.getClientId());
            if (c.getCourierId() != null) ids.add(c.getCourierId());
        }
        return userRepository.findAllById(ids).stream().collect(Collectors.toMap(User::getId, AdminCourseService::displayName));
    }

    private Map<Long, User> usersById(Course c) {
        List<Long> ids = new ArrayList<>(List.of(c.getClientId()));
        if (c.getCourierId() != null) ids.add(c.getCourierId());
        return userRepository.findAllById(ids).stream().collect(Collectors.toMap(User::getId, Function.identity()));
    }

    private static String displayName(User u) {
        return u.getFullName() == null || u.getFullName().isBlank() ? u.getEmail() : u.getFullName();
    }

    private static Party party(User u) {
        return u == null ? null : new Party(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getStatus());
    }

    private static void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { action.run(); }
            });
        } else {
            action.run();
        }
    }

    private LocalDateTime now() {
        return LocalDateTime.now(clock);
    }
}
