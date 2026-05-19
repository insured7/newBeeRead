package com.project.beeread.controllers;

import com.project.beeread.dtos.ProfileDTO;
import com.project.beeread.models.Profile;
import com.project.beeread.repositories.ProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/profiles")
@CrossOrigin(origins = "*")
@Transactional
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
        dto.setShowMovil(profile.getShowMovil()); // ✅ NUEVO

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

            profile.setMovil(profileDetails.getMovil());
            profile.setShowMovil(profileDetails.getShowMovil());

            profile.setUpdatedAt(java.time.OffsetDateTime.now());

            Profile updatedProfile = profileRepository.save(profile);
            return ResponseEntity.ok(updatedProfile);

        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{username}/follow")
    public ResponseEntity<?> toggleFollow(@PathVariable String username, @RequestParam String followerUsername) {

        Profile target = profileRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Usuario a seguir no encontrado"));

        Profile follower = profileRepository.findByUsername(followerUsername)
                .orElseThrow(() -> new RuntimeException("Tu usuario no fue encontrado"));

        if (target.getId().equals(follower.getId())) {
            return ResponseEntity.badRequest().body("No puedes seguirte a ti mismo.");
        }

        if (follower.getFollowing().contains(target)) {
            follower.getFollowing().remove(target);
            profileRepository.save(follower);
            return ResponseEntity.ok(false);
        } else {
            follower.getFollowing().add(target);
            profileRepository.save(follower);
            return ResponseEntity.ok(true);
        }
    }

    @GetMapping("/search")
    public ResponseEntity<List<ProfileDTO>> searchProfiles(@RequestParam String query) {

        List<Profile> profiles = profileRepository.findByUsernameContainingIgnoreCaseOrFullNameContainingIgnoreCase(query, query);

        List<ProfileDTO> dtos = profiles.stream().map(profile -> {
            ProfileDTO dto = new ProfileDTO();
            dto.setUsername(profile.getUsername());
            dto.setFullName(profile.getFullName());
            dto.setAvatarUrl(profile.getAvatarUrl());
            return dto;
        }).toList();

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/all")
    public ResponseEntity<List<Profile>> getAllProfiles() {
        List<Profile> profiles = profileRepository.findAll();
        return ResponseEntity.ok(profiles);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProfile(@PathVariable UUID id) {
        Profile profileToDelete = profileRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        if (profileToDelete.getRoleId() != null && profileToDelete.getRoleId() == 2) {
            long adminCount = profileRepository.findAll().stream()
                    .filter(p -> p.getRoleId() != null && p.getRoleId() == 2)
                    .count();

            if (adminCount <= 1) {
                return ResponseEntity.badRequest().body("{\"error\": \"No se puede eliminar al último administrador.\"}");
            }
        }

        profileToDelete.getFollowers().forEach(follower -> follower.getFollowing().remove(profileToDelete));
        profileToDelete.getFollowing().clear();

        profileRepository.delete(profileToDelete);

        return ResponseEntity.ok("{\"message\": \"Usuario eliminado correctamente de la colmena.\"}");
    }
}