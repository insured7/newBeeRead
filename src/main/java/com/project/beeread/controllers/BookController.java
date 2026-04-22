package com.project.beeread.controllers;

import com.project.beeread.dtos.BookDTO;
import com.project.beeread.models.Book;
import com.project.beeread.repositories.BookRepository;
import com.project.beeread.services.BookService;
import com.project.beeread.services.OpenLibraryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/books")
@CrossOrigin(origins = "*")
public class BookController {

    @Autowired
    private BookRepository bookRepository;
    @Autowired
    private OpenLibraryService openLibraryService;

    @Autowired
    private BookService bookService;

    @GetMapping("/search")
    public List<BookDTO> searchBooks(@RequestParam String query) {
        return openLibraryService.searchBooks(query);
    }

    @PostMapping("/save")
    public Book saveBook(@RequestBody BookDTO bookDto) {
        return bookService.saveBook(bookDto);
    }

    @GetMapping("/{id}")
    public Book getBook(@PathVariable String id) {
        return bookService.getBookById(id);
    }

    @GetMapping("/featured")
    public List<Book> getFeaturedBooks() {
        return bookRepository.findTop10Books();
    }
}