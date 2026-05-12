package com.project.beeread.dtos;

import com.project.beeread.models.Favorite;
import com.project.beeread.models.Review;
import lombok.Data;
import java.util.UUID;
import java.util.List;

@Data
public class ProfileDTO {
    private UUID id;
    private String username;
    private String fullName;
    private String bio;
    private String avatarUrl;
    private String movil;
    private Integer roleId;

    // Campos calculados para la red social
    private int followersCount;
    private int followingCount;
    private boolean isFollowing; // ¿El usuario que consulta sigue a este perfil?

    // Listas simplificadas para evitar recursión
    private List<Review> reviews;
    private List<Favorite> favorites;

}