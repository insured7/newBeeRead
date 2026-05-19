document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('updatePasswordForm');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const messageBox = document.getElementById('messageBox');
    const submitBtn = document.getElementById('submitBtn');

    // Ocultar el formulario hasta que tengamos sesión válida
    form.style.display = 'none';

    let sessionValid = false;

    // Escuchar cambios en la autenticación (más fiable que getSession sola)
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            sessionValid = true;
            form.style.display = 'block';
            hideMsg();
        } else if (event === 'SIGNED_OUT') {
            sessionValid = false;
            form.style.display = 'none';
            showMsg("El enlace ha expirado o ya fue usado. Solicita uno nuevo.", true);
        }
    });

    // Verificar sesión actual por si ya existía al cargar
    const checkSession = async () => {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session) {
            sessionValid = true;
            form.style.display = 'block';
        } else {
            form.style.display = 'none';
            showMsg("El enlace de recuperación es inválido o ha expirado. Solicita uno nuevo.", true);
        }
    };
    checkSession();

    // Manejo del formulario
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        hideMsg();

        if (newPassword !== confirmPassword) {
            showMsg("Las contraseñas no coinciden. Comprueba los campos.", true);
            return;
        }

        if (newPassword.length < 6) {
            showMsg("La contraseña debe tener al menos 6 caracteres.", true);
            return;
        }

        submitBtn.disabled = true;
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';

        try {
            const { data, error } = await supabaseClient.auth.updateUser({
                password: newPassword
            });

            if (error) {
                if (error.message.includes("same as old") || error.status === 422) {
                    throw new Error("No puedes usar la misma contraseña que tenías anteriormente. Elige una distinta.");
                }
                throw error;
            }

            // Éxito: cerramos sesión para que no quede la sesión temporal
            await supabaseClient.auth.signOut();

            showMsg("¡Contraseña actualizada con éxito! Redirigiéndote al inicio de sesión...", false);
            form.reset();

            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);

        } catch (error) {
            showMsg(error.message || "No se pudo actualizar la contraseña. Reinténtalo.", true);
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    });

    // Funciones auxiliares de UI
    function showMsg(text, isError) {
        messageBox.textContent = text;
        messageBox.classList.remove('hidden');
        if (isError) {
            messageBox.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
            messageBox.style.color = 'var(--error)';
            messageBox.style.border = '1px solid var(--error)';
        } else {
            messageBox.style.backgroundColor = 'rgba(16, 185, 129, 0.15)';
            messageBox.style.color = 'var(--success)';
            messageBox.style.border = '1px solid var(--success)';
        }
    }

    function hideMsg() {
        messageBox.classList.add('hidden');
        messageBox.textContent = '';
    }
});