// header.js

async function loadHeader() {
    const headerContainer = document.getElementById('main-header');
    if (!headerContainer) return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    let userControlsHtml = '';

    if (session) {
        const username = session.user.user_metadata.username || 'Lector';
        userControlsHtml = `
            <span style="color: var(--primary-color); font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                <i class="fas fa-user-circle"></i> ${username}
            </span>
            <button id="logoutBtn" class="btn-secondary">
                <i class="fas fa-sign-out-alt"></i> Salir
            </button>
        `;
    } else {
        userControlsHtml = `
            <button id="loginBtn" class="btn-secondary">Iniciar Sesión</button>
            <button id="registerBtn" class="btn-primary"><i class="fas fa-user-plus"></i> Registrarse</button>
        `;
    }

    headerContainer.innerHTML = `
        <nav class="navbar">
            <div class="nav-container">
                <a href="index.html" class="logo">
                    <i class="fas fa-book-reader"></i>
                    BeeRead
                </a>
                <div class="nav-links">
                    ${userControlsHtml}
                </div>
            </div>
        </nav>
    `;

    setupHeaderEvents(session);
}

function setupHeaderEvents(session) {
    if (session) {
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'index.html';
        });
    } else {
        document.getElementById('loginBtn').addEventListener('click', () => {
            window.location.href = 'login.html';
        });
        document.getElementById('registerBtn').addEventListener('click', () => {
            window.location.href = 'login.html#register';
        });
    }
}

loadHeader();