// bookDetail.js

async function loadBookDetails() {
    const params    = new URLSearchParams(window.location.search);
    const bookId    = params.get('id');
    const container = document.getElementById('bookDetailContainer');

    if (!bookId) { renderError(container, 'No se ha especificado ningún libro.'); return; }

    try {
        const response = await fetch(`http://localhost:8080/api/books/${encodeURIComponent(bookId)}`);
        if (!response.ok) throw new Error('Este libro no está en la colmena todavía.');

        const book = await response.json();
        renderBook(container, book);
    } catch (error) {
        renderError(container, error.message);
    }
}

function renderBook(container, book) {
    const year = book.firstPublishYear || null;
    const olId = book.openLibraryId || book.id;

    document.title = `${book.title} — BeeRead`;

    container.innerHTML = `
        <nav class="breadcrumb" aria-label="Navegación">
            <a href="index.html"><i class="fas fa-home"></i> Inicio</a>
            <i class="fas fa-chevron-right"></i>
            <a href="index.html#buscar">Búsqueda</a>
            <i class="fas fa-chevron-right"></i>
            <span>${truncate(book.title, 40)}</span>
        </nav>

        <div class="book-detail-layout">
            <div class="book-detail-cover-col">
                <img src="${book.coverUrl}" alt="Portada de ${book.title}" class="book-detail-cover" onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22220%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e2340%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-weight=%22bold%22 fill=%22%23FFB800%22%3ESin Portada%3C/text%3E%3C/svg%3E';">
                <div class="book-detail-actions">
                    <button class="btn-primary" onclick="window.history.back()"><i class="fas fa-arrow-left"></i> Volver</button>
                    <button class="btn-secondary" id="scrollToReviewBtn"><i class="fas fa-star"></i> Reseñar</button>
                    <button class="btn-favorite" id="favoriteBtn" title="Añadir a favoritos"><i class="far fa-heart"></i></button>
                </div>
            </div>

            <div class="book-detail-info">
                <div>
                    <h1 class="book-detail-title">${book.title}</h1>
                    <p class="book-detail-author"><i class="fas fa-pen-nib"></i> ${book.author}</p>
                </div>

                <div class="book-meta-chips">
                    ${year ? `<span class="meta-chip"><i class="fas fa-calendar-alt"></i> ${year}</span>` : ''}
                    <span class="meta-chip"><i class="fas fa-fingerprint"></i> ${olId.replace('/works/', '')}</span>
                    <span class="meta-chip"><i class="fas fa-database"></i> Open Library</span>
                </div>

                <div class="book-detail-divider"></div>

                <div class="book-synopsis-section">
                    <h3 style="font-family: 'Fraunces', serif; font-size: 1.4rem; margin-bottom: 1rem; color: var(--text);">
                        <i class="fas fa-align-left" style="color: var(--honey); margin-right: 0.5rem;"></i> Sinopsis
                    </h3>
                    <div id="synopsisContent" style="color: var(--text-muted); font-size: 1.05rem; line-height: 1.8;">
                        <div class="skeleton skeleton-line" style="width: 100%;"></div>
                        <div class="skeleton skeleton-line" style="width: 95%;"></div>
                        <div class="skeleton skeleton-line" style="width: 90%;"></div>
                        <div class="skeleton skeleton-line" style="width: 60%;"></div>
                    </div>
                </div>

                <div class="book-detail-divider"></div>

                <div class="review-section" id="reviewSection">
                    <h2 class="review-section-title"><i class="fas fa-star"></i> Tu valoración</h2>
                    <div class="star-rating" id="starRating" role="group">
                        ${[1,2,3,4,5].map(n => `<button class="star-btn" data-value="${n}">★</button>`).join('')}
                    </div>
                    <textarea class="review-textarea" id="reviewText" placeholder="Cuéntanos qué te ha parecido… ¿lo recomendarías?" maxlength="1000"></textarea>
                    <button class="btn-primary" id="submitReviewBtn" disabled><i class="fas fa-paper-plane"></i> Enviar reseña</button>
                    <div id="reviewMsg" class="hidden"></div>
                </div>
            </div>

            <div class="book-detail-divider"></div>
            <div class="community-reviews-section">
                <h2 class="review-section-title"><i class="fas fa-comments"></i> La Colmena Opina</h2>
                <div id="communityReviewsList" style="display: flex; flex-direction: column; gap: 1.5rem; margin-top: 1.5rem;">
                    <p style="color: var(--text-muted);">Cargando opiniones...</p>
                </div>
            </div>
        </div>
    `;

    setupReviewInteractions(book.id);
    loadCommunityReviews(book.id);
    setupFavoriteLogic(book.id);
    setupScrollToReview();
    loadSynopsis(olId);
}

// ─── LÓGICA DE SINOPSIS (ANTI-DUPLICADOS + LEER MÁS) ───────────────────────
async function loadSynopsis(openLibraryId, isRetry = false) {
    const container = document.getElementById('synopsisContent');
    if (!openLibraryId) { container.innerHTML = '<p style="font-style: italic;">Sinopsis no disponible.</p>'; return; }

    try {
        const workId = openLibraryId.replace('/works/', '').replace('/books/', '');
        // Determina si es un Work (W) o una Edición Book (M)
        const type = openLibraryId.toUpperCase().endsWith('M') ? 'books' : 'works';

        const response = await fetch(`https://openlibrary.org/${type}/${workId}.json`);
        if (!response.ok) throw new Error('Error API');

        const data = await response.json();
        let rawDescription = data.description;

        if (!rawDescription) {
            container.innerHTML = '<p style="font-style: italic;">Sinopsis no disponible.</p>';
            return;
        }

        let textToClean = typeof rawDescription === 'string' ? rawDescription : rawDescription.value;

        // 🐝 MAGIA: Detector de Duplicados (Ej: "Duplicate of https://.../OL27241047M/...")
        if (textToClean.includes("Duplicate of") && !isRetry) {
            const matches = textToClean.match(/OL\d+[A-Z]/i);
            if (matches) {
                return loadSynopsis(matches[0], true);
            }
        }

        const cleanHtml = cleanSynopsisFormat(textToClean);

        // Inyectamos la estructura colapsable
        container.innerHTML = `
            <div id="synopsisWrapper" class="synopsis-wrapper">
                ${cleanHtml}
                <div id="synopsisFade" class="synopsis-fade"></div>
            </div>
            <button id="readMoreBtn" class="btn-read-more hidden">
                Leer más <i class="fas fa-chevron-down"></i>
            </button>
        `;

        const wrapper = document.getElementById('synopsisWrapper');
        const readMoreBtn = document.getElementById('readMoreBtn');
        const fade = document.getElementById('synopsisFade');

        setTimeout(() => {
            if (wrapper.scrollHeight > 180) {
                readMoreBtn.classList.remove('hidden');
                readMoreBtn.addEventListener('click', () => {
                    const isExpanded = wrapper.classList.toggle('expanded');
                    if (isExpanded) {
                        readMoreBtn.innerHTML = 'Leer menos <i class="fas fa-chevron-up"></i>';
                    } else {
                        readMoreBtn.innerHTML = 'Leer más <i class="fas fa-chevron-down"></i>';
                        document.querySelector('.book-synopsis-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            } else {
                fade.style.display = 'none';
            }
        }, 50);

    } catch (error) {
        container.innerHTML = '<p style="font-style: italic;">Sinopsis no disponible.</p>';
    }
}

function cleanSynopsisFormat(text) {
    let cleanText = text;
    cleanText = cleanText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    cleanText = cleanText.replace(/[-_]{3,}/g, '');
    cleanText = cleanText.replace(/\(contains spoilers\)/gi, '');
    const paragraphs = cleanText.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0).map(p => `<p style="margin-bottom: 1.2rem;">${p}</p>`);
    return paragraphs.join('');
}


// ─── LÓGICA COMUNIDAD Y BORRADO DE ADMIN ────────────────────────────────────
async function loadCommunityReviews(bookId) {
    const container = document.getElementById('communityReviewsList');
    if (!container) return;

    // 1. Obtenemos rol del usuario para el botón de admin
    const { data: { session } } = await supabaseClient.auth.getSession();
    let currentUserRole = 1;
    if (session) {
        try {
            const res = await fetch(`http://localhost:8080/api/profiles/${session.user.user_metadata.username}`);
            if(res.ok) {
                const myProfile = await res.json();
                currentUserRole = myProfile.roleId;
            }
        } catch(e){}
    }

    try {
        const response = await fetch(`http://localhost:8080/api/reviews/book/${encodeURIComponent(bookId)}`);
        if (!response.ok) throw new Error('No se pudieron cargar las reseñas.');

        const reviews = await response.json();

        if (reviews.length === 0) {
            container.innerHTML = '<p class="results-empty" style="padding: 2rem 0;">Aún no hay opiniones. ¡Sé la primera abeja en reseñar este libro!</p>';
            return;
        }

        container.innerHTML = '';

        reviews.forEach(review => {
            const date = new Date(review.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
            const starsHtml = Array.from({ length: 5 }, (_, i) => `<i class="fas fa-star" style="color: ${i < review.rating ? 'var(--honey)' : 'rgba(255,255,255,0.1)'}; font-size: 0.85rem;"></i>`).join('');
            const initial = review.username.charAt(0).toUpperCase();
            const avatarSrc = review.avatarUrl || `https://ui-avatars.com/api/?name=${initial}&background=1e2340&color=FFB800`;

            const reviewEl = document.createElement('div');
            reviewEl.className = 'feature-card';
            reviewEl.style.padding = '1.5rem';

            // 🐝 BOTÓN DE BORRADO DE ADMIN
            let adminBtn = '';
            if (currentUserRole === 2) {
                adminBtn = `
                    <button class="btn-danger" style="margin-top: 1rem; padding: 0.3rem 0.8rem; font-size: 0.8rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.4); color: var(--error); border-radius: var(--radius-pill); cursor: pointer;"
                            onclick="openAdminDeleteReview('${review.id}')">
                        <i class="fas fa-trash"></i> Eliminar (Admin)
                    </button>
                `;
            }

            reviewEl.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <img src="${avatarSrc}" alt="@${review.username}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid var(--navy-light); cursor: pointer;" onclick="window.location.href='userProfile.html?user=${encodeURIComponent(review.username)}'">
                        <div>
                            <div style="font-weight: 600; color: var(--text); cursor: pointer;" onclick="window.location.href='userProfile.html?user=${encodeURIComponent(review.username)}'">@${review.username}</div>
                            <div style="color: var(--text-muted); font-size: 0.8rem;">${date}</div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 2px;">${starsHtml}</div>
                </div>
                ${review.content ? `<p style="color: var(--text); line-height: 1.6; font-size: 0.95rem;">"${review.content}"</p>` : ''}
                ${adminBtn}
            `;
            container.appendChild(reviewEl);
        });
    } catch (error) {
        container.innerHTML = `<p class="error" style="color: var(--error);"><i class="fas fa-exclamation-triangle"></i> ${error.message}</p>`;
    }
}

// ─── FUNCIÓN GLOBAL DE BORRADO PARA EL ADMIN (CUMPLE REQUISITO TFG) ─────────
// ─── LÓGICA DE MODAL DE BORRADO DE ADMIN ────────────────────────────────────

let reviewIdToDelete = null; // Guardará el ID de la reseña temporalmente

window.openAdminDeleteReview = function(id) {
    reviewIdToDelete = id;
    document.getElementById('deleteReviewModal').classList.remove('hidden');
}

window.closeAdminDeleteReview = function() {
    reviewIdToDelete = null;
    document.getElementById('deleteReviewModal').classList.add('hidden');
}

// Configurar el botón de Ejecutar dentro del Modal
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar la carga del libro
    loadBookDetails();

    // Evento para el botón rojo de borrar reseña
    const confirmDeleteBtn = document.getElementById('confirmDeleteReviewBtn');
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener('click', async () => {
            if (!reviewIdToDelete) return;

            // Estado de carga en el botón
            confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';
            confirmDeleteBtn.disabled = true;

            try {
                const response = await fetch(`http://localhost:8080/api/reviews/${reviewIdToDelete}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    showReviewMsg(null, "Reseña eliminada correctamente", false);
                    setTimeout(() => location.reload(), 1000);
                } else {
                    const errorText = await response.text();
                    alert("No se pudo borrar: " + (errorText || "Error del servidor."));
                    closeAdminDeleteReview();
                    resetDeleteButton(confirmDeleteBtn);
                }
            } catch (e) {
                alert("Error de conexión. Asegúrate de que el Backend está encendido.");
                closeAdminDeleteReview();
                resetDeleteButton(confirmDeleteBtn);
            }
        });
    }
});

function resetDeleteButton(btn) {
    btn.innerHTML = '<i class="fas fa-trash"></i> Ejecutar';
    btn.disabled = false;
}
function setupReviewInteractions(bookId) {
    let selectedRating = 0;
    const stars = document.querySelectorAll('.star-btn');
    const submitBtn = document.getElementById('submitReviewBtn');
    const reviewText = document.getElementById('reviewText');
    const reviewMsg = document.getElementById('reviewMsg');

    stars.forEach(star => {
        star.addEventListener('mouseenter', () => { highlightStars(stars, parseInt(star.dataset.value)); });
        star.addEventListener('mouseleave', () => { highlightStars(stars, selectedRating); });
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.value);
            highlightStars(stars, selectedRating);
            updateSubmitBtn(submitBtn, selectedRating);
        });
    });

    reviewText.addEventListener('input', () => { updateSubmitBtn(submitBtn, selectedRating); });

    submitBtn.addEventListener('click', async () => {
        if (selectedRating === 0) { showReviewMsg(reviewMsg, 'Por favor, selecciona una puntuación antes de enviar.', true); return; }
        const text = reviewText.value.trim();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        reviewMsg.classList.add('hidden');

        try {
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) { window.location.href = 'login.html'; return; }
            const username = session.user.user_metadata?.username;
            const response = await fetch('http://localhost:8080/api/reviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, bookId: bookId, rating: selectedRating, content: text })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Error al guardar la reseña en la colmena.');
            }

            showReviewMsg(reviewMsg, '¡Reseña publicada con éxito en la colmena! 🐝', false);
            reviewText.value = ''; selectedRating = 0; highlightStars(stars, 0);
            loadCommunityReviews(bookId);
        } catch (error) {
            showReviewMsg(reviewMsg, error.message, true);
        } finally {
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar reseña';
            updateSubmitBtn(submitBtn, selectedRating);
        }
    });
}

