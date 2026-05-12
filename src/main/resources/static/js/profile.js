// js/profile.js

let currentProfileId = null;
let cropper = null; // Variable global para la instancia del recortador

document.addEventListener('DOMContentLoaded', async () => {
    const loadingSection = document.getElementById('profileLoading');
    const contentSection = document.getElementById('profileContent');

    // 1. Verificar sesión en Supabase
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const username = session.user.user_metadata?.username;

    if (!username) {
        renderError("No se pudo obtener el nombre de usuario.");
        return;
    }

    // 2. Obtener datos del backend
    try {
        const response = await fetch(`http://localhost:8080/api/profiles/${encodeURIComponent(username)}`);

        if (!response.ok) {
            if (response.status === 404) throw new Error('Perfil no encontrado.');
            throw new Error('Error al conectar con el servidor.');
        }

        const profileData = await response.json();

        // 3. Pintar los datos
        renderProfileInfo(profileData);
        renderFavorites(profileData.favorites);
        renderReviews(profileData.reviews);

        // 4. Activar el botón de editar (solo si es mi propio perfil)
        showEditButton(profileData.id);

        loadingSection.classList.add('hidden');
        contentSection.classList.remove('hidden');

    } catch (error) {
        loadingSection.classList.add('hidden');
        renderError(error.message);
    }
});

// ─── LÓGICA DE AJUSTE DE FOTO (Cropper.js) ───────────────────────────────────

// Escuchamos cuando el usuario selecciona un archivo
// Escuchamos cuando el usuario selecciona un archivo
document.getElementById('editAvatarFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const imageElement = document.getElementById('imageToCrop');
    const wrapper = document.getElementById('cropperWrapper');
    const fileNameDisplay = document.getElementById('fileNameDisplay'); // Nuevo

    // Limpiar instancia previa si existe
    if (cropper) {
        cropper.destroy();
        cropper = null;
    }

    if (file) {
        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {
            showProfileToast("Por favor, selecciona un archivo de imagen válido.", true);
            this.value = '';
            fileNameDisplay.textContent = 'Seleccionar imagen desde tu dispositivo...';
            return;
        }

        // Mostrar el nombre del archivo en el botón
        fileNameDisplay.textContent = file.name;

        const reader = new FileReader();

        reader.onload = function(event) {
            imageElement.src = event.target.result;
            wrapper.classList.remove('hidden');

            cropper = new Cropper(imageElement, {
                aspectRatio: 1,
                viewMode: 1,
                dragMode: 'move',
                autoCropArea: 0.8,
                restore: false,
                guides: false,
                center: false,
                highlight: false,
                cropBoxMovable: false,
                cropBoxResizable: false,
                toggleDragModeOnDblclick: false,
            });
        };

        reader.readAsDataURL(file);
    } else {
        wrapper.classList.add('hidden');
        imageElement.src = '';
        fileNameDisplay.textContent = 'Seleccionar imagen desde tu dispositivo...';
    }
});

// ─── Eventos del Modal de Edición y Guardado ───────────────────────────────

document.getElementById('closeModal').addEventListener('click', () => {
    // Cerrar modal y limpiar editor
    document.getElementById('editProfileModal').classList.add('hidden');
    document.getElementById('cropperWrapper').classList.add('hidden');
    document.getElementById('editAvatarFile').value = '';
    if (cropper) cropper.destroy();
});

document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = e.target.querySelector('button');
    const fileInput = document.getElementById('editAvatarFile');

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando cambios...';

    const username = document.getElementById('editUsername').value;
    let avatarUrlToSave = document.getElementById('profileAvatar').src; // Mantenemos la actual por defecto

    try {
        // A. LÓGICA DE SUBIDA (Solo si hay un cropper activo y una imagen recortada)
        if (cropper) {
            // 1. Obtener la imagen recortada del cropper (como un Canvas HTML)
            // Especificamos el tamaño final deseado (ej: 300x300) para ahorrar espacio
            const canvas = cropper.getCroppedCanvas({
                width: 300,
                height: 300,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });

            if (!canvas) throw new Error("No se pudo procesar el recorte de la imagen.");

            // 2. Convertir el Canvas a un Blob (archivo binario) para subirlo
            // Usamos promise para manejar la conversión asíncrona
            const blob = await new Promise(resolve => {
                // Detectamos el tipo de archivo original, si no, por defecto wepb
                const fileType = fileInput.files[0]?.type || 'image/webp';
                canvas.toBlob(resolve, fileType, 0.9); // Calidad alta (0.9)
            });

            if (!blob) throw new Error("Error al generar el archivo de imagen recortado.");

            // Validar peso final (aunque el recorte a 300x300 debería ser muy ligero)
            if (blob.size > 2097152) { // 2MB
                throw new Error("La imagen recortada es demasiado grande. Máx: 2MB.");
            }

            // 3. Generar nombre único y subir a Supabase Storage
            const fileExt = blob.type.split('/').pop();
            const fileName = `${username}-avatar-${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabaseClient.storage
                .from('avatars')
                .upload(fileName, blob, { contentType: blob.type, cacheControl: '3600', upsert: true });

            if (uploadError) throw new Error("Error al subir la foto a la colmena.");

            // 4. Obtener la URL pública final
            const { data: urlData } = supabaseClient.storage
                .from('avatars')
                .getPublicUrl(fileName);

            avatarUrlToSave = urlData.publicUrl;
        }

        // B. PREPARAR DATOS Y ACTUALIZAR EN BACKEND (Spring Boot)
        const updatedData = {
            username: username,
            fullName: document.getElementById('editFullName').value.trim(),
            avatarUrl: avatarUrlToSave,
            bio: document.getElementById('editBio').value.trim()
        };

        const response = await fetch(`http://localhost:8080/api/profiles/${currentProfileId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Error al actualizar el perfil en la colmena.');
        }

        // C. ÉXITO
        showProfileToast('¡Perfil actualizado! La colmena se está refrescando...', false);
        setTimeout(() => window.location.reload(), 1500);

    } catch (err) {
        showProfileToast(err.message, true);
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Guardar Cambios';
    }
});

// ─── Funciones de Renderizado y UI (Resto del código igual) ────────────────

function showEditButton(profileId) {
    currentProfileId = profileId;
    const headerContainer = document.querySelector('#profileBio').parentElement;
    if (document.getElementById('editProfileBtn')) return;

    const editBtn = document.createElement('button');
    editBtn.id = 'editProfileBtn';
    editBtn.className = 'btn-secondary';
    editBtn.style.marginTop = '1.5rem';
    editBtn.innerHTML = '<i class="fas fa-edit"></i> Editar Perfil';
    editBtn.onclick = openEditModal;

    headerContainer.appendChild(editBtn);
}

function openEditModal() {
document.getElementById('fileNameDisplay').textContent = 'Seleccionar imagen desde tu dispositivo...';
    const modal = document.getElementById('editProfileModal');
    // Limpiamos el selector de archivos y el editor previo por seguridad
    document.getElementById('editAvatarFile').value = '';
    document.getElementById('cropperWrapper').classList.add('hidden');
    if (cropper) cropper.destroy();

    modal.classList.remove('hidden');

    // Rellenar campos con lo que hay ahora en pantalla
    document.getElementById('editUsername').value = document.getElementById('profileUsernameLabel').textContent.replace('@', '');

    const fullNameText = document.getElementById('profileFullName').textContent;
    const currentUsername = document.getElementById('profileUsernameLabel').textContent.replace('@', '');
    document.getElementById('editFullName').value = (fullNameText !== currentUsername) ? fullNameText : '';

    const currentBio = document.getElementById('profileBio').textContent.trim();
    document.getElementById('editBio').value = (currentBio !== 'Sin biografía.') ? currentBio : '';
}

function renderProfileInfo(profile) {
    document.title = `${profile.fullName || profile.username} — BeeRead`;
    document.getElementById('profileUsernameLabel').textContent = `@${profile.username}`;
    document.getElementById('profileFullName').textContent = profile.fullName || profile.username;

    if (profile.avatarUrl) {
        document.getElementById('profileAvatar').src = profile.avatarUrl;
    } else {
        const initial = profile.username.charAt(0).toUpperCase();
        document.getElementById('profileAvatar').src = `https://ui-avatars.com/api/?name=${initial}&background=1e2340&color=FFB800&size=150&font-size=0.5`;
    }

    document.getElementById('profileBio').textContent = profile.bio || 'Sin biografía.';

    document.getElementById('followersCount').textContent = profile.followersCount || 0;
    document.getElementById('followingCount').textContent = profile.followingCount || 0;
}

