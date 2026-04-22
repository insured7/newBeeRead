// header.js

async function loadHeader() {
    const headerContainer = document.getElementById('main-header');
    if (!headerContainer) return;

    const { data: { session } } = await supabaseClient.auth.getSession();

    // ── Controles de usuario ────────────────────────────────
    let userControlsHtml = '';

    if (session) {
        const username = session.user.user_metadata?.username || 'Lector';
        userControlsHtml = `
            <span class="nav-user">
                <i class="fas fa-user-circle"></i>
                <span class="nav-username">${username}</span>
            </span>
            <button id="logoutBtn" class="btn-secondary">
                <i class="fas fa-sign-out-alt"></i>
                <span class="btn-label">Salir</span>
            </button>
        `;
    } else {
        userControlsHtml = `
            <button id="loginBtn" class="btn-secondary">Iniciar sesión</button>
            <button id="registerBtn" class="btn-primary">
                <i class="fas fa-user-plus"></i>
                <span class="btn-label">Registrarse</span>
            </button>
        `;
    }

    // ── Detecta si estamos en la landing para ocultar el search al inicio ──
    const isLanding = window.location.pathname.endsWith('index.html')
                   || window.location.pathname === '/'
                   || window.location.pathname.endsWith('/');

    const navSearchClass = isLanding ? 'nav-search nav-search--hidden' : 'nav-search';

    // ── Recupera la query actual para rellenar el input (en páginas de búsqueda) ──
    const currentQuery = new URLSearchParams(window.location.search).get('q') || '';

    headerContainer.innerHTML = `
        <nav class="navbar" id="mainNavbar">
            <div class="nav-container">

                <a href="index.html" class="logo">
                    <i class="fas fa-book-reader"></i>
                    BeeRead
                </a>

                <form class="${navSearchClass}" id="navSearchForm" role="search">
                    <i class="fas fa-search nav-search-icon" aria-hidden="true"></i>
                    <input
                        type="search"
                        class="nav-search-input"
                        id="navSearchInput"
                        placeholder="Buscar un libro…"
                        autocomplete="off"
                        aria-label="Buscar libros"
                        value="${currentQuery}"
                    >
                </form>

                <div class="nav-links">
                    ${userControlsHtml}
                </div>

            </div>
        </nav>
    `;

    setupHeaderEvents(session);
    setupNavSearch(isLanding);
}

// ── Eventos del header ───────────────────────────────────────────────────

function setupHeaderEvents(session) {
    if (session) {
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    } else {
        document.getElementById('loginBtn')?.addEventListener('click', () => {
            window.location.href = 'login.html';
        });
        document.getElementById('registerBtn')?.addEventListener('click', () => {
            window.location.href = 'login.html#register';
        });
    }
}

// ── Búsqueda en el nav ───────────────────────────────────────────────────

function setupNavSearch(isLanding) {
    const form  = document.getElementById('navSearchForm');
    const input = document.getElementById('navSearchInput');

    if (!form || !input) return;

    // Submit → ir a searchResults
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = input.value.trim();
        if (q) {
            window.location.href = `searchResults.html?q=${encodeURIComponent(q)}`;
        }
    });

    // En la landing: mostrar el search al pasar el hero con scroll
    if (isLanding) {
        const heroSection = document.querySelector('.hero');

        const observer = new IntersectionObserver(
            ([entry]) => {
                // Si el hero ya no es visible → mostrar el nav search
                form.classList.toggle('nav-search--hidden', entry.isIntersecting);
            },
            { threshold: 0.15 }
        );

        if (heroSection) {
            observer.observe(heroSection);
        }
    }
}

loadHeader();