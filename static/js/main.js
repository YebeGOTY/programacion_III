let productos = [];
let productosEnCarrito = JSON.parse(localStorage.getItem("productos-en-carrito")) || [];
let categoriaActual = "todos";
let productoActual = null;
let cantidadSeleccionada = 1;

const contenedorProductos = document.querySelector("#contenedor-productos");
const tituloPrincipal = document.querySelector("#titulo-principal");
const numerito = document.querySelector("#numerito");
const buscador = document.querySelector("#buscador");
const categoriasTags = document.querySelectorAll(".categoria-tag");
const loading = document.querySelector("#loading");

// Elementos del modal
const modalOverlay = document.getElementById("modal-producto");
const modalClose = document.getElementById("modal-close");
const modalImagen = document.getElementById("modal-imagen");
const modalTitulo = document.getElementById("modal-titulo");
const modalCodigo = document.getElementById("modal-codigo");
const modalPrecio = document.getElementById("modal-precio");
const modalStock = document.getElementById("modal-stock");
const modalCategoria = document.getElementById("modal-categoria");
const cantidadInput = document.getElementById("cantidad-input");
const btnMenos = document.getElementById("btn-menos");
const btnMas = document.getElementById("btn-mas");
const btnAgregarModal = document.getElementById("modal-agregar");

document.addEventListener('DOMContentLoaded', () => {
    cargarProductos();
    actualizarNumerito();
    configurarModal();
});

function configurarModal() {
    // Cerrar modal con el botón X
    modalClose.addEventListener('click', cerrarModal);
    
    // Cerrar modal al hacer clic fuera
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            cerrarModal();
        }
    });
    
    // Botones de cantidad
    btnMenos.addEventListener('click', () => {
        if (cantidadSeleccionada > 1) {
            cantidadSeleccionada--;
            cantidadInput.value = cantidadSeleccionada;
        }
    });
    
    btnMas.addEventListener('click', () => {
        if (productoActual && cantidadSeleccionada < productoActual.stock) {
            cantidadSeleccionada++;
            cantidadInput.value = cantidadSeleccionada;
        }
    });
    
    // Agregar al carrito desde el modal
    btnAgregarModal.addEventListener('click', agregarDesdeModal);
}

async function cargarProductos() {
    mostrarLoading(true);
    try {
        const url = categoriaActual === 'todos' 
            ? '/api/productos' 
            : `/api/productos?categoria=${categoriaActual}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al conectar con el servidor');
        
        productos = await response.json();
        
        // Actualizar título según categoría
        if (categoriaActual === 'todos') {
            tituloPrincipal.innerText = 'Todos los productos';
        } else {
            const nombreCategoria = categoriaActual.charAt(0).toUpperCase() + categoriaActual.slice(1);
            tituloPrincipal.innerText = nombreCategoria;
        }
        
        renderizarProductos(productos);
    } catch (error) {
        console.error('Error:', error);
        contenedorProductos.innerHTML = '<p class="no-results">Error al cargar productos. Por favor, intenta de nuevo.</p>';
    } finally {
        mostrarLoading(false);
    }
}

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
                alt="${producto.nombre || producto.titulo}">
            <div class="producto-detalles">
                <h3 class="producto-titulo">${producto.nombre || producto.titulo}</h3>
                <p class="producto-precio">$${producto.precio}</p>
                <p class="producto-stock ${estaAgotado ? 'stock-agotado' : stockBajo ? 'stock-bajo' : 'stock-disponible'}">
                    ${estaAgotado ? '¡Agotado!' : stockBajo ? `¡Solo ${producto.stock} uds!` : `${producto.stock} disponibles`}
                </p>
            </div>
        `;
        
        // Hacer clic en toda la tarjeta para abrir el modal
        div.addEventListener('click', () => abrirModal(producto));
        
        contenedorProductos.append(div);
    });
}

