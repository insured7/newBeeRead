// header.js

async function loadHeader() {
    const headerContainer = document.getElementById('main-header');
    if (!headerContainer) return;

    const { data: { session } } = await supabaseClient.auth.getSession();

    // ── Controles de usuario ────────────────────────────────
    let userControlsHtml = '';

    if (session) {
        const username = session.user.user_metadata?.username || 'Lector';
        let adminBadge = '';
        let adminLink = '';

        // 🐝 NUEVO: Consultamos a la base de datos si eres ADMIN
        try {
            const res = await fetch(`http://localhost:8080/api/profiles/${username}`);
            if (res.ok) {
                const profile = await res.json();
                if (profile.roleId === 2) { // ERES ADMIN
                    adminBadge = `<span class="admin-badge"><i class="fas fa-crown"></i> ADMIN</span>`;
                    adminLink = `
                        <a href="admin.html" class="nav-user" style="text-decoration: none; color: var(--honey); font-weight: bold; margin-right: 1rem; border: 1px solid var(--honey); padding: 0.3rem 0.8rem; border-radius: 20px;">
                            <i class="fas fa-tools"></i> Panel Admin
                        </a>`;
                }
            }
        } catch (e) { console.error("No se pudo cargar el rol del usuario", e); }

        userControlsHtml = `
            ${adminLink}
            <a href="profile.html" class="nav-user" style="text-decoration: none; cursor: pointer; transition: opacity 0.2s;" onmouseover="this.style.opacity=0.8" onmouseout="this.style.opacity=1" title="Ir a mi perfil">
                <i class="fas fa-user-circle"></i>
                <span class="nav-username">${username}</span> ${adminBadge}
            </a>
            <button id="logoutBtn" class="btn-secondary" style="margin-left: 1rem;">
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
    const currentQuery = new URLSearchParams(window.location.search).get('q') || '';

    headerContainer.innerHTML = `
        <nav class="navbar" id="mainNavbar">
            <div class="nav-container">
                <a href="index.html" class="logo">
                    <i class="fas fa-book-reader"></i> BeeRead
                </a>
                <form class="${navSearchClass}" id="navSearchForm" role="search">
                    <i class="fas fa-search nav-search-icon" aria-hidden="true"></i>
                    <input type="search" class="nav-search-input" id="navSearchInput" placeholder="Buscar un libro…" autocomplete="off" value="${currentQuery}">
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
        document.getElementById('loginBtn')?.addEventListener('click', () => { window.location.href = 'login.html'; });
        document.getElementById('registerBtn')?.addEventListener('click', () => { window.location.href = 'login.html#register'; });
    }
}

// ── Búsqueda en el nav ───────────────────────────────────────────────────
function setupNavSearch(isLanding) {
    const form  = document.getElementById('navSearchForm');
    const input = document.getElementById('navSearchInput');
    if (!form || !input) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const q = input.value.trim();
        if (q) window.location.href = `searchResults.html?q=${encodeURIComponent(q)}`;
    });

    if (isLanding) {
        const heroSection = document.querySelector('.hero');
        const observer = new IntersectionObserver(([entry]) => { form.classList.toggle('nav-search--hidden', entry.isIntersecting); }, { threshold: 0.15 });
        if (heroSection) observer.observe(heroSection);
    }
}

loadHeader();