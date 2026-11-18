const CATEGORIAS = ['Electrónica', 'Hogar', 'Ropa', 'Alimentos', 'Papelería', 'Deportes', 'Otros'];
const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });

// Sin sesión no se puede ver esta página
if (!sesion.token) window.location.replace('/');

const cuerpoTabla = document.querySelector('#productos');
const plantilla = document.querySelector('#plantilla-producto');
const resumen = document.querySelector('#resumen');
const vacio = document.querySelector('#vacio');
const aviso = document.querySelector('#aviso');
const buscar = document.querySelector('#buscar');
const filtroCategoria = document.querySelector('#filtro-categoria');
const dialogo = document.querySelector('#dialogo-producto');
const form = document.querySelector('#form-producto');
const tituloDialogo = document.querySelector('#titulo-dialogo');
const errores = document.querySelector('#errores');
const dialogoEliminar = document.querySelector('#dialogo-eliminar');
const textoEliminar = document.querySelector('#texto-eliminar');

let productos = [];
let idEnEdicion = null;
let idPorEliminar = null;
let temporizadorAviso;
let temporizadorBusqueda;

const mostrarAviso = (texto, esError = false) => {
  aviso.textContent = texto;
  aviso.hidden = false;
  aviso.classList.toggle('aviso-error', esError);
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { aviso.hidden = true; }, 4000);
};

const irAlLogin = () => {
  sesion.limpiar();
  window.location.replace('/');
};

// Un 401 significa que el token venció o fue revocado
const manejarError = (error) => {
  if (error.status === 401) return irAlLogin();
  return mostrarAviso(error.message, true);
};

const crearFila = (producto) => {
  const fila = plantilla.content.cloneNode(true);
  const tr = fila.querySelector('tr');
  tr.dataset.id = producto._id;
  // textContent evita que los datos se interpreten como HTML
  tr.querySelector('.p-nombre').textContent = producto.nombre;
  tr.querySelector('.p-descripcion').textContent = producto.descripcion;
  tr.querySelector('.p-categoria').textContent = producto.categoria;
  tr.querySelector('.p-precio').textContent = moneda.format(producto.precio);
  tr.querySelector('.p-stock').textContent = producto.stock;
  tr.querySelector('.p-autor').textContent = producto.creadoPor?.nombre ?? '—';
  // Solo quien creó el producto ve los botones para modificarlo
  if (producto.creadoPor?._id !== sesion.usuario?.id) tr.querySelector('.acciones').replaceChildren();
  return fila;
};

const renderizar = () => {
  cuerpoTabla.replaceChildren(...productos.map(crearFila));
  vacio.hidden = productos.length > 0;
  const unidades = productos.reduce((total, { stock }) => total + stock, 0);
  resumen.textContent = `${productos.length} ${productos.length === 1 ? 'producto' : 'productos'} · ${unidades} unidades en stock`;
};

const cargarProductos = async () => {
  const parametros = new URLSearchParams();
  if (buscar.value.trim()) parametros.set('q', buscar.value.trim());
  if (filtroCategoria.value) parametros.set('categoria', filtroCategoria.value);
  try {
    productos = await peticion(`/productos?${parametros}`);
    renderizar();
  } catch (error) {
    manejarError(error);
  }
};

const abrirFormulario = (producto = null) => {
  idEnEdicion = producto?._id ?? null;
  tituloDialogo.textContent = producto ? 'Editar producto' : 'Agregar producto';
  form.reset();
  errores.replaceChildren();
  if (producto) {
    ['nombre', 'descripcion', 'precio', 'stock', 'categoria'].forEach((campo) => {
      form.elements[campo].value = producto[campo];
    });
  }
  dialogo.showModal();
  form.elements.nombre.focus();
};

const leerFormulario = () => {
  const datos = Object.fromEntries(new FormData(form));
  return {
    nombre: datos.nombre,
    descripcion: datos.descripcion,
    categoria: datos.categoria,
    precio: datos.precio === '' ? null : Number(datos.precio),
    stock: datos.stock === '' ? null : Number(datos.stock),
  };
};

form.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const editando = Boolean(idEnEdicion);
  try {
    await peticion(editando ? `/productos/${idEnEdicion}` : '/productos', {
      metodo: editando ? 'PUT' : 'POST',
      cuerpo: leerFormulario(),
    });
    dialogo.close();
    mostrarAviso(editando ? 'Producto actualizado.' : 'Producto agregado.');
    await cargarProductos();
  } catch (error) {
    if (error.status === 400 || error.status === 409) {
      const mensajes = error.detalles?.length ? error.detalles : [error.message];
      errores.replaceChildren(...mensajes.map((texto) => Object.assign(document.createElement('li'), { textContent: texto })));
    } else {
      dialogo.close();
      manejarError(error);
    }
  }
});

cuerpoTabla.addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-accion]');
  if (!boton) return;
  const { id } = boton.closest('tr').dataset;
  const producto = productos.find(({ _id }) => _id === id);

  if (boton.dataset.accion === 'editar') {
    abrirFormulario(producto);
  } else {
    idPorEliminar = id;
    textoEliminar.textContent = `¿Seguro que quieres eliminar "${producto.nombre}"? Esta acción no se puede deshacer.`;
    dialogoEliminar.showModal();
  }
});

document.querySelector('#btn-si-eliminar').addEventListener('click', async () => {
  try {
    await peticion(`/productos/${idPorEliminar}`, { metodo: 'DELETE' });
    dialogoEliminar.close();
    mostrarAviso('Producto eliminado.');
    await cargarProductos();
  } catch (error) {
    dialogoEliminar.close();
    manejarError(error);
  }
});

document.querySelector('#btn-no-eliminar').addEventListener('click', () => dialogoEliminar.close());
document.querySelector('#btn-cancelar').addEventListener('click', () => dialogo.close());
document.querySelector('#btn-nuevo').addEventListener('click', () => abrirFormulario());
document.querySelector('#filtros').addEventListener('submit', (evento) => evento.preventDefault());
filtroCategoria.addEventListener('change', cargarProductos);
buscar.addEventListener('input', () => {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(cargarProductos, 250);
});

// Cerrar sesión revoca el token en el servidor, no solo lo borra del navegador
document.querySelector('#btn-salir').addEventListener('click', async () => {
  try {
    await peticion('/auth/logout', { metodo: 'POST' });
  } catch {
    // Aunque falle la petición, la sesión local se limpia
  }
  irAlLogin();
});

const opciones = CATEGORIAS.map((categoria) => new Option(categoria, categoria));
filtroCategoria.append(...opciones);
document.querySelector('#categoria').append(...opciones.map((o) => o.cloneNode(true)));
document.querySelector('#saludo').textContent = `Hola, ${sesion.usuario?.nombre ?? ''}`;
cargarProductos();