function abrirModal(producto) {
    productoActual = producto;
    cantidadSeleccionada = 1;
    
    // Rellenar información del modal
    modalImagen.src = producto.imagen;
    modalImagen.alt = producto.nombre || producto.titulo;
    modalTitulo.textContent = producto.nombre || producto.titulo;
    modalCodigo.textContent = producto.codigo;
    modalPrecio.textContent = `$${producto.precio}`;
    
    // Categoría
    const categoriaNombre = producto.categoria.charAt(0).toUpperCase() + producto.categoria.slice(1);
    modalCategoria.textContent = categoriaNombre;
    
    // Stock
    const estaAgotado = producto.stock <= 0;
    const stockBajo = producto.stock > 0 && producto.stock <= 3;
    
    if (estaAgotado) {
        modalStock.textContent = '¡Agotado!';
        modalStock.className = 'modal-stock-badge agotado';
        btnAgregarModal.disabled = true;
        btnAgregarModal.textContent = 'Sin Stock';
    } else if (stockBajo) {
        modalStock.textContent = `¡Solo ${producto.stock} disponibles!`;
        modalStock.className = 'modal-stock-badge bajo';
        btnAgregarModal.disabled = false;
        btnAgregarModal.innerHTML = '<i class="bi bi-cart-plus-fill"></i><span>Agregar al Carrito</span>';
    } else {
        modalStock.textContent = `${producto.stock} disponibles`;
        modalStock.className = 'modal-stock-badge disponible';
        btnAgregarModal.disabled = false;
        btnAgregarModal.innerHTML = '<i class="bi bi-cart-plus-fill"></i><span>Agregar al Carrito</span>';
    }
    
    // Resetear cantidad
    cantidadInput.value = 1;
    
    // Actualizar límite máximo
    btnMas.disabled = producto.stock <= 1;
    
    // Mostrar modal
    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevenir scroll
}

function cerrarModal() {
    modalOverlay.classList.remove('active');
    document.body.style.overflow = ''; // Restaurar scroll
    productoActual = null;
    cantidadSeleccionada = 1;
}

function agregarDesdeModal() {
    if (!productoActual || productoActual.stock <= 0) {
        notificar("Producto agotado", "#c91212");
        return;
    }
    
    const id = productoActual._id || productoActual.id;
    const enCarrito = productosEnCarrito.find(p => (p._id || p.id) === id);
    
    // Verificar stock disponible
    const cantidadEnCarrito = enCarrito ? enCarrito.cantidad : 0;
    if (cantidadEnCarrito + cantidadSeleccionada > productoActual.stock) {
        notificar("No hay suficiente stock disponible", "#c91212");
        return;
    }
    
    // Agregar o actualizar cantidad
    if (enCarrito) {
        enCarrito.cantidad += cantidadSeleccionada;
    } else {
        const nuevoProducto = { ...productoActual, cantidad: cantidadSeleccionada };
        productosEnCarrito.push(nuevoProducto);
    }
    
    actualizarNumerito();
    localStorage.setItem("productos-en-carrito", JSON.stringify(productosEnCarrito));
    
    notificar(
        `${cantidadSeleccionada} ${cantidadSeleccionada === 1 ? 'producto agregado' : 'productos agregados'}`,
        "linear-gradient(to right, #ffa620, #fc7a00)"
    );
    
    cerrarModal();
}

if (buscador) {
    buscador.addEventListener("input", (e) => {
        const texto = e.target.value.toLowerCase();
        const filtrados = productos.filter(p => 
            (p.nombre || p.titulo).toLowerCase().includes(texto) ||
            (p.categoria || '').toLowerCase().includes(texto)
        );
        renderizarProductos(filtrados);
        tituloPrincipal.innerText = texto ? `Resultados para: "${texto}"` : 
            (categoriaActual === 'todos' ? 'Todos los productos' : categoriaActual.charAt(0).toUpperCase() + categoriaActual.slice(1));
    });
}

categoriasTags.forEach(tag => {
    tag.addEventListener("click", (e) => {
        categoriasTags.forEach(t => t.classList.remove("active"));
        e.currentTarget.classList.add("active");
        
        categoriaActual = e.currentTarget.dataset.categoria.toLowerCase();

        // Cerrar menú lateral en móvil
        document.querySelector("aside").classList.remove("aside-visible");
        
        // Limpiar buscador
        if (buscador) {
            buscador.value = '';
        }
        
        cargarProductos(); 
    });
});

function actualizarNumerito() {
    let total = productosEnCarrito.reduce((acc, p) => acc + p.cantidad, 0);
    if (numerito) numerito.innerText = total;
}

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

// Cerrar modal con tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
        cerrarModal();
    }
});