package com.project.beeread.controllers;

import com.project.beeread.dtos.ReviewDTO;
import com.project.beeread.dtos.ReviewRequest;
import com.project.beeread.models.Book;
import com.project.beeread.models.Profile;
import com.project.beeread.models.Review;
import com.project.beeread.repositories.BookRepository;
import com.project.beeread.repositories.ProfileRepository;
import com.project.beeread.repositories.ReviewRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "*")
public class ReviewController {

    @Autowired
    private ReviewRepository reviewRepository;
    @Autowired
    private ProfileRepository profileRepository;
    @Autowired
    private BookRepository bookRepository;

    @PostMapping
    public ResponseEntity<?> createReview(@RequestBody ReviewRequest request) {
        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            return ResponseEntity.badRequest().body("La puntuación con estrellas es obligatoria.");
        }

        Profile profile = profileRepository.findByUsername(request.getUsername()).orElse(null);
        if (profile == null) {
            return ResponseEntity.badRequest().body("Usuario no encontrado en la colmena.");
        }

        Book book = bookRepository.findById(request.getBookId()).orElse(null);
        if (book == null) {
            return ResponseEntity.badRequest().body("Libro no encontrado.");
        }

        // Buscamos si ya existe una reseña
        Optional<Review> existingReview = reviewRepository.findByProfileAndBook(profile, book);
        Review review;

        if (existingReview.isPresent()) {
            // Si existe, se sobreescribe
            review = existingReview.get();
            review.setRating(request.getRating());
            review.setContent(request.getContent() != null ? request.getContent() : "");
            review.setCreatedAt(java.time.OffsetDateTime.now()); // Opcional: Actualiza la fecha para que suba arriba en el perfil
        } else {
            // Si no existe, se crea una nueva
            review = new Review();
            review.setProfile(profile);
            review.setBook(book);
            review.setRating(request.getRating());
            review.setContent(request.getContent() != null ? request.getContent() : "");
        }

        reviewRepository.save(review);

        return ResponseEntity.ok(review);
    }

    @GetMapping("/book/{bookId}")
    public ResponseEntity<List<ReviewDTO>> getBookReviews(@PathVariable String bookId) {
        List<Review> reviews = reviewRepository.findByBookIdOrderByCreatedAtDesc(bookId);

        List<ReviewDTO> reviewDTOs = reviews.stream().map(review -> {
            ReviewDTO dto = new ReviewDTO();
            dto.setId(review.getId());
            dto.setUsername(review.getProfile().getUsername());
            dto.setAvatarUrl(review.getProfile().getAvatarUrl());
            dto.setRating(review.getRating());
            dto.setContent(review.getContent());
            dto.setCreatedAt(review.getCreatedAt());
            return dto;
        }).toList();

        return ResponseEntity.ok(reviewDTOs);
    }

    // Obtener las últimas X reseñas de toda la plataforma para la landing
    @GetMapping("/latest")
    public ResponseEntity<List<ReviewDTO>> getLatestReviews(@RequestParam(defaultValue = "6") int limit) {
        // Usamos un PageRequest para limitar los resultados
        List<Review> reviews = reviewRepository.findAll(
                org.springframework.data.domain.PageRequest.of(0, limit,
                        org.springframework.data.domain.Sort.by("createdAt").descending())
        ).getContent();

        List<ReviewDTO> dtos = reviews.stream().map(review -> {
            ReviewDTO dto = new ReviewDTO();
            dto.setUsername(review.getProfile().getUsername());
            dto.setAvatarUrl(review.getProfile().getAvatarUrl());
            dto.setRating(review.getRating());
            dto.setContent(review.getContent());
            dto.setCreatedAt(review.getCreatedAt());

            // NUEVO: Extraemos los datos del libro
            dto.setBookId(review.getBook().getId());
            dto.setBookTitle(review.getBook().getTitle());
            dto.setBookCoverUrl(review.getBook().getCoverUrl());

            return dto;
        }).toList();

        return ResponseEntity.ok(dtos);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteReview(@PathVariable Long id) { // Cambiado a Long
        if (!reviewRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        reviewRepository.deleteById(id);
        // Devolvemos un JSON válido para que el Frontend no se queje
        return ResponseEntity.ok().body("{\"message\": \"Reseña eliminada con éxito\"}");
    }
}