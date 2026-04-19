const SUPABASE_URL = 'https://iuurusyeqspnkdxsnwio.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dXJ1c3llcXNwbmtkeHNud2lvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY1NjU0NzcsImV4cCI6MjA5MjE0MTQ3N30.LHb-kv22OVZT967UNB9DVbcGldgzWz4-fIqstMO1zYs';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Referencias a los elementos del DOM
const loginSection    = document.getElementById('loginSection');
const registerSection = document.getElementById('registerSection');
const messageBox      = document.getElementById('messageBox');

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

const searchForm = document.getElementById('searchForm');
if (searchForm) {
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const query            = document.getElementById('searchInput').value.trim();
        const resultsContainer = document.getElementById('searchResults');

        if (!query) return;

        resultsContainer.innerHTML = '<p>Buscando libros, dame un momento… 🐝</p>';

        try {
            const response = await fetch(`http://localhost:8080/api/books/search?query=${encodeURIComponent(query)}`);
            const books    = await response.json();

            resultsContainer.innerHTML = '';

            if (books.length === 0) {
                resultsContainer.innerHTML = '<p>No hemos encontrado nada con ese nombre. Prueba con otro término.</p>';
                return;
            }

            books.forEach(book => {
                const card = document.createElement('div');
                card.className = 'book-card';

                card.innerHTML = `
                    <img
                        src="${book.coverUrl}"
                        alt="Portada de ${book.title}"
                        class="book-cover"
                        loading="lazy"
                        onerror="this.style.background='var(--navy-light)'"
                    >
                    <div class="book-info">
                        <div class="book-title" title="${book.title}">${book.title}</div>
                        <div class="book-author" title="${book.author}">${book.author}</div>
                        ${book.firstPublishYear
                            ? `<div class="book-year">${book.firstPublishYear}</div>`
                            : ''}
                    </div>
                `;

                card.addEventListener('click', async () => {
                    try {
                        const saveResponse = await fetch('http://localhost:8080/api/books/save', {
                            method:  'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body:    JSON.stringify(book)
                        });

                        if (saveResponse.ok) {
                            alert(`"${book.title}" añadido a la base de datos!`);
                        } else {
                            alert('Error al guardar el libro.');
                        }
                    } catch (err) {
                        console.error('Error en la petición:', err);
                    }
                });

                resultsContainer.appendChild(card);
            });

        } catch (error) {
            resultsContainer.innerHTML = '<p>Algo ha fallado al conectar con el servidor. ¿Está el backend corriendo?</p>';
            console.error(error);
        }
    });
}
