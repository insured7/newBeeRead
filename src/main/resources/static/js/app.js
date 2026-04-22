const SUPABASE_URL = 'https://iuurusyeqspnkdxsnwio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dXJ1c3llcXNwbmtkeHNud2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NjU0NzcsImV4cCI6MjA5MjE0MTQ3N30.LHb-kv22OVZT967UNB9DVbcGldgzWz4-fIqstMO1zYs';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Referencias a los elementos del DOM
const loginSection    = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const messageBox      = document.getElementById('messageBox');


// Función para cargar los libros destacados en la página principal
async function loadFeaturedBooks() {
    const container = document.getElementById('featuredBooksContainer');
    if (!container) return; // Si no estamos en index.html, no hace nada

    try {
        const response = await fetch('http://localhost:8080/api/books/featured');
        if (!response.ok) throw new Error('No se pudieron cargar los destacados');

        const books = await response.json();

        if (books.length === 0) {
            container.innerHTML = '<p style="color: var(--text-gray);">La colmena aún está vacía. ¡Busca un libro y sé el primero en guardarlo!</p>';
            return;
        }

        container.innerHTML = '';

        books.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            card.innerHTML = `
                <img src="${book.coverUrl}" alt="${book.title}" class="book-cover">
                <div class="book-info">
                    <div class="book-title" title="${book.title}">${book.title}</div>
                    <div class="book-author">${book.author}</div>
                </div>
            `;

            // Redirige al detalle al hacer clic
            card.addEventListener('click', () => {
                window.location.href = `bookDetail.html?id=${encodeURIComponent(book.id)}`;
            });

            container.appendChild(card);
        });

    } catch (error) {
        container.innerHTML = '<p class="error">Aún no hay abejas trabajando en esta sección.</p>';
        console.error(error);
    }
}

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', loadFeaturedBooks);

// Muestra mensajes de error o éxito en pantalla
function showMessage(text, isError = false) {
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.className   = isError ? 'error' : 'success';
    messageBox.classList.remove('hidden');
}

function hideMessage() {
    if (messageBox) messageBox.classList.add('hidden');
}

// ==========================================
// LÓGICA DE LA VISTA DE AUTENTICACIÓN
// ==========================================

const showRegisterBtn = document.getElementById('showRegister');
const showLoginBtn    = document.getElementById('showLogin');

if (showRegisterBtn && showLoginBtn && loginSection && registerSection) {
    showRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loginSection.classList.add('hidden');
        registerSection.classList.remove('hidden');
        hideMessage();
    });

    showLoginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        registerSection.classList.add('hidden');
        loginSection.classList.remove('hidden');
        hideMessage();
    });

    if (window.location.hash === '#register') {
        loginSection.classList.add('hidden');
        registerSection.classList.remove('hidden');
    }
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email    = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const username = document.getElementById('registerUsername').value;

        const btn = registerForm.querySelector('.btn-submit');
        btn.disabled = true;
        btn.textContent = 'Creando cuenta…';

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: { data: { username, full_name: '', avatar_url: '' } }
            });

            if (error) throw error;

            showMessage('¡Registro exitoso! Ya puedes iniciar sesión.');
            registerSection.classList.add('hidden');
            loginSection.classList.remove('hidden');
            registerForm.reset();
        } catch (error) {
            showMessage('Error al registrar: ' + error.message, true);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Crear mi cuenta <i class="fas fa-arrow-right"></i>';
        }
    });
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email    = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        const btn = loginForm.querySelector('.btn-submit');
        btn.disabled = true;
        btn.textContent = 'Entrando…';

        try {
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
            if (error) throw error;
            window.location.href = 'index.html';
        } catch (error) {
            showMessage('Correo o contraseña incorrectos', true);
            btn.disabled = false;
            btn.innerHTML = 'Entrar <i class="fas fa-arrow-right"></i>';
        }
    });
}


// ==========================================
// LÓGICA DE LA VISTA PRINCIPAL (BÚSQUEDA)
// ==========================================

// En app.js, sustituye el listener del searchForm por este:
const searchForm = document.getElementById('searchForm');
if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('searchInput').value;
        window.location.href = `searchResults.html?q=${encodeURIComponent(query)}`;
    });
}
