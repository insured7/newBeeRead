document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const query  = params.get('q');

    if (!query) {
        window.location.href = 'index.html';
        return;
    }

    // Muestra la query en el título y rellena el input
    document.title = `"${query}" — BeeRead`;
    document.getElementById('searchQueryText').textContent = `"${query}"`;
    document.getElementById('refineInput').value = query;

    // Formulario de refinado
    document.getElementById('refineForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const newQuery = document.getElementById('refineInput').value.trim();
        if (newQuery) {
            window.location.href = `searchResults.html?q=${encodeURIComponent(newQuery)}`;
        }
    });

    // Lógica de Pestañas (Tabs)
    setupTabs();

    // Lanzar ambas búsquedas en paralelo
    fetchBooks(query);
    fetchUsers(query);
});

// ─── Lógica de Pestañas ────────────────────────────────────────────────────

function setupTabs() {
    const tabBooks = document.getElementById('tabBooks');
    const tabUsers = document.getElementById('tabUsers');
    const booksContainer = document.getElementById('searchResults');
    const usersContainer = document.getElementById('userResults');

    tabBooks.addEventListener('click', () => {
        // Activar pestaña Libros
        tabBooks.classList.add('active');
        tabUsers.classList.remove('active');
        // Mostrar contenedor Libros
        booksContainer.classList.remove('hidden');
        usersContainer.classList.add('hidden');
    });

    tabUsers.addEventListener('click', () => {
        // Activar pestaña Usuarios
        tabUsers.classList.add('active');
        tabBooks.classList.remove('active');
        // Mostrar contenedor Usuarios
        usersContainer.classList.remove('hidden');
        booksContainer.classList.add('hidden');
    });
}

// ─── Fetch + render Libros ─────────────────────────────────────────────────

async function fetchBooks(query) {
    const container = document.getElementById('searchResults');
    const countBadge = document.getElementById('countBooks');

    renderSkeletons(container, 10);

    try {
        const response = await fetch(`/api/books/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Error del servidor');

        const books = await response.json();
        container.innerHTML = '';

        // Actualizar contador
        countBadge.textContent = books.length;

        if (books.length === 0) {
            renderEmpty(container, query, 'libros');
            return;
        }

        books.forEach(book => {
            container.appendChild(createBookCard(book));
        });

    } catch (error) {
        container.innerHTML = '';
        renderError(container);
        countBadge.textContent = "0";
    }
}

// ─── Fetch + render Usuarios ───────────────────────────────────────────────

async function fetchUsers(query) {
    const container = document.getElementById('userResults');
    const countBadge = document.getElementById('countUsers');

    // Reutilizamos la función de skeletons o creamos una simple para usuarios
    container.innerHTML = Array.from({ length: 4 }, () => `
        <div class="user-card" style="pointer-events: none;">
            <div class="skeleton" style="width: 60px; height: 60px; border-radius: 50%;"></div>
            <div style="flex: 1;">
                <div class="skeleton" style="height: 1rem; width: 60%; margin-bottom: 0.5rem; border-radius: 4px;"></div>
                <div class="skeleton" style="height: 0.8rem; width: 40%; border-radius: 4px;"></div>
            </div>
        </div>
    `).join('');

    try {
        // Asume que tienes este endpoint en el backend
        const response = await fetch(`/api/profiles/search?query=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error('Error del servidor');

        const users = await response.json();
        container.innerHTML = '';

        // Actualizar contador
        countBadge.textContent = users.length;

        if (users.length === 0) {
            renderEmpty(container, query, 'usuarios');
            return;
        }

        users.forEach(user => {
            const card = document.createElement('div');
            card.className = 'user-card';

            const avatarUrl = user.avatarUrl || `https://ui-avatars.com/api/?name=${user.username.charAt(0)}&background=1e2340&color=FFB800`;

            card.innerHTML = `
                <img src="${avatarUrl}" alt="Avatar">
                <div class="user-card-info">
                    <div class="user-card-name">${user.fullName || user.username}</div>
                    <div class="user-card-username">@${user.username}</div>
                </div>
            `;

            // Navegar al perfil público al hacer clic
            card.addEventListener('click', () => {
                window.location.href = `userProfile.html?user=${encodeURIComponent(user.username)}`;
            });

            container.appendChild(card);
        });

    } catch (error) {
        container.innerHTML = '';
        renderError(container);
        countBadge.textContent = "0";
    }
}

// ─── Crear tarjeta Libro ───────────────────────────────

function createBookCard(book) {
    const card = document.createElement('div');
    card.className = 'book-card';

    // SVG codificado de forma 100% segura (sin comillas simples que rompan el HTML)
    const fallbackImg = "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22220%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e2340%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-weight=%22bold%22 fill=%22%23FFB800%22%3ESin Portada%3C/text%3E%3C/svg%3E";

    card.innerHTML = `
        <img
            src="${book.coverUrl || fallbackImg}"
            alt="Portada de ${book.title}"
            class="book-cover"
            loading="lazy"
            onerror="this.onerror=null; this.src='${fallbackImg}';"
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

// ─── Guardar y navegar al detalle (se mantiene igual) ──────────────────────

async function saveAndNavigate(book, card) {
    card.style.opacity = '0.6';
    card.style.pointerEvents = 'none';

    try {
        const response = await fetch('/api/books/save', {
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

function renderEmpty(container, query, tipo) {
    container.innerHTML = `
        <div class="results-empty" style="grid-column: 1 / -1;">
            <span class="results-empty-icon">${tipo === 'libros' ? '📚' : '🐝'}</span>
            <h2>Sin resultados para "${query}"</h2>
            <p>No hemos encontrado ${tipo} con ese nombre en la colmena.</p>
        </div>
    `;
}

// ─── Estado: error de red ──────────────────────────────────────────────────

function renderError(container) {
    container.innerHTML = `
        <div class="results-empty" style="grid-column: 1 / -1;">
            <span class="results-empty-icon">⚠️</span>
            <h2>No hemos podido conectar</h2>
            <p>Comprueba que el backend está corriendo e inténtalo de nuevo.</p>
            <button class="btn-secondary" onclick="window.location.reload()" style="margin-top:1.5rem;">
                <i class="fas fa-redo"></i> Reintentar
            </button>
        </div>
    `;
}