// bookDetail.js

async function loadBookDetails() {
    const params    = new URLSearchParams(window.location.search);
    const bookId    = params.get('id');
    const container = document.getElementById('bookDetailContainer');

    if (!bookId) {
        renderError(container, 'No se ha especificado ningún libro.');
        return;
    }

    try {
        const response = await fetch(`http://localhost:8080/api/books/${encodeURIComponent(bookId)}`);
        if (!response.ok) throw new Error('Este libro no está en la colmena todavía.');

        const book = await response.json();
        renderBook(container, book);

    } catch (error) {
        renderError(container, error.message);
    }
}

// ─── Render principal ──────────────────────────────────────────────────────

function renderBook(container, book) {
    const year = book.firstPublishYear || null;

    // Actualizamos el título de la pestaña
    document.title = `${book.title} — BeeRead`;

    container.innerHTML = `

        <!-- Breadcrumb -->
        <nav class="breadcrumb" aria-label="Navegación">
            <a href="index.html"><i class="fas fa-home"></i> Inicio</a>
            <i class="fas fa-chevron-right"></i>
            <a href="index.html#buscar">Búsqueda</a>
            <i class="fas fa-chevron-right"></i>
            <span>${truncate(book.title, 40)}</span>
        </nav>

        <!-- Layout portada + info -->
        <div class="book-detail-layout">

            <!-- Columna izquierda: portada y botones -->
            <div class="book-detail-cover-col">
                <img
                    src="${book.coverUrl}"
                    alt="Portada de ${book.title}"
                    class="book-detail-cover"
                    onerror="this.src='https://via.placeholder.com/300x450/1e2340/FFB800?text=Sin+Portada'"
                >
                <div class="book-detail-actions">
                    <button class="btn-primary" onclick="window.history.back()">
                        <i class="fas fa-arrow-left"></i> Volver
                    </button>
                    <button class="btn-secondary" id="scrollToReviewBtn">
                        <i class="fas fa-star"></i> Reseñar
                    </button>
                </div>
            </div>

            <!-- Columna derecha: información -->
            <div class="book-detail-info">

                <!-- Título y autor -->
                <div>
                    <h1 class="book-detail-title">${book.title}</h1>
                    <p class="book-detail-author">
                        <i class="fas fa-pen-nib"></i>
                        ${book.author}
                    </p>
                </div>

                <!-- Chips de metadatos -->
                <div class="book-meta-chips">
                    ${year ? `
                    <span class="meta-chip">
                        <i class="fas fa-calendar-alt"></i> ${year}
                    </span>` : ''}
                    <span class="meta-chip">
                        <i class="fas fa-fingerprint"></i> ${book.id}
                    </span>
                    <span class="meta-chip">
                        <i class="fas fa-database"></i> Open Library
                    </span>
                </div>

                <div class="book-detail-divider"></div>

                <!-- Formulario de reseña -->
                <div class="review-section" id="reviewSection">
                    <h2 class="review-section-title">
                        <i class="fas fa-star"></i> Tu valoración
                    </h2>

                    <div class="star-rating" id="starRating" role="group" aria-label="Puntuación del libro">
                        ${[1,2,3,4,5].map(n => `
                        <button
                            class="star-btn"
                            data-value="${n}"
                            aria-label="${n} estrella${n > 1 ? 's' : ''}"
                            title="${n} estrella${n > 1 ? 's' : ''}"
                        >★</button>`).join('')}
                    </div>

                    <textarea
                        class="review-textarea"
                        id="reviewText"
                        placeholder="Cuéntanos qué te ha parecido… ¿lo recomendarías?"
                        maxlength="1000"
                    ></textarea>

                    <button class="btn-primary" id="submitReviewBtn" disabled>
                        <i class="fas fa-paper-plane"></i> Enviar reseña
                    </button>

                    <div id="reviewMsg" class="hidden"></div>
                </div>

            </div>
        </div>
    `;

    setupReviewInteractions();
    setupScrollToReview();
}

// ─── Lógica de reseña ──────────────────────────────────────────────────────

function setupReviewInteractions() {
    let selectedRating = 0;

    const stars      = document.querySelectorAll('.star-btn');
    const submitBtn  = document.getElementById('submitReviewBtn');
    const reviewText = document.getElementById('reviewText');
    const reviewMsg  = document.getElementById('reviewMsg');

    // Hover: ilumina hasta la estrella apuntada
    stars.forEach(star => {
        star.addEventListener('mouseenter', () => {
            const val = parseInt(star.dataset.value);
            highlightStars(stars, val);
        });

        star.addEventListener('mouseleave', () => {
            highlightStars(stars, selectedRating);
        });

        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.value);
            highlightStars(stars, selectedRating);
            updateSubmitBtn(submitBtn, selectedRating);
        });
    });

    // El textarea también desbloquea el botón si hay rating
    reviewText.addEventListener('input', () => {
        updateSubmitBtn(submitBtn, selectedRating);
    });

    submitBtn.addEventListener('click', () => {
        const text = reviewText.value.trim();

        // Por ahora solo mostramos confirmación (sin endpoint de reseñas todavía)
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando…';

        setTimeout(() => {
            showReviewMsg(reviewMsg, '¡Reseña enviada! Gracias por contribuir a la colmena 🐝', false);
            reviewText.value   = '';
            selectedRating     = 0;
            highlightStars(stars, 0);
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar reseña';
            submitBtn.disabled  = true;
        }, 800);
    });
}

function highlightStars(stars, upTo) {
    stars.forEach(star => {
        const val = parseInt(star.dataset.value);
        star.classList.toggle('active', val <= upTo);
    });
}

function updateSubmitBtn(btn, rating) {
    btn.disabled = rating === 0;
}

function showReviewMsg(el, text, isError) {
    el.textContent = text;
    el.className   = isError ? 'error' : 'success';
    el.classList.remove('hidden');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function setupScrollToReview() {
    const btn     = document.getElementById('scrollToReviewBtn');
    const section = document.getElementById('reviewSection');
    if (btn && section) {
        btn.addEventListener('click', () => {
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }
}

// ─── Estado de error ───────────────────────────────────────────────────────

function renderError(container, message) {
    container.innerHTML = `
        <div class="detail-error">
            <i class="fas fa-exclamation-circle"></i>
            <h2>Algo ha fallado</h2>
            <p>${message}</p>
            <a href="index.html" class="btn-primary" style="margin-top: 1.5rem; display:inline-flex;">
                <i class="fas fa-home"></i> Volver al inicio
            </a>
        </div>
    `;
}

// ─── Utilidades ────────────────────────────────────────────────────────────

function truncate(str, max) {
    return str.length > max ? str.slice(0, max) + '…' : str;
}

// ─── Init ──────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', loadBookDetails);