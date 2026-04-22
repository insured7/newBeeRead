package com.project.beeread.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "books")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Book {

    // Utiliza la clave de Open Library como identificador principal
    @Id
    private String id;

    private String title;

    private String author;

    @Column(name = "cover_url")
    private String coverUrl;

    @Column(name = "first_publish_year")
    private Integer firstPublishYear;
}
