package com.project.beeread.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "profiles")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Profile {

    @Id
    private UUID id;

    @Column(unique = true)
    private String username;

    @Column(name = "full_name")
    private String fullName;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(columnDefinition = "TEXT")
    private String bio; // Tu descripción

    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;

    @Column(name = "movil")
    private String movil;

    @Column(name = "role_id")
    private Integer roleId = 1; // Por defecto 1 (USER)

    // ⭐️ EXCLUSIONES AÑADIDAS PARA EVITAR BUCLES INFINITOS ⭐️
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    @JsonManagedReference(value = "profile-reviews")
    @OneToMany(mappedBy = "profile", cascade = CascadeType.ALL)
    @OrderBy("createdAt DESC")
    private List<Review> reviews;

    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    @JsonManagedReference(value = "profile-favorites")
    @OneToMany(mappedBy = "profile", cascade = CascadeType.ALL)
    @OrderBy("createdAt DESC")
    private List<Favorite> favorites;

    // Lista de usuarios a los que yo sigo
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    @ManyToMany
    @JoinTable(
            name = "user_follows",
            joinColumns = @JoinColumn(name = "follower_id"), // Yo soy el que sigue
            inverseJoinColumns = @JoinColumn(name = "following_id") // El otro es el seguido
    )
    @JsonIgnore // Evita bucles infinitos al mandar a JS
    private Set<Profile> following = new HashSet<>();

    // Lista de usuarios que me siguen a mí
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    @ManyToMany(mappedBy = "following") // Mapeado por la variable de arriba
    @JsonIgnore
    private Set<Profile> followers = new HashSet<>();
}