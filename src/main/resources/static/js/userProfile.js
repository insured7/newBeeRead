
// js/userProfile.js

let targetUsername = null;
let myViewerUsername = null;

document.addEventListener('DOMContentLoaded', async () => {
    const loadingSection = document.getElementById('profileLoading');
    const contentSection = document.getElementById('profileContent');

    // 1. Obtener de quién es el perfil que queremos ver desde la URL
    const urlParams = new URLSearchParams(window.location.search);
    targetUsername = urlParams.get('user');

    if (!targetUsername) {
        renderError("No se ha especificado ningún usuario.");
        loadingSection.classList.add('hidden');
        return;
    }

    // 2. Comprobar quién soy yo (el que mira la pantalla)
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        myViewerUsername = session.user.user_metadata?.username;

        // Si estoy mirando mi propio perfil público, me redirijo a mi perfil privado
        if (targetUsername === myViewerUsername) {
            window.location.href = 'profile.html';
            return;
        }
    }

    // 3. Obtener los datos del backend usando DTO (pasando mi usuario para calcular isFollowing)
    try {
        let apiUrl = `http://localhost:8080/api/profiles/${encodeURIComponent(targetUsername)}`;
        if (myViewerUsername) {
            apiUrl += `?viewerUsername=${encodeURIComponent(myViewerUsername)}`;
        }

        const response = await fetch(apiUrl);

        if (!response.ok) {
            if (response.status === 404) throw new Error('Este usuario no existe en la colmena.');
            throw new Error('Error al conectar con el servidor.');
        }

        const profileDto = await response.json();

        // 4. Pintar los datos
        renderPublicProfileInfo(profileDto);
        renderFollowButton(profileDto.following); // boolean isFollowing del DTO
        renderFavorites(profileDto.favorites);
        renderReviews(profileDto.reviews);

        loadingSection.classList.add('hidden');
        contentSection.classList.remove('hidden');

    } catch (error) {
        loadingSection.classList.add('hidden');
        renderError(error.message);
    }
});

// ─── Funciones de Renderizado UI ──────────────────────────────────────────

function renderPublicProfileInfo(profile) {
    document.title = `${profile.fullName || profile.username} — BeeRead`;
    document.getElementById('publicUsernameLabel').textContent = `@${profile.username}`;
    document.getElementById('publicFullName').textContent = profile.fullName || profile.username;

    if (profile.avatarUrl) {
        document.getElementById('publicAvatar').src = profile.avatarUrl;
    } else {
        const initial = profile.username.charAt(0).toUpperCase();
        document.getElementById('publicAvatar').src = `https://ui-avatars.com/api/?name=${initial}&background=1e2340&color=FFB800&size=150&font-size=0.5`;
    }

    document.getElementById('publicBio').textContent = profile.bio || 'Sin biografía.';

    // Pintar contadores de seguidores
    document.getElementById('followersCount').textContent = profile.followersCount || 0;
    document.getElementById('followingCount').textContent = profile.followingCount || 0;
}

function renderFollowButton(isFollowing) {
    const container = document.getElementById('followBtnContainer');
    container.innerHTML = ''; // Limpiar

    if (!myViewerUsername) {
        // Si no está logueado, le pedimos que inicie sesión
        container.innerHTML = `<button class="btn-secondary" onclick="window.location.href='login.html'"><i class="fas fa-sign-in-alt"></i> Inicia sesión para seguir</button>`;
        return;
    }

    const btn = document.createElement('button');
    // UX Pro: Si ya lo sigo, el botón es secundario (menos llamativo). Si no lo sigo, es primario (llamativo).
    if (isFollowing) {
        btn.className = 'btn-secondary';
        btn.innerHTML = '<i class="fas fa-check"></i> Siguiendo';
        btn.onmouseover = () => { btn.innerHTML = '<i class="fas fa-times"></i> Dejar de seguir'; btn.style.borderColor = 'var(--error)'; btn.style.color = 'var(--error)'; };
        btn.onmouseout = () => { btn.innerHTML = '<i class="fas fa-check"></i> Siguiendo'; btn.style.borderColor = ''; btn.style.color = ''; };
    } else {
        btn.className = 'btn-primary';
        btn.innerHTML = '<i class="fas fa-plus"></i> Seguir';
    }

    btn.onclick = async () => await toggleFollowAction(btn);
    container.appendChild(btn);
}

// ─── Acción del Motor Social (Seguir / Dejar de seguir) ──────────────────

async function toggleFollowAction(btnElement) {
    btnElement.disabled = true;
    btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...';

    try {
        const response = await fetch(`http://localhost:8080/api/profiles/${encodeURIComponent(targetUsername)}/follow?followerUsername=${encodeURIComponent(myViewerUsername)}`, {
            method: 'POST'
        });

        if (!response.ok) throw new Error('Error de conexión con la colmena.');

        // El backend nos devuelve un booleano: true = lo hemos seguido, false = lo hemos dejado de seguir
        const nowFollowing = await response.json();

        // Actualizamos el contador visualmente sin recargar la página (Magia Frontend)
        const countSpan = document.getElementById('followersCount');
        let currentCount = parseInt(countSpan.textContent);
        countSpan.textContent = nowFollowing ? currentCount + 1 : currentCount - 1;

        // Repintamos el botón con el nuevo estado
        renderFollowButton(nowFollowing);

    } catch (error) {
        console.error(error);
        alert("Ocurrió un error al intentar actualizar el follow.");
        btnElement.disabled = false;
        renderFollowButton(false); // reseteo por seguridad
    }
}

function renderFavorites(favorites) {
    const container = document.getElementById('favoritesGrid');
    container.innerHTML = '';
    if (!favorites || favorites.length === 0) {
        container.innerHTML = '<p class="results-empty" style="padding: 2rem;">Aún no tienes libros favoritos. ¡Explora la colmena!</p>';
        return;
    }
    favorites.forEach(fav => {
        const book = fav.book;
        const card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = `
            <img src="${book.coverUrl}" alt="Portada de ${book.title}" class="book-cover" onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22220%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e2340%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-weight=%22bold%22 fill=%22%23FFB800%22%3ESin Portada%3C/text%3E%3C/svg%3E';">
            <div class="book-info">
                <div class="book-title" title="${book.title}">${book.title}</div>
                <div class="book-author" title="${book.author}">${book.author}</div>
            </div>
        `;
        card.addEventListener('click', () => { window.location.href = `bookDetail.html?id=${encodeURIComponent(book.id)}`; });
        container.appendChild(card);
    });
}

function renderReviews(reviews) {
    const container = document.getElementById('reviewsList');
    container.innerHTML = '';
    if (!reviews || reviews.length === 0) {
        container.innerHTML = '<p class="results-empty" style="padding: 2rem;">Aún no has escrito ninguna reseña.</p>';
        return;
    }
    reviews.forEach(review => {
        const book = review.book;
        const starsHtml = Array.from({ length: 5 }, (_, i) => { return `<i class="fas fa-star" style="color: ${i < review.rating ? 'var(--honey)' : 'rgba(255,255,255,0.1)'};"></i>`; }).join('');
        const date = new Date(review.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
        const reviewEl = document.createElement('div');
        reviewEl.className = 'review-section';
        reviewEl.style.flexDirection = 'row';
        reviewEl.style.alignItems = 'flex-start';
        reviewEl.style.gap = '1.5rem';
        reviewEl.innerHTML = `
            <img src="${book.coverUrl}" alt="Portada" style="width: 80px; height: 120px; object-fit: cover; border-radius: var(--radius-sm); cursor: pointer;" onclick="window.location.href='bookDetail.html?id=${encodeURIComponent(book.id)}'" onerror="this.src='https://via.placeholder.com/80x120/1e2340/FFB800?text=Sin+Portada';">
            <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; flex-wrap: wrap;">
                    <h3 class="book-title" style="font-size: 1.1rem; cursor: pointer;" onclick="window.location.href='bookDetail.html?id=${encodeURIComponent(book.id)}'">${book.title}</h3>
                    <span style="font-size: 0.8rem; color: var(--text-muted);"><i class="fas fa-calendar-alt"></i> ${date}</span>
                </div>
                <div style="margin-bottom: 1rem; font-size: 0.9rem;">${starsHtml}</div>
                <p style="color: var(--text); line-height: 1.6; font-size: 0.95rem;">"${review.content || 'Sin texto.'}"</p>
            </div>
        `;
        container.appendChild(reviewEl);
    });
}

function renderError(message) {
    const container = document.querySelector('.results-inner');
    container.innerHTML = `
        <div class="results-empty">
            <span class="results-empty-icon">⚠️</span>
            <h2>Algo ha fallado</h2>
            <p>${message}</p>
            <a href="index.html" class="btn-primary" style="margin-top: 1.5rem;"><i class="fas fa-home"></i> Volver al inicio</a>
        </div>
    `;
}

