document.addEventListener("DOMContentLoaded", function () {
    const togglePassword = document.getElementById("togglePassword");
    const passwordField = document.getElementById("password");

    if (togglePassword && passwordField) {
        togglePassword.addEventListener("click", function () {
            // Cambiar el tipo de input
            const type = passwordField.getAttribute("type") === "password" ? "text" : "password";
            passwordField.setAttribute("type", type);

            // Alternar íconos de FontAwesome para un look más moderno
            this.classList.toggle("fa-eye");
            this.classList.toggle("fa-eye-slash");
        });
    }
});
// Aquí puedes agregar cualquier comportamiento dinámico si es necesario
// Ejemplo: Cambiar las iniciales con el nombre del usuario al iniciar sesión
document.addEventListener('DOMContentLoaded', () => {
    const userInitials = 'YV'; 
    document.getElementById('user-initials').textContent = userInitials;
});

