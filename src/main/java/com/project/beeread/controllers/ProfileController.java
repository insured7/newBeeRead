package com.project.beeread.controllers;

import com.project.beeread.dtos.ProfileDTO;
import com.project.beeread.models.Profile;
import com.project.beeread.repositories.ProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional; // ⭐️ NUEVA IMPORTACIÓN ⭐️
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/profiles")
@CrossOrigin(origins = "*")
@Transactional // ⭐️ LA MAGIA QUE MANTIENE LA CONEXIÓN ABIERTA ⭐️
public class ProfileController {

    @Autowired
    private ProfileRepository profileRepository;

    @GetMapping("/{username}")
    public ResponseEntity<ProfileDTO> getProfile(@PathVariable String username, @RequestParam(required = false) String viewerUsername) {
        Profile profile = profileRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Perfil no encontrado"));

        ProfileDTO dto = new ProfileDTO();
        dto.setId(profile.getId());
        dto.setUsername(profile.getUsername());
        dto.setFullName(profile.getFullName());
        dto.setBio(profile.getBio());
        dto.setAvatarUrl(profile.getAvatarUrl());
        dto.setRoleId(profile.getRoleId());
        dto.setMovil(profile.getMovil());

        // Calculamos los contadores
        dto.setFollowersCount(profile.getFollowers().size());
        dto.setFollowingCount(profile.getFollowing().size());
        dto.setReviews(profile.getReviews());
        dto.setFavorites(profile.getFavorites());

        // Lógica para saber si el visor ya sigue a este perfil
        if (viewerUsername != null) {
            boolean following = profile.getFollowers().stream()
                    .anyMatch(follower -> follower.getUsername().equals(viewerUsername));
            dto.setFollowing(following);
        }

        return ResponseEntity.ok(dto);
    }

    // Actualizar biografía o datos del perfil
    @PutMapping("/{id}")
    public ResponseEntity<?> updateProfile(@PathVariable UUID id, @RequestBody Profile profileDetails) {
        return profileRepository.findById(id).map(profile -> {
            // Validar si el username ha cambiado y si ya existe
            if (!profile.getUsername().equals(profileDetails.getUsername())) {
                if (profileRepository.findByUsername(profileDetails.getUsername()).isPresent()) {
                    return ResponseEntity.badRequest().body("El nombre de usuario ya está en uso.");
                }
                profile.setUsername(profileDetails.getUsername());
            }

            profile.setFullName(profileDetails.getFullName());
            profile.setBio(profileDetails.getBio());
            profile.setAvatarUrl(profileDetails.getAvatarUrl());
            profile.setUpdatedAt(java.time.OffsetDateTime.now());

            Profile updatedProfile = profileRepository.save(profile);
            return ResponseEntity.ok(updatedProfile);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{username}/follow")
    public ResponseEntity<?> toggleFollow(@PathVariable String username, @RequestParam String followerUsername) {
        // 1. Buscamos a ambos usuarios
        Profile target = profileRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario a seguir no encontrado"));

        Profile follower = profileRepository.findByUsername(followerUsername)
                .orElseThrow(() -> new RuntimeException("Tu usuario no fue encontrado"));

        // 2. No puedes seguirte a ti mismo (Seguridad extra)
        if (target.getId().equals(follower.getId())) {
            return ResponseEntity.badRequest().body("No puedes seguirte a ti mismo.");
        }

        // 3. Lógica de Toggle
        if (follower.getFollowing().contains(target)) {
            // Si ya lo sigue, lo quitamos (Unfollow)
            follower.getFollowing().remove(target);
            profileRepository.save(follower);
            return ResponseEntity.ok(false); // Retornamos false indicando que ya NO lo sigue
        } else {
            // Si no lo sigue, lo añadimos (Follow)
            follower.getFollowing().add(target);
            profileRepository.save(follower);
            return ResponseEntity.ok(true); // Retornamos true indicando que AHORA lo sigue
        }
    }

    @GetMapping("/search")
    public ResponseEntity<List<ProfileDTO>> searchProfiles(@RequestParam String query) {
        // Busca en la base de datos perfiles cuyo nombre o username contengan la 'query' (ignorando mayúsculas)
        List<Profile> profiles = profileRepository.findByUsernameContainingIgnoreCaseOrFullNameContainingIgnoreCase(query, query);

        // Convertir la lista de Profile a ProfileDTO (para que no de problemas de recursión)
        List<ProfileDTO> dtos = profiles.stream().map(profile -> {
            ProfileDTO dto = new ProfileDTO();
            dto.setUsername(profile.getUsername());
            dto.setFullName(profile.getFullName());
            dto.setAvatarUrl(profile.getAvatarUrl());
            return dto;
        }).toList();

        return ResponseEntity.ok(dtos);
    }

    // Obtener todos los usuarios para el panel Admin
    @GetMapping("/all")
    public ResponseEntity<List<Profile>> getAllProfiles() {
        // En un caso real devolveríamos un DTO con el ID visible,
        // pero como es para el admin, devolvemos la entidad o un DTO específico.
        List<Profile> profiles = profileRepository.findAll();
        return ResponseEntity.ok(profiles);
    }

    // 2. Eliminar perfil
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProfile(@PathVariable UUID id) {
        Profile profileToDelete = profileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        // Protección del último administrador
        if (profileToDelete.getRoleId() != null && profileToDelete.getRoleId() == 2) {
            long adminCount = profileRepository.findAll().stream()
                    .filter(p -> p.getRoleId() != null && p.getRoleId() == 2)
                    .count();

            if (adminCount <= 1) {
                return ResponseEntity.badRequest().body("{\"error\": \"No se puede eliminar al último administrador.\"}");
            }
        }


        // A los que me siguen, les digo que me dejen de seguir
        profileToDelete.getFollowers().forEach(follower -> follower.getFollowing().remove(profileToDelete));
        // Yo dejo de seguir a todo el mundo
        profileToDelete.getFollowing().clear();

        // Ahora sí, PostgreSQL nos dejará borrar el perfil tranquilamente
        profileRepository.delete(profileToDelete);

        // Devolvemos un JSON válido
        return ResponseEntity.ok("{\"message\": \"Usuario eliminado correctamente de la colmena.\"}");
    }
}