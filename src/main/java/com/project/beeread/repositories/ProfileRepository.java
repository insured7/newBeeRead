package com.project.beeread.repositories;

import com.project.beeread.models.Profile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ProfileRepository extends JpaRepository <Profile, UUID> {

    Optional<Profile> findByUsername(String username);
}
