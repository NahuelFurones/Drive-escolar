document.addEventListener("DOMContentLoaded", function () {
  const telefono = document.querySelector("input[name='telefono']");
  if (telefono) {
    telefono.addEventListener("input", function () {
      this.value = this.value.replace(/[^0-9]/g, '').slice(0, 10);
    });
  }
  const dni = document.querySelector("input[name='dni']");
  if (dni) {
    dni.addEventListener("input", function () {
      this.value = this.value.replace(/[^0-9]/g, '').slice(0, 8);
    });
  }
});