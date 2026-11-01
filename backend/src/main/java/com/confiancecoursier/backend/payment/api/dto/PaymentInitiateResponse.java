package com.confiancecoursier.backend.payment.api.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;

@Data
@Builder
public class PaymentInitiateResponse {
    private String paymentRef;
    private BigDecimal totalAmount;
    private String status;   // PENDING
    private Long courseId;
}
