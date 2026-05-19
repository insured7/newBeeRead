// js/admin.js

let deleteTarget = null;
let deleteId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) { window.location.href = 'login.html'; return; }

    const { data: profile } = await supabaseClient.from('profiles').select('role_id').eq('id', session.user.id).single();
    if (!profile || profile.role_id !== 2) {
        alert("Acceso denegado. Esta zona es solo para abejas reina.");
        window.location.href = 'index.html';
        return;
    }

    setupAdminTabs();
    loadAllUsers();

    // Configurar botón de exportación (debe existir en el HTML)
    const exportBtn = document.getElementById('exportTopBooksBtn');
    if (exportBtn) exportBtn.onclick = exportTopBooksToCSV;
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
        const response = await fetch('/api/profiles/all');
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
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="4" style="color:var(--error);">${error.message}</td></tr>`;
    }
}

async function loadAllReviews() {
    const container = document.getElementById('globalReviewsList');
    try {
        const response = await fetch('/api/reviews/latest?limit=50');
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
    } catch (e) {
        container.innerHTML = `<p style="color:var(--error);">Error al cargar reseñas.</p>`;
    }
}

// ─── LÓGICA DE BORRADO (con mensajes bonitos) ─────────────────────────────

const confirmInput = document.getElementById('confirmDeleteInput');
const finalDeleteBtn = document.getElementById('finalDeleteBtn');
const deleteModal = document.getElementById('deleteModal');

function openDeleteModal(type, id, itemName) {
    console.log("Abriendo modal con ID:", id);
    deleteTarget = type;
    deleteId = id;

    const modalText = document.getElementById('deleteModalText');
    const confirmInputArea = confirmInput.parentElement;

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

confirmInput.addEventListener('input', (e) => {
    if (deleteTarget === 'user') {
        const textoEscrito = e.target.value.trim().toUpperCase();
        finalDeleteBtn.disabled = (textoEscrito !== 'BORRAR');
    }
});

function autoHideMessage() {
    const msgBox = document.getElementById('messageBox');
    if (msgBox && !msgBox.classList.contains('hidden')) {
        setTimeout(() => {
            msgBox.classList.add('hidden');
        }, 5000);
    }
}

finalDeleteBtn.addEventListener('click', async () => {
    const originalContent = finalDeleteBtn.innerHTML;
    finalDeleteBtn.disabled = true;
    finalDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Eliminando...';

    try {
        if (deleteTarget === 'user') {
            const { data, error } = await supabaseClient.rpc('admin_delete_user_cascade', { target_user_id: deleteId });
            if (error) throw new Error(error.message);
            if (!data.success) throw new Error(data.error || 'Error al eliminar usuario');
            showMessage(data.message, false);
        } else {
            const response = await fetch(`/api/reviews/${deleteId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Error al eliminar reseña');
            showMessage('Reseña eliminada correctamente', false);
        }

        closeDeleteModal();
        if (deleteTarget === 'user') {
            await loadAllUsers();
        } else {
            await loadAllReviews();
        }
        autoHideMessage();
    } catch (error) {
        console.error(error);
        showMessage(error.message, true);
        autoHideMessage();
    } finally {
        finalDeleteBtn.disabled = false;
        finalDeleteBtn.innerHTML = originalContent;
    }
});

// ─── EXPORTAR INFORME: LIBROS CON MÁS RESEÑAS (CSV) ───────────────────────

async function exportTopBooksToCSV() {
    try {
        showMessage("Generando informe... por favor espera", false);
        const { data, error } = await supabaseClient.rpc('get_top_books_by_reviews', { limit_count: 500 });
        if (error) throw new Error(error.message);
        if (!data || data.length === 0) throw new Error("No hay datos para exportar");

        // Convertir a CSV
        const headers = ["book_id", "title", "author", "review_count", "avg_rating"];
        const rows = data.map(book => [
            book.book_id,
            `"${(book.title || "").replace(/"/g, '""')}"`,
            `"${(book.author || "").replace(/"/g, '""')}"`,
            book.review_count,
            book.avg_rating ?? 0
        ]);
        const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");

        // Descargar archivo
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute("download", "top_libros_mas_resenados.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showMessage(`Informe exportado correctamente (${data.length} libros)`, false);
        autoHideMessage();
    } catch (error) {
        console.error(error);
        showMessage("Error al exportar: " + error.message, true);
        autoHideMessage();
    }
}