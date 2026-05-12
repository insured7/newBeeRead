package com.project.beeread.repositories;

import com.project.beeread.models.Profile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface FollowRepository extends JpaRepository<Profile, UUID> {
    // Consulta para verificar si existe la relación en la tabla intermedia
    @Query(value = "SELECT COUNT(*) FROM user_follows WHERE follower_id = :followerId AND following_id = :followingId", nativeQuery = true)
    int isFollowing(@Param("followerId") UUID followerId, @Param("followingId") UUID followingId);

    @Query(value = "INSERT INTO user_follows (follower_id, following_id) VALUES (:followerId, :followingId)", nativeQuery = true)
    void follow(@Param("followerId") UUID followerId, @Param("followingId") UUID followingId);

    @Query(value = "DELETE FROM user_follows WHERE follower_id = :followerId AND following_id = :followingId", nativeQuery = true)
    void unfollow(@Param("followerId") UUID followerId, @Param("followingId") UUID followingId);
}