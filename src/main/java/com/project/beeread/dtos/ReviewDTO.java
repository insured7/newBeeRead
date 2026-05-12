package com.project.beeread.dtos;

import lombok.Data;
import java.time.OffsetDateTime;

@Data
public class ReviewDTO {
    private Long id;
    private String username;
    private String avatarUrl;
    private Integer rating;
    private String content;
    private OffsetDateTime createdAt;
    private String bookId;
    private String bookTitle;
    private String bookCoverUrl;
}