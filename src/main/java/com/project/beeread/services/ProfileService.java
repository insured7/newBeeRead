package com.project.beeread.services;

import com.project.beeread.models.Profile;
import com.project.beeread.repositories.ProfileRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ProfileService {

    @Autowired
    private ProfileRepository profileRepository;

    // Método para obtener todos los perfiles
    public List<Profile> getAllProfiles() {
        return profileRepository.findAll();
    }

    // Método para buscar un perfil específico por su ID
    public Profile getProfileById(UUID id) {
        return profileRepository.findById(id).orElse(null);
    }
}
