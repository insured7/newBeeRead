package com.project.beeread.controllers;

import com.project.beeread.models.Book;
import com.project.beeread.models.Favorite;
import com.project.beeread.models.Profile;
import com.project.beeread.repositories.BookRepository;
import com.project.beeread.repositories.FavoriteRepository;
import com.project.beeread.repositories.ProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/favorites")
@CrossOrigin(origins = "*")
public class FavoriteController {

    @Autowired
    private FavoriteRepository favoriteRepository;
    @Autowired
    private ProfileRepository profileRepository;
    @Autowired
    private BookRepository bookRepository;

    // Comprobar si un libro es favorito
    @GetMapping("/check")
    public ResponseEntity<Boolean> isFavorite(@RequestParam String username, @RequestParam String bookId) {
        Optional<Profile> profile = profileRepository.findByUsername(username);
        if (profile.isEmpty()) return ResponseEntity.ok(false);

        boolean exists = favoriteRepository.existsByProfileAndBookId(profile.get(), bookId);
        return ResponseEntity.ok(exists);
    }

    // Toggle: Añadir o Quitar de favoritos
    @PostMapping("/toggle")
    public ResponseEntity<?> toggleFavorite(@RequestBody Map<String, String> payload) {
        String username = payload.get("username");
        String bookId   = payload.get("bookId");

        Profile profile = profileRepository.findByUsername(username).orElse(null);
        Book book       = bookRepository.findById(bookId).orElse(null);

        if (profile == null || book == null) {
            return ResponseEntity.badRequest().body("Usuario o libro no encontrado");
        }

        Optional<Favorite> existing = favoriteRepository.findByProfileAndBook(profile, book);

        if (existing.isPresent()) {
            favoriteRepository.delete(existing.get());
            return ResponseEntity.ok(Map.of("isFavorite", false));
        } else {
            Favorite fav = new Favorite();
            fav.setProfile(profile);
            fav.setBook(book);
            favoriteRepository.save(fav);
            return ResponseEntity.ok(Map.of("isFavorite", true));
        }
    }
}