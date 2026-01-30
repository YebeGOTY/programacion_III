document.addEventListener("DOMContentLoaded", function () {
    const togglePassword = document.getElementById("togglePassword");
    const passwordField = document.getElementById("password");

    if (togglePassword && passwordField) {
        togglePassword.addEventListener("click", function () {
            const type = passwordField.getAttribute("type") === "password" ? "text" : "password";
            passwordField.setAttribute("type", type);

            this.classList.toggle("fa-eye");
            this.classList.toggle("fa-eye-slash");
        });
    }
});
document.addEventListener('DOMContentLoaded', () => {
    const userInitials = 'YV'; 
    document.getElementById('user-initials').textContent = userInitials;
});

