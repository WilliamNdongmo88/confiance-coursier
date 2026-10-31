package com.confiancecoursier.backend.course.api.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CreateOfferResponse {
    private Long offerId;
    private Long chatRoomId;
}
