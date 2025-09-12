// Ejemplo: Mostrar/ocultar contraseña
document.addEventListener("DOMContentLoaded", function () {
  const pwd = document.querySelector("input[name='password']");
  if (pwd) {
    pwd.addEventListener("focus", function () {
      this.type = "text";
    });
    pwd.addEventListener("blur", function () {
      this.type = "password";
    });
  }
});