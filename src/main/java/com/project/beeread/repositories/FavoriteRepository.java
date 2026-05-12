package com.project.beeread.repositories;

import com.project.beeread.models.Book;
import com.project.beeread.models.Favorite;
import com.project.beeread.models.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    Optional<Favorite> findByProfileAndBook(Profile profile, Book book);
    boolean existsByProfileAndBookId(Profile profile, String bookId);
}