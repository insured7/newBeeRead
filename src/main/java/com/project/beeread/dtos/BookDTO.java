package com.project.beeread.dtos;

import lombok.Data;

@Data
public class BookDTO {
    private String title;
    private String author;
    private String coverUrl;
    private Integer firstPublishYear;
    private String key; // El identificador único de Open Library
}
