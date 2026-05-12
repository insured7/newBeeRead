// js/admin.js

let deleteTarget = null; // Guarda qué estamos borrando ('user' o 'review')
let deleteId = null;     // Guarda el ID del elemento a borrar

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificación estricta de seguridad
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { window.location.href = 'login.html'; return; }

    const { data: profile } = await supabaseClient.from('profiles').select('role_id').eq('id', session.user.id).single();
    if (!profile || profile.role_id !== 2) {
        alert("Acceso denegado. Esta zona es solo para abejas reina.");
        window.location.href = 'index.html';
        return;
    }

    // 2. Configurar pestañas
    setupAdminTabs();

    // 3. Cargar datos iniciales
    loadAllUsers();
});

function setupAdminTabs() {
    const tabUsers = document.getElementById('tabUsers');
    const tabReviews = document.getElementById('tabReviews');
    const sectionUsers = document.getElementById('adminUsers');
    const sectionReviews = document.getElementById('adminReviews');

    tabUsers.onclick = () => {
        tabUsers.classList.add('active'); tabReviews.classList.remove('active');
        sectionUsers.classList.remove('hidden'); sectionReviews.classList.add('hidden');
        loadAllUsers();
    };

    tabReviews.onclick = () => {
        tabReviews.classList.add('active'); tabUsers.classList.remove('active');
        sectionReviews.classList.remove('hidden'); sectionUsers.classList.add('hidden');
        loadAllReviews();
    };
}

// ─── CARGA DE DATOS ────────────────────────────────────────────────────────

async function loadAllUsers() {
    const tbody = document.getElementById('usersListBody');
    try {
        const response = await fetch('/api/profiles/all'); // Nuevo endpoint
        if (!response.ok) throw new Error('Error al cargar usuarios');
        const users = await response.json();

        tbody.innerHTML = users.map(user => `
            <tr>
                <td><span class="uuid-text">${user.id}</span></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 0.8rem;">
                        <img src="${user.avatarUrl || 'https://ui-avatars.com/api/?name='+user.username}" style="width: 35px; height: 35px; border-radius: 50%;">
                        <strong>@${user.username}</strong>
                    </div>
                </td>
                <td><span class="meta-chip">${user.roleId === 2 ? '👑 ADMIN' : 'USER'}</span></td>
                <td>
                    <button class="btn-danger" onclick="openDeleteModal('user', '${user.id}', '@${user.username}')" ${user.roleId === 2 ? 'disabled title="Seguridad: No se puede borrar a otro Admin desde aquí"' : ''}>
                        <i class="fas fa-trash"></i> Dar de baja
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) { tbody.innerHTML = `<tr><td colspan="4" style="color:var(--error);">${error.message}</td></tr>`; }
}

async function loadAllReviews() {
    const container = document.getElementById('globalReviewsList');
    try {
        const response = await fetch('/api/reviews/latest?limit=50'); // Reutilizamos este o creamos uno "all"
        const reviews = await response.json();

        container.innerHTML = reviews.map(r => `
            <div class="feature-card" style="padding: 1.2rem; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <span class="uuid-text" style="display:block; margin-bottom:0.5rem;">RevID: ${r.id}</span>
                    <strong style="color: var(--honey);">@${r.username}</strong> sobre <em>${r.bookTitle}</em>
                    <p style="color: var(--text-muted); margin-top: 0.5rem;">"${r.content || 'Solo puntuación'}"</p>
                </div>
                <button class="btn-danger" onclick="openDeleteModal('review', '${r.id}', 'esta reseña')">
                    <i class="fas fa-trash"></i> Eliminar
                </button>
            </div>
        `).join('');
    } catch (e) { container.innerHTML = `<p style="color:var(--error);">Error al cargar reseñas.</p>`; }
}

// ─── LÓGICA DE BORRADO (CORREGIDA Y FUNCIONAL) ──────────────────────────

const confirmInput = document.getElementById('confirmDeleteInput');
const finalDeleteBtn = document.getElementById('finalDeleteBtn');
const deleteModal = document.getElementById('deleteModal');

function openDeleteModal(type, id, itemName) {
    deleteTarget = type;
    deleteId = id;

    const modalText = document.getElementById('deleteModalText');
    const confirmInputArea = confirmInput.parentElement; // El contenedor del input

    if (type === 'user') {
        modalText.innerHTML = `Estás a punto de eliminar definitivamente al usuario <strong>${itemName}</strong>. Esto borrará también sus reseñas y favoritos.`;
        confirmInputArea.style.display = 'block';
        confirmInput.value = '';
        finalDeleteBtn.disabled = true;
    } else {
        modalText.innerHTML = `¿Estás seguro de que quieres eliminar <strong>${itemName}</strong>?`;
        confirmInputArea.style.display = 'none';
        finalDeleteBtn.disabled = false;
    }

    deleteModal.classList.remove('hidden');
}

function closeDeleteModal() {
    deleteModal.classList.add('hidden');
    deleteTarget = null;
    deleteId = null;
}

// Validación de la palabra BORRAR
confirmInput.addEventListener('input', (e) => {
    if (deleteTarget === 'user') {
        const textoEscrito = e.target.value.trim().toUpperCase();
        finalDeleteBtn.disabled = (textoEscrito !== 'BORRAR');
    }
});

// ⭐️ ESTO ES LO QUE FALTABA: La ejecución del borrado ⭐️
finalDeleteBtn.addEventListener('click', async () => {
    const originalContent = finalDeleteBtn.innerHTML;
    finalDeleteBtn.disabled = true;
    finalDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ejecutando...';

    try {
        const url = deleteTarget === 'user'
            ? `/api/profiles/${deleteId}`
            : `/api/reviews/${deleteId}`;

        const response = await fetch(url, { method: 'DELETE' });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || errorData.error || 'Error al eliminar');
        }


                closeDeleteModal(); // Cerramos el modal

                // Refrescamos la lista que corresponda automáticamente
                if (deleteTarget === 'user') {
                    await loadAllUsers();
                } else {
                    await loadAllReviews();
                }


                console.log("Eliminado con éxito");

    } catch (error) {
        alert("Error: " + error.message);
    } finally {
        finalDeleteBtn.disabled = false;
        finalDeleteBtn.innerHTML = originalContent;
    }
});