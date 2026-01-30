let productos = [];

fetch("../static/js/productos.json")
    .then(response => response.json())
    .then(data => {
        productos = data;
        // Cargar stock desde localStorage si existe
        const stockGuardado = localStorage.getItem("stock-productos");
        if (stockGuardado) {
            const stockData = JSON.parse(stockGuardado);
            productos.forEach(producto => {
                if (stockData[producto.id] !== undefined) {
                    producto.stock = stockData[producto.id];
                }
            });
        }
        cargarProductos(productos);
    })
    .catch(error => {
        console.error('Error al cargar productos:', error);
    });

const contenedorProductos = document.querySelector("#contenedor-productos");
const tituloPrincipal = document.querySelector("#titulo-principal");
let botonesAgregar = document.querySelectorAll(".producto-agregar");
const numerito = document.querySelector("#numerito");
const buscador = document.querySelector("#buscador");
const categoriasTags = document.querySelectorAll(".categoria-tag");

let categoriaActual = "todos";
let textoBusqueda = "";

// Función para cargar productos
function cargarProductos(productosElegidos) {
    contenedorProductos.innerHTML = "";

    if (productosElegidos.length === 0) {
        contenedorProductos.innerHTML = '<p style="color: var(--clr-main); text-align: center; padding: 2rem; grid-column: 1/-1;">No se encontraron productos.</p>';
        return;
    }

    productosElegidos.forEach(producto => {
        const div = document.createElement("div");
        div.classList.add("producto");
        
        const estaAgotado = producto.stock <= 0;
        const stockBajo = producto.stock > 0 && producto.stock <= 3;
        
        div.innerHTML = `
            <img class="producto-imagen ${estaAgotado ? 'producto-agotado-img' : ''}" src="../static/${producto.imagen}" alt="${producto.titulo}">
            <div class="producto-detalles">
                <h3 class="producto-titulo">${producto.titulo}</h3>
                <p class="producto-precio">$${producto.precio}</p>
                <p class="producto-stock ${estaAgotado ? 'stock-agotado' : stockBajo ? 'stock-bajo' : 'stock-disponible'}">
                    ${estaAgotado ? '¡Agotado!' : stockBajo ? `¡Solo ${producto.stock} disponibles!` : `${producto.stock} disponibles`}
                </p>
                <button class="producto-agregar ${estaAgotado ? 'producto-agotado' : ''}" id="${producto.id}" ${estaAgotado ? 'disabled' : ''}>
                    ${estaAgotado ? 'Agotado' : 'Agregar'}
                </button>
            </div>
        `;

        contenedorProductos.append(div);
    });

    actualizarBotonesAgregar();
}

function filtrarProductos() {
    let productosFiltrados = productos;

    // Filtrar por categoría
    if (categoriaActual !== "todos") {
        productosFiltrados = productosFiltrados.filter(p => p.categoria.id === categoriaActual);
    }

    if (textoBusqueda !== "") {
        productosFiltrados = productosFiltrados.filter(p => 
            p.titulo.toLowerCase().includes(textoBusqueda.toLowerCase()) ||
            p.categoria.nombre.toLowerCase().includes(textoBusqueda.toLowerCase())
        );
    }

    // Actualizar título
    if (textoBusqueda !== "") {
        tituloPrincipal.innerText = `Resultados para "${textoBusqueda}"`;
    } else if (categoriaActual !== "todos") {
        const categoriaEncontrada = productos.find(p => p.categoria.id === categoriaActual);
        tituloPrincipal.innerText = categoriaEncontrada ? categoriaEncontrada.categoria.nombre : "Productos";
    } else {
        tituloPrincipal.innerText = "Todos los productos";
    }

    cargarProductos(productosFiltrados);
}

// Evento del buscador
if (buscador) {
    buscador.addEventListener("input", (e) => {
        textoBusqueda = e.target.value;
        filtrarProductos();
    });
}

categoriasTags.forEach(tag => {
    tag.addEventListener("click", (e) => {
        categoriasTags.forEach(t => t.classList.remove("active"));
        e.currentTarget.classList.add("active");
        
        categoriaActual = e.currentTarget.dataset.categoria;
        
        const aside = document.querySelector("aside");
        if (aside) {
            aside.classList.remove("aside-visible");
        }
        
        filtrarProductos();
    });
});