function renderFavorites(favorites) {
    const container = document.getElementById('favoritesGrid');
    container.innerHTML = '';
    if (!favorites || favorites.length === 0) {
        container.innerHTML = '<p class="results-empty" style="padding: 2rem;">Aún no tienes libros favoritos. ¡Explora la colmena!</p>';
        return;
    }
    favorites.forEach(fav => {
        const book = fav.book;
        const card = document.createElement('div');
        card.className = 'book-card';
        card.innerHTML = `
            <img src="${book.coverUrl}" alt="Portada de ${book.title}" class="book-cover" onerror="this.onerror=null; this.src='data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22150%22 height=%22220%22%3E%3Crect width=%22100%25%22 height=%22100%25%22 fill=%22%231e2340%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 font-family=%22sans-serif%22 font-weight=%22bold%22 fill=%22%23FFB800%22%3ESin Portada%3C/text%3E%3C/svg%3E';">
            <div class="book-info">
                <div class="book-title" title="${book.title}">${book.title}</div>
                <div class="book-author" title="${book.author}">${book.author}</div>
            </div>
        `;
        card.addEventListener('click', () => { window.location.href = `bookDetail.html?id=${encodeURIComponent(book.id)}`; });
        container.appendChild(card);
    });
}

function renderReviews(reviews) {
    const container = document.getElementById('reviewsList');
    container.innerHTML = '';
    if (!reviews || reviews.length === 0) {
        container.innerHTML = '<p class="results-empty" style="padding: 2rem;">Aún no has escrito ninguna reseña.</p>';
        return;
    }
    reviews.forEach(review => {
        const book = review.book;
        const starsHtml = Array.from({ length: 5 }, (_, i) => { return `<i class="fas fa-star" style="color: ${i < review.rating ? 'var(--honey)' : 'rgba(255,255,255,0.1)'};"></i>`; }).join('');
        const date = new Date(review.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
        const reviewEl = document.createElement('div');
        reviewEl.className = 'review-section';
        reviewEl.style.flexDirection = 'row';
        reviewEl.style.alignItems = 'flex-start';
        reviewEl.style.gap = '1.5rem';
        reviewEl.innerHTML = `
            <img src="${book.coverUrl}" alt="Portada" style="width: 80px; height: 120px; object-fit: cover; border-radius: var(--radius-sm); cursor: pointer;" onclick="window.location.href='bookDetail.html?id=${encodeURIComponent(book.id)}'" onerror="this.src='https://via.placeholder.com/80x120/1e2340/FFB800?text=Sin+Portada';">
            <div style="flex: 1;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; flex-wrap: wrap;">
                    <h3 class="book-title" style="font-size: 1.1rem; cursor: pointer;" onclick="window.location.href='bookDetail.html?id=${encodeURIComponent(book.id)}'">${book.title}</h3>
                    <span style="font-size: 0.8rem; color: var(--text-muted);"><i class="fas fa-calendar-alt"></i> ${date}</span>
                </div>
                <div style="margin-bottom: 1rem; font-size: 0.9rem;">${starsHtml}</div>
                <p style="color: var(--text); line-height: 1.6; font-size: 0.95rem;">"${review.content || 'Sin texto.'}"</p>
            </div>
        `;
        container.appendChild(reviewEl);
    });
}

function renderError(message) {
    const container = document.querySelector('.results-inner');
    container.innerHTML = `
        <div class="results-empty">
            <span class="results-empty-icon">⚠️</span>
            <h2>Algo ha fallado</h2>
            <p>${message}</p>
            <a href="index.html" class="btn-primary" style="margin-top: 1.5rem;"><i class="fas fa-home"></i> Volver al inicio</a>
        </div>
    `;
}

function showProfileToast(text, isError) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    const icon = isError ? '<i class="fas fa-exclamation-circle" style="color: var(--error); font-size: 1.2rem;"></i>' : '<i class="fas fa-check-circle" style="color: var(--success); font-size: 1.2rem;"></i>';
    toast.innerHTML = `${icon} <span>${text}</span>`;
    container.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 4000);
}