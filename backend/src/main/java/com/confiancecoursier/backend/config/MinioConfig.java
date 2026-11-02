package com.confiancecoursier.backend.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Configuration du client MinIO.
 *
 * Le client est instancié une seule fois en tant que bean Spring.
 * Les propriétés sont lues depuis application.properties (ou variables d'env en production).
 *
 * Usage : injecter {@link MinioClient} ou {@link com.confiancecoursier.backend.shared.util.FileStorageService}
 * dans les services qui ont besoin de stocker/lire des fichiers.
 */
@Configuration
public class MinioConfig {

    @Value("${minio.url}")
    private String url;

    @Value("${minio.access-key}")
    private String accessKey;

    @Value("${minio.secret-key}")
    private String secretKey;

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(url)
                .credentials(accessKey, secretKey)
                .build();
    }
}
