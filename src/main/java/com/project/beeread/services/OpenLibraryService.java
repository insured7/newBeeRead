package com.project.beeread.services;

import com.project.beeread.dtos.BookDTO;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

@Service
public class OpenLibraryService {

    private final String API_URL = "https://openlibrary.org/search.json?q=";
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper(); // Para leer el JSON de OpenLibrary

    public List<BookDTO> searchBooks(String query) {
        List<BookDTO> bookList = new ArrayList<>();

        try {
            // 1. Llamamos a la API (reemplazamos espacios por '+' para la URL)
            String url = API_URL + query.replace(" ", "+") + "&limit=10"; // Solo 10 resultados para ir rápido
            String response = restTemplate.getForObject(url, String.class);

            // 2. Parseamos el JSON gigante
            JsonNode root = objectMapper.readTree(response);
            JsonNode docs = root.path("docs");

            // 3. Extraemos solo lo que necesitamos para nuestro DTO
            for (JsonNode node : docs) {
                BookDTO book = new BookDTO();
                book.setTitle(node.path("title").asText("Sin título"));

                // Los autores vienen en un array, cogemos el primero si existe
                if (node.has("author_name") && node.path("author_name").isArray()) {
                    book.setAuthor(node.path("author_name").get(0).asText());
                } else {
                    book.setAuthor("Autor desconocido");
                }

                book.setFirstPublishYear(node.path("first_publish_year").asInt(0));
                book.setKey(node.path("key").asText());

                // Open Library tiene una URL específica para las portadas si tenemos el cover_i
                if (node.has("cover_i")) {
                    String coverId = node.path("cover_i").asText();
                    book.setCoverUrl("https://covers.openlibrary.org/b/id/" + coverId + "-M.jpg");
                } else {
                    // Imagen por defecto si no hay portada
                    book.setCoverUrl("https://via.placeholder.com/150x200?text=Sin+Portada");
                }

                bookList.add(book);
            }
        } catch (Exception e) {
            System.err.println("Error al buscar libros: " + e.getMessage());
        }

        return bookList;
    }
}
