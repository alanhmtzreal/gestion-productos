const formLogin = document.querySelector('#form-login');
const formRegistro = document.querySelector('#form-registro');
const tabLogin = document.querySelector('#tab-login');
const tabRegistro = document.querySelector('#tab-registro');
const mensaje = document.querySelector('#mensaje');

// Quien ya tiene sesión va directo a los productos
if (sesion.token) window.location.replace('/productos.html');

const mostrarFormulario = (esLogin) => {
  formLogin.hidden = !esLogin;
  formRegistro.hidden = esLogin;
  tabLogin.setAttribute('aria-selected', esLogin);
  tabRegistro.setAttribute('aria-selected', !esLogin);
  mensaje.textContent = '';
};

tabLogin.addEventListener('click', () => mostrarFormulario(true));
tabRegistro.addEventListener('click', () => mostrarFormulario(false));

const enviar = async (form, ruta) => {
  const boton = form.querySelector('button[type="submit"]');
  mensaje.textContent = '';
  boton.disabled = true;
  try {
    const datos = await peticion(ruta, { metodo: 'POST', cuerpo: Object.fromEntries(new FormData(form)) });
    sesion.guardar(datos);
    window.location.assign('/productos.html');
  } catch (error) {
    mensaje.textContent = error.detalles?.join('. ') || error.message;
    boton.disabled = false;
  }
};

formLogin.addEventListener('submit', (evento) => {
  evento.preventDefault();
  enviar(formLogin, '/auth/login');
});

formRegistro.addEventListener('submit', (evento) => {
  evento.preventDefault();
  enviar(formRegistro, '/auth/register');
});
