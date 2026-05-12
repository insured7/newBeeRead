package com.project.beeread.repositories;

import com.project.beeread.models.Book;
import com.project.beeread.models.Profile;
import com.project.beeread.models.Review;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    Optional<Review> findByProfileAndBook(Profile profile, Book book);

    List<Review> findByBookIdOrderByCreatedAtDesc(String bookId);
}
