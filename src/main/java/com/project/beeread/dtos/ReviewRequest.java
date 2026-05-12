package com.project.beeread.dtos;

import lombok.Data;

@Data
public class ReviewRequest {
    private String username; // Necesitamos saber quién hace la reseña
    private String bookId;   // A qué libro
    private Integer rating;  // Estrellas (1-5)
    private String content;  // El texto (opcional)
}