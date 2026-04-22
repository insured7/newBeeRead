package com.project.beeread.services;

import com.project.beeread.dtos.BookDTO;
import com.project.beeread.exceptions.ResourceNotFoundException;
import com.project.beeread.models.Book;
import com.project.beeread.repositories.BookRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class BookService {

    @Autowired
    private BookRepository bookRepository;

    public Book saveBook(BookDTO bookDto) {
        Optional<Book> existingBook = bookRepository.findById(bookDto.getKey());

        if (existingBook.isPresent()) {
            return existingBook.get();
        }

        Book book = new Book();
        book.setId(bookDto.getKey());
        book.setTitle(bookDto.getTitle());
        book.setAuthor(bookDto.getAuthor());
        book.setCoverUrl(bookDto.getCoverUrl());
        book.setFirstPublishYear(bookDto.getFirstPublishYear());

        return bookRepository.save(book);
    }

    public Book getBookById(String id) {
        return bookRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("El libro con ID '" + id + "' no existe en la colmena."));
    }
}