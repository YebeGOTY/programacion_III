// --- VARIABLES GLOBALES ---
let productos = [];
let productosEnCarrito = JSON.parse(localStorage.getItem("productos-en-carrito")) || [];
let categoriaActual = "todos";

// --- ELEMENTOS DEL DOM ---
const contenedorProductos = document.querySelector("#contenedor-productos");
const tituloPrincipal = document.querySelector("#titulo-principal");
const numerito = document.querySelector("#numerito");
const buscador = document.querySelector("#buscador");
const categoriasTags = document.querySelectorAll(".categoria-tag");
const loading = document.querySelector("#loading");

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    actualizarNumerito();
});

// --- LÓGICA DE DATOS ---

// Obtener productos desde tu API (Base de datos)
async function cargarProductos() {
    mostrarLoading(true);
    try {
        // Si usas el backend de prueba.js
        const url = categoriaActual === 'todos' 
            ? '/api/productos' 
            : `/api/productos?categoria=${categoriaActual}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al conectar con el servidor');
        
        productos = await response.json();
        renderizarProductos(productos);
    } catch (error) {
        console.error('Error:', error);
        // Fallback: Si la API falla, intentar cargar el JSON local por si acaso
        intentarCargaLocal();
    } finally {
        mostrarLoading(false);
    }
}

// Renderizar las tarjetas en el HTML
function renderizarProductos(productosElegidos) {
    contenedorProductos.innerHTML = "";

    if (productosElegidos.length === 0) {
        contenedorProductos.innerHTML = '<p class="no-results">No se encontraron productos en esta categoría.</p>';
        return;
    }

    productosElegidos.forEach(producto => {
        const div = document.createElement("div");
        div.classList.add("producto");
        
        const estaAgotado = producto.stock <= 0;
        const stockBajo = producto.stock > 0 && producto.stock <= 3;
        
        div.innerHTML = `
            <img class="producto-imagen ${estaAgotado ? 'producto-agotado-img' : ''}" 
                 src="${producto.imagen}" 
                 alt="${producto.nombre || producto.titulo}"
                 onclick="verDetalles('${producto._id || producto.id}')">
            <div class="producto-detalles">
                <h3 class="producto-titulo">${producto.nombre || producto.titulo}</h3>
                <p class="producto-precio">$${producto.precio}</p>
                <p class="producto-stock ${estaAgotado ? 'stock-agotado' : stockBajo ? 'stock-bajo' : 'stock-disponible'}">
                    ${estaAgotado ? '¡Agotado!' : stockBajo ? `¡Solo ${producto.stock} uds!` : `${producto.stock} disponibles`}
                </p>
                <button class="producto-agregar ${estaAgotado ? 'producto-agotado' : ''}" 
                        id="${producto._id || producto.id}" 
                        ${estaAgotado ? 'disabled' : ''}>
                    ${estaAgotado ? 'Sin Stock' : 'Agregar al Carrito'}
                </button>
            </div>
        `;
        contenedorProductos.append(div);
    });

    actualizarBotonesAgregar();
}

// --- FILTROS Y BÚSQUEDA ---

// Buscador en tiempo real
if (buscador) {
    buscador.addEventListener("input", (e) => {
        const texto = e.target.value.toLowerCase();
        const filtrados = productos.filter(p => 
            (p.nombre || p.titulo).toLowerCase().includes(texto) ||
            (p.categoria.nombre || p.categoria).toLowerCase().includes(texto)
        );
        renderizarProductos(filtrados);
        tituloPrincipal.innerText = texto ? `Resultados para: "${texto}"` : "Todos los productos";
    });
}

// Filtro por categorías (Sidebar)
categoriasTags.forEach(tag => {
    tag.addEventListener("click", (e) => {
        categoriasTags.forEach(t => t.classList.remove("active"));
        e.currentTarget.classList.add("active");
        
        categoriaActual = e.currentTarget.dataset.categoria;
        
        // Cerrar menú móvil si está abierto
        document.querySelector("aside").classList.remove("aside-visible");
        
        cargarProductos(); // Vuelve a pedir a la DB con el filtro
    });
});

// --- LÓGICA DEL CARRITO ---

function actualizarBotonesAgregar() {
    const botonesAgregar = document.querySelectorAll(".producto-agregar");
    botonesAgregar.forEach(boton => {
        boton.addEventListener("click", agregarAlCarrito);
    });
}

function agregarAlCarrito(e) {
    const id = e.currentTarget.id;
    const productoAgregado = productos.find(p => (p._id || p.id) === id);

    // Validar stock
    const enCarrito = productosEnCarrito.find(p => (p._id || p.id) === id);
    if (enCarrito && enCarrito.cantidad >= productoAgregado.stock) {
        notificar("No hay más stock disponible", "#c91212");
        return;
    }

    if (productosEnCarrito.some(p => (p._id || p.id) === id)) {
        const index = productosEnCarrito.findIndex(p => (p._id || p.id) === id);
        productosEnCarrito[index].cantidad++;
    } else {
        productoAgregado.cantidad = 1;
        productosEnCarrito.push(productoAgregado);
    }

    actualizarNumerito();
    localStorage.setItem("productos-en-carrito", JSON.stringify(productosEnCarrito));
    notificar("Producto añadido", "linear-gradient(to right, #ffa620, #fc7a00)");
}

function actualizarNumerito() {
    let total = productosEnCarrito.reduce((acc, p) => acc + p.cantidad, 0);
    if (numerito) numerito.innerText = total;
}

// --- UTILIDADES ---

function mostrarLoading(estado) {
    if (loading) loading.style.display = estado ? 'block' : 'none';
    contenedorProductos.style.opacity = estado ? '0.5' : '1';
}

function notificar(texto, color) {
    Toastify({
        text: texto,
        duration: 2000,
        gravity: "top",
        position: "right",
        style: { background: color, borderRadius: "2rem" }
    }).showToast();
}

// Modal de detalles (opcional si tienes la ruta /api/productos/id)
async function verDetalles(id) {
    try {
        const res = await fetch(`/api/productos/${id}`);
        const p = await res.json();
        // Aquí podrías disparar el modal que tenías en prueba.js
        console.log("Detalles del producto:", p);
    } catch (e) { console.error(e); }
}