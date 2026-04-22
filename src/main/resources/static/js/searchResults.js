// searchResults.js

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const query  = params.get('q');

    if (!query) {
        window.location.href = 'index.html';
        return;
    }

    // Muestra la query en el título y rellena el input de refinado
    document.title = `"${query}" — BeeRead`;
    document.getElementById('searchQueryText').textContent = `"${query}"`;
    document.getElementById('refineInput').value = query;

    // Formulario de refinado: redirige igual que el de la landing
    document.getElementById('refineForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const newQuery = document.getElementById('refineInput').value.trim();
        if (newQuery) {
            window.location.href = `searchResults.html?q=${encodeURIComponent(newQuery)}`;
        }
    });

    fetchBooks(query);
});

// ─── Fetch + render ────────────────────────────────────────────────────────

async function fetchBooks(query) {
    const container = document.getElementById('searchResults');

    renderSkeletons(container, 10);

    try {
        const response = await fetch(`http://localhost:8080/api/books/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Error del servidor');

        const books = await response.json();
        container.innerHTML = '';

        if (books.length === 0) {
            renderEmpty(container, query);
            return;
        }

        showResultsCount(books.length, query);

        books.forEach(book => {
            container.appendChild(createBookCard(book));
        });

    } catch (error) {
        container.innerHTML = '';
        renderError(container);
        console.error('Error al buscar libros:', error);
    }
}

// ─── Crear tarjeta ─────────────────────────────────────────────────────────

function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';

    card.innerHTML = `
        <img
            src="${book.coverUrl}"
            alt="Portada de ${book.title}"
            class="book-cover"
            loading="lazy"
            onerror="this.style.background='var(--navy-light)'; this.removeAttribute('src');"
        >
        <div class="book-info">
            <div class="book-title" title="${book.title}">${book.title}</div>
            <div class="book-author" title="${book.author}">${book.author}</div>
            ${book.firstPublishYear
                ? `<div class="book-year">${book.firstPublishYear}</div>`
                : ''}
        </div>
    `;

    card.addEventListener('click', () => saveAndNavigate(book, card));

    return card;
}

// ─── Guardar y navegar al detalle ──────────────────────────────────────────

async function saveAndNavigate(book, card) {
    // Feedback visual inmediato en la tarjeta
    card.style.opacity = '0.6';
    card.style.pointerEvents = 'none';

    try {
        const response = await fetch('http://localhost:8080/api/books/save', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(book)
        });

        if (response.ok) {
            const savedBook = await response.json();
            window.location.href = `bookDetail.html?id=${encodeURIComponent(savedBook.id)}`;
        } else {
            throw new Error('Error al guardar');
        }
    } catch (error) {
        console.error('Error al guardar el libro:', error);
        card.style.opacity      = '1';
        card.style.pointerEvents = 'auto';
    }
}

// ─── Estado: skeletons ─────────────────────────────────────────────────────

function renderSkeletons(container, count) {
    container.innerHTML = Array.from({ length: count }, () => `
        <div class="book-card book-card--skeleton">
            <div class="skeleton book-cover-skeleton"></div>
            <div class="book-info">
                <div class="skeleton" style="height:.9rem; width:80%; margin-bottom:.5rem; border-radius:6px;"></div>
                <div class="skeleton" style="height:.75rem; width:55%; border-radius:6px;"></div>
            </div>
        </div>
    `).join('');
}

// ─── Estado: sin resultados ────────────────────────────────────────────────

function renderEmpty(container, query) {
    container.innerHTML = `
        <div class="results-empty">
            <span class="results-empty-icon">🔍</span>
            <h2>Sin resultados para "${query}"</h2>
            <p>Prueba con el título completo, el nombre del autor o un género literario.</p>
        </div>
    `;
}

// ─── Estado: error de red ──────────────────────────────────────────────────

function renderError(container) {
    container.innerHTML = `
        <div class="results-empty">
            <span class="results-empty-icon">⚠️</span>
            <h2>No hemos podido conectar</h2>
            <p>Comprueba que el backend está corriendo e inténtalo de nuevo.</p>
            <button class="btn-secondary" onclick="window.location.reload()" style="margin-top:1.5rem;">
                <i class="fas fa-redo"></i> Reintentar
            </button>
        </div>
    `;
}

// ─── Contador de resultados ────────────────────────────────────────────────

function showResultsCount(count, query) {
    const el = document.getElementById('resultsCount');
    if (!el) return;
    el.textContent = `${count} libro${count !== 1 ? 's' : ''} encontrado${count !== 1 ? 's' : ''}`;
    el.classList.remove('hidden');
}