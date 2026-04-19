package com.project.beeread.controllers;

import com.project.beeread.dtos.BookDTO;
import com.project.beeread.services.OpenLibraryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/books")
@CrossOrigin(origins = "*")
public class BookController {

    @Autowired
    private OpenLibraryService openLibraryService;

    @GetMapping("/search")
    public List<BookDTO> searchBooks(@RequestParam String query) {
        return openLibraryService.searchBooks(query);
    }
}
