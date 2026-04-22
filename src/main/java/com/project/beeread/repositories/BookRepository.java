package com.project.beeread.repositories;

import com.project.beeread.models.Book;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookRepository extends JpaRepository<Book, String> {

    // Método para obtener un máximo de 10 libros para los destacados
    @Query(value = "SELECT * FROM books LIMIT 10", nativeQuery = true)
    List<Book> findTop10Books();
}