package com.project.beeread.controllers;

import com.project.beeread.models.Profile;
import com.project.beeread.services.ProfileService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/profiles")
@CrossOrigin(origins = "*") // Para que tu JS frontal pueda llamar al back sin problemas de CORS
public class ProfileController {

    @Autowired
    private ProfileService profileService;

    @GetMapping
    public List<Profile> getAll() {
        return profileService.getAllProfiles();
    }

    @GetMapping("/{id}")
    public Profile getById(@PathVariable UUID id) {
        return profileService.getProfileById(id);
    }
}