function highlightStars(stars, upTo) { stars.forEach(star => { const val = parseInt(star.dataset.value); star.classList.toggle('active', val <= upTo); }); }
function updateSubmitBtn(btn, rating) { btn.disabled = rating === 0; }
function showReviewMsg(el, text, isError) {
    let container = document.getElementById('toastContainer');
    if (!container) { container = document.createElement('div'); container.id = 'toastContainer'; container.className = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    const icon = isError ? '<i class="fas fa-exclamation-circle" style="color: var(--error); font-size: 1.2rem;"></i>' : '<i class="fas fa-check-circle" style="color: var(--success); font-size: 1.2rem;"></i>';
    toast.innerHTML = `${icon} <span>${text}</span>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
}

function setupScrollToReview() {
    const btn = document.getElementById('scrollToReviewBtn');
    const section = document.getElementById('reviewSection');
    if (btn && section) { btn.addEventListener('click', () => { section.scrollIntoView({ behavior: 'smooth', block: 'start' }); }); }
}

function renderError(container, message) {
    container.innerHTML = `<div class="detail-error"><i class="fas fa-exclamation-circle"></i><h2>Algo ha fallado</h2><p>${message}</p><a href="index.html" class="btn-primary" style="margin-top: 1.5rem; display:inline-flex;"><i class="fas fa-home"></i> Volver al inicio</a></div>`;
}

function truncate(str, max) { return str.length > max ? str.slice(0, max) + '…' : str; }

async function setupFavoriteLogic(bookId) {
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (!favoriteBtn) return;
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { favoriteBtn.addEventListener('click', () => window.location.href = 'login.html'); return; }
    const username = session.user.user_metadata?.username;
    try {
        const checkRes = await fetch(`http://localhost:8080/api/favorites/check?username=${username}&bookId=${bookId}`);
        const isFav = await checkRes.json();
        updateFavoriteUI(favoriteBtn, isFav);
    } catch (e) { console.error("Error", e); }

    favoriteBtn.addEventListener('click', async () => {
        favoriteBtn.disabled = true;
        try {
            const response = await fetch('http://localhost:8080/api/favorites/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, bookId }) });
            const data = await response.json();
            updateFavoriteUI(favoriteBtn, data.isFavorite);
            showReviewMsg(null, data.isFavorite ? 'Añadido a tus favoritos 🍯' : 'Eliminado de favoritos', false);
        } catch (error) {
            showReviewMsg(null, 'No se pudo actualizar favoritos', true);
        } finally { favoriteBtn.disabled = false; }
    });
}
function updateFavoriteUI(btn, isFav) {
    const icon = btn.querySelector('i');
    if (isFav) { btn.classList.add('active'); icon.className = 'fas fa-heart'; btn.style.color = 'var(--honey)'; }
    else { btn.classList.remove('active'); icon.className = 'far fa-heart'; btn.style.color = 'var(--text-muted)'; }
}

document.addEventListener('DOMContentLoaded', loadBookDetails);