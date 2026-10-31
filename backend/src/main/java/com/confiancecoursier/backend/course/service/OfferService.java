package com.confiancecoursier.backend.course.service;

import com.confiancecoursier.backend.chat.domain.ChatRoom;
import com.confiancecoursier.backend.chat.repository.ChatRoomRepository;
import com.confiancecoursier.backend.course.domain.Course;
import com.confiancecoursier.backend.course.domain.CourseOffer;
import com.confiancecoursier.backend.course.repository.CourseOfferRepository;
import com.confiancecoursier.backend.course.repository.CourseRepository;
import com.confiancecoursier.backend.shared.exception.BusinessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class OfferService {

    private final CourseOfferRepository offerRepository;
    private final CourseRepository courseRepository;
    private final ChatRoomRepository chatRoomRepository;

    public OfferService(CourseOfferRepository offerRepository,
                        CourseRepository courseRepository,
                        ChatRoomRepository chatRoomRepository) {
        this.offerRepository = offerRepository;
        this.courseRepository = courseRepository;
        this.chatRoomRepository = chatRoomRepository;
    }

    @Transactional
    public CourseOffer createOffer(Long courseId, Long courierId, BigDecimal amount, String details) {
        // 1. Vérifier que la course existe et est PUBLISHED
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessException("Course non trouvée."));

        if (!"PUBLISHED".equals(course.getStatus())) {
            throw new BusinessException("Cette course n'est plus disponible.");
        }

        // 2. Vérifier que le coursier n'a pas déjà fait une offre
        if (offerRepository.existsByCourseIdAndCourierId(courseId, courierId)) {
            throw new BusinessException("Vous avez déjà proposé une offre pour cette course.");
        }

        // 3. Créer l'offre
        CourseOffer offer = CourseOffer.builder()
                .courseId(courseId)
                .courierId(courierId)
                .amount(amount)
                .details(details)
                .status("PENDING")
                .build();
        offerRepository.save(offer);

        // 4. Créer le salon de chat (s'il n'existe pas déjà)
        if (chatRoomRepository.findByCourseIdAndCourierId(courseId, courierId).isEmpty()) {
            ChatRoom chatRoom = ChatRoom.builder()
                    .courseId(courseId)
                    .clientId(course.getClientId())
                    .courierId(courierId)
                    .build();
            chatRoomRepository.save(chatRoom);
        }

        return offer;
    }

    public List<CourseOffer> getOffersForCourse(Long courseId) {
        return offerRepository.findByCourseId(courseId);
    }

    @Transactional
    public void acceptOffer(Long courseId, Long offerId, Long clientId) {
        // 1. Vérifier que la course existe et appartient au client
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new BusinessException("Course non trouvée."));

        if (!course.getClientId().equals(clientId)) {
            throw new BusinessException("Vous n'êtes pas le propriétaire de cette course.");
        }

        if (!"PUBLISHED".equals(course.getStatus()) && !"NEGOTIATING".equals(course.getStatus())) {
            throw new BusinessException("Cette course ne peut plus être attribuée.");
        }

        // 2. Vérifier que l'offre existe et correspond à la course
        CourseOffer offerToAccept = offerRepository.findById(offerId)
                .orElseThrow(() -> new BusinessException("Offre non trouvée."));

        if (!offerToAccept.getCourseId().equals(courseId)) {
            throw new BusinessException("Cette offre ne correspond pas à la course.");
        }

        // 3. Accepter l'offre choisie
        offerToAccept.setStatus("ACCEPTED");
        offerRepository.save(offerToAccept);

        // 4. Rejeter toutes les autres offres pour cette course
        List<CourseOffer> allOffers = offerRepository.findByCourseId(courseId);
        for (CourseOffer offer : allOffers) {
            if (!offer.getId().equals(offerId) && "PENDING".equals(offer.getStatus())) {
                offer.setStatus("REJECTED");
                offerRepository.save(offer);
            }
        }

        // 5. Mettre à jour la course
        course.setCourierId(offerToAccept.getCourierId());
        course.setAcceptedOfferId(offerToAccept.getId());
        course.setCourseAmount(offerToAccept.getAmount()); // On stocke le montant accepté
        course.setStatus("ASSIGNED");
        courseRepository.save(course);

        // TODO: Envoyer un email aux autres coursiers pour les prévenir
    }
}