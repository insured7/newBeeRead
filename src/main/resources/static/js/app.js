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
    if (!container) return;

    try {
        const response = await fetch('/api/books/featured');
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

document.addEventListener('DOMContentLoaded', loadFeaturedBooks);

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

// ==========================================
// REGISTRO CON CONFIRMACIÓN DE EMAIL
// ==========================================
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email    = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const username = document.getElementById('registerUsername').value;

        const btn = registerForm.querySelector('.btn-submit');
        btn.disabled = true;
        btn.textContent = 'Enviando…';

        try {
            const { data, error } = await supabaseClient.auth.signUp({
                email,
                password,
                options: {
                    data: { username, full_name: '', avatar_url: '' }
                }
            });

            if (error) throw error;

            // Éxito: mostrar mensaje de confirmación
            showMessage(
                '✅ Te hemos enviado un correo de confirmación. Revisa tu bandeja de entrada (y la carpeta de spam). Podrás iniciar sesión después de confirmar tu cuenta.',
                false
            );

            // Limpiar formulario y cambiar a la vista de login (opcional)
            registerForm.reset();
            registerSection.classList.add('hidden');
            loginSection.classList.remove('hidden');

        } catch (error) {
            let mensajeError = 'Error al registrar: ';
            if (error.message.includes('User already registered')) {
                mensajeError += 'Este correo ya está registrado. ¿Quieres iniciar sesión?';
            } else if (error.message.includes('Password should be at least 6 characters')) {
                mensajeError += 'La contraseña debe tener al menos 6 caracteres.';
            } else {
                mensajeError += error.message;
            }
            showMessage(mensajeError, true);
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'Crear mi cuenta <i class="fas fa-arrow-right"></i>';
        }
    });
}

// ==========================================
// LOGIN CON MANEJO DE EMAIL NO CONFIRMADO
// ==========================================
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

            // Verificar si el email está confirmado (por si acaso, aunque Supabase ya lo impide)
            if (!data.user.email_confirmed_at) {
                showMessage('Tu correo aún no ha sido confirmado. Revisa tu bandeja y haz clic en el enlace de confirmación.', true);
                btn.disabled = false;
                btn.innerHTML = 'Entrar <i class="fas fa-arrow-right"></i>';
                return;
            }

            // Obtener role_id desde profiles
            const { data: profileData, error: profileError } = await supabaseClient
                .from('profiles')
                .select('role_id')
                .eq('id', data.user.id)
                .single();

            if (profileData && profileData.role_id === 2) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'profile.html';
            }
        } catch (error) {
            let mensaje = 'Correo o contraseña incorrectos';
            if (error.message.includes('Email not confirmed')) {
                mensaje = 'Tu correo aún no ha sido confirmado. Revisa tu bandeja y haz clic en el enlace de confirmación.';
            }
            showMessage(mensaje, true);
            btn.disabled = false;
            btn.innerHTML = 'Entrar <i class="fas fa-arrow-right"></i>';
        }
    });
}

// ==========================================
// RECUPERACIÓN DE CONTRASEÑA (SEGURA)
// ==========================================
async function solicitarRecuperacion(emailDelUsuario) {
    // Mostramos un mensaje neutro que no revela si el email existe o no
    showMessage("Si el correo electrónico está registrado, recibirás instrucciones para restablecer tu contraseña. Revisa tu bandeja de entrada (y la carpeta de spam).");

    // Llamamos a Supabase, pero ignoramos el resultado para no dar pistas
    const { error } = await supabaseClient.auth.resetPasswordForEmail(emailDelUsuario, {
        redirectTo: window.location.origin + '/update-password.html',
    });

    // Solo registramos el error en consola para depuración (no se muestra al usuario)
    if (error) {
        console.error("Error al enviar correo de recuperación:", error.message);
    }
}

// Capturar el enlace "¿Olvidaste tu contraseña?"
const forgotLink = document.getElementById('forgotPasswordLink');
if (forgotLink) {
    forgotLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('loginEmail');
        const email = emailInput ? emailInput.value.trim() : '';

        // Validación básica de campo vacío
        if (!email) {
            showMessage('Introduce tu correo electrónico.', true);
            return;
        }

        // Validación de formato de email (opcional pero ayuda al usuario)
        const emailRegex = /^[^\s@]+@([^\s@.,]+\.)+[^\s@.,]{2,}$/;
        if (!emailRegex.test(email)) {
            showMessage('El formato del correo no es válido.', true);
            return;
        }

        await solicitarRecuperacion(email);
    });
}

// ==========================================
// LÓGICA DE LA VISTA PRINCIPAL (BÚSQUEDA)
// ==========================================

const searchForm = document.getElementById('searchForm');
if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const query = document.getElementById('searchInput').value;
        window.location.href = `searchResults.html?q=${encodeURIComponent(query)}`;
    });
}

// Cargar actividad reciente en la landing
async function loadLatestActivity() {
    const container = document.getElementById('latestReviewsContainer');
    if (!container) return;

    try {
        const response = await fetch('/api/reviews/latest?limit=6');
        if (!response.ok) throw new Error('Error al cargar actividad');

        const reviews = await response.json();
        container.innerHTML = '';

        reviews.forEach(review => {
            const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
            const initial = review.username.charAt(0).toUpperCase();
            const avatarUrl = review.avatarUrl || `https://ui-avatars.com/api/?name=${initial}&background=1e2340&color=FFB800`;
            const coverUrl = review.bookCoverUrl || 'https://via.placeholder.com/150x220/1e2340/FFB800?text=Sin+Portada';

            const card = document.createElement('div');
            card.className = 'feature-card zumbido-card';
            card.style.display = 'flex';
            card.style.gap = '1.5rem';
            card.style.padding = '1.5rem';
            card.style.alignItems = 'flex-start';
            card.style.cursor = 'pointer';
            card.style.textAlign = 'left';

            card.onclick = () => window.location.href = `bookDetail.html?id=${encodeURIComponent(review.bookId)}`;

            card.innerHTML = `
                <img src="${coverUrl}" alt="Portada" style="width: 85px; height: 130px; object-fit: cover; border-radius: var(--radius-sm); box-shadow: var(--shadow-card); flex-shrink: 0;">
                <div style="flex: 1; overflow: hidden;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <img src="${avatarUrl}" style="width:24px; height:24px; border-radius:50%; border: 1px solid var(--navy-light);">
                        <span style="font-weight:600; font-size:0.9rem; color: var(--text);">@${review.username}</span>
                    </div>
                    <h4 style="font-family: 'Fraunces'; font-size: 1.15rem; margin-bottom: 0.25rem; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${review.bookTitle}
                    </h4>
                    <div style="color: var(--honey); margin-bottom: 0.5rem; font-size: 0.8rem;">${stars}</div>
                    <p style="font-size: 0.9rem; line-height: 1.5; color: var(--text-muted); font-style: italic; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        "${review.content || 'Sin comentario, solo puntuación.'}"
                    </p>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (error) {
        container.innerHTML = '<p style="grid-column: 1 / -1;">La colmena está descansando ahora mismo...</p>';
    }
}

if (document.getElementById('latestReviewsContainer')) {
    loadLatestActivity();
}