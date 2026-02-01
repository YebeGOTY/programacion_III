let productosEnCarrito = localStorage.getItem("productos-en-carrito");
productosEnCarrito = JSON.parse(productosEnCarrito);

const contenedorCarritoVacio = document.querySelector("#carrito-vacio");
const contenedorCarritoProductos = document.querySelector("#carrito-productos");
const contenedorCarritoAcciones = document.querySelector("#carrito-acciones");
const contenedorCarritoComprado = document.querySelector("#carrito-comprado");
let botonesEliminar = document.querySelectorAll(".carrito-producto-eliminar");
const botonVaciar = document.querySelector("#carrito-acciones-vaciar");
const contenedorTotal = document.querySelector("#total");
const botonComprar = document.querySelector("#carrito-acciones-comprar");

function cargarProductosCarrito() {
    if (productosEnCarrito && productosEnCarrito.length > 0) {
        contenedorCarritoVacio.classList.add("disabled");
        contenedorCarritoProductos.classList.remove("disabled");
        contenedorCarritoAcciones.classList.remove("disabled");
        contenedorCarritoComprado.classList.add("disabled");
    
        contenedorCarritoProductos.innerHTML = "";
    
        productosEnCarrito.forEach(producto => {
            const div = document.createElement("div");
            div.classList.add("carrito-producto");
            const productoId = producto._id || producto.id;
            
            // Arreglar ruta de imagen
            let rutaImagen = producto.imagen;
            if (rutaImagen.startsWith('./')) {
                rutaImagen = '../static/' + rutaImagen.substring(2);
            } else if (!rutaImagen.startsWith('/') && !rutaImagen.startsWith('http')) {
                rutaImagen = '../static/' + rutaImagen;
            }
            
            div.innerHTML = `
                <img class="carrito-producto-imagen" src="${rutaImagen}" alt="${producto.titulo || producto.nombre}">
                <div class="carrito-producto-titulo">
                    <small>Título</small>
                    <h3>${producto.titulo || producto.nombre}</h3>
                </div>
                <div class="carrito-producto-cantidad">
                    <small>Cantidad</small>
                    <p>${producto.cantidad}</p>
                </div>
                <div class="carrito-producto-precio">
                    <small>Precio</small>
                    <p>$${producto.precio}</p>
                </div>
                <div class="carrito-producto-subtotal">
                    <small>Subtotal</small>
                    <p>$${(producto.precio * producto.cantidad).toFixed(2)}</p>
                </div>
                <button class="carrito-producto-eliminar" id="${productoId}"><i class="bi bi-trash-fill"></i></button>
            `;
    
            contenedorCarritoProductos.append(div);
        });
    
        actualizarBotonesEliminar();
        actualizarTotal();
	
    } else {
        contenedorCarritoVacio.classList.remove("disabled");
        contenedorCarritoProductos.classList.add("disabled");
        contenedorCarritoAcciones.classList.add("disabled");
        contenedorCarritoComprado.classList.add("disabled");
    }
}

cargarProductosCarrito();

function actualizarBotonesEliminar() {
    botonesEliminar = document.querySelectorAll(".carrito-producto-eliminar");

    botonesEliminar.forEach(boton => {
        boton.addEventListener("click", eliminarDelCarrito);
    });
}

function eliminarDelCarrito(e) {
    Toastify({
        text: "Producto eliminado",
        duration: 3000,
        close: true,
        gravity: "top", 
        position: "right", 
        stopOnFocus: true, 
        style: {
            background: "linear-gradient(to right, #ffa620, #fc7a00)",
            borderRadius: "2rem",
            textTransform: "uppercase",
            fontSize: ".75rem"
        },
        offset: {
            x: '1.5rem', 
            y: '1.5rem' 
        },
        onClick: function(){} 
    }).showToast();

    const idBoton = e.currentTarget.id;
    const index = productosEnCarrito.findIndex(producto => (producto._id || producto.id) === idBoton);
    
    productosEnCarrito.splice(index, 1);
    cargarProductosCarrito();

    localStorage.setItem("productos-en-carrito", JSON.stringify(productosEnCarrito));
}

botonVaciar.addEventListener("click", vaciarCarrito);

function vaciarCarrito() {
    Swal.fire({
        title: '¿Estás seguro?',
        icon: 'question',
        html: `Se van a borrar ${productosEnCarrito.reduce((acc, producto) => acc + producto.cantidad, 0)} productos.`,
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: 'Sí',
        cancelButtonText: 'No'
    }).then((result) => {
        if (result.isConfirmed) {
            productosEnCarrito.length = 0;
            localStorage.setItem("productos-en-carrito", JSON.stringify(productosEnCarrito));
            cargarProductosCarrito();
        }
    });
}

function actualizarTotal() {
    const totalCalculado = productosEnCarrito.reduce((acc, producto) => acc + (producto.precio * producto.cantidad), 0);
    total.innerText = `$${totalCalculado.toFixed(2)}`;
}

botonComprar.addEventListener("click", comprarCarrito);

async function comprarCarrito() {
    try {
        // Mostrar loading
        botonComprar.disabled = true;
        botonComprar.innerHTML = '<i class="bi bi-hourglass-split"></i> Procesando...';
        
        // Enviar productos al backend para actualizar stock
        const response = await fetch('/api/procesar-compra', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                productos: productosEnCarrito
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al procesar la compra');
        }
        
        // Generar factura antes de vaciar el carrito
        mostrarFactura(productosEnCarrito);
        
        // Si todo salió bien, vaciar carrito
        productosEnCarrito.length = 0;
        localStorage.setItem("productos-en-carrito", JSON.stringify(productosEnCarrito));
        
        // Mostrar mensaje de éxito
        contenedorCarritoVacio.classList.add("disabled");
        contenedorCarritoProductos.classList.add("disabled");
        contenedorCarritoAcciones.classList.add("disabled");
        contenedorCarritoComprado.classList.remove("disabled");
        
    } catch (error) {
        console.error('Error:', error);
        
        Toastify({
            text: error.message || "Error al procesar la compra",
            duration: 3000,
            gravity: "top",
            position: "right",
            style: {
                background: "linear-gradient(to right, #ff5f6d, #ffc371)",
                borderRadius: "2rem"
            }
        }).showToast();
        
        // Restaurar botón
        botonComprar.disabled = false;
        botonComprar.innerHTML = 'Comprar ahora';
    }
}

function mostrarFactura(productos) {
    // Calcular totales
    const subtotal = productos.reduce((acc, p) => acc + (p.precio * p.cantidad), 0);
    const iva = subtotal * 0.16; // 16% de IVA
    const total = subtotal + iva;
    
    // Generar número de factura
    const numeroFactura = 'FAC-' + Date.now().toString().slice(-8);
    const fecha = new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Crear HTML de los productos
    let productosHTML = '';
    productos.forEach(p => {
        productosHTML += `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">${p.nombre || p.titulo}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${p.cantidad}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${p.precio.toFixed(2)}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">$${(p.precio * p.cantidad).toFixed(2)}</td>
            </tr>
        `;
    });
    
    Swal.fire({
        title: '¡Compra Exitosa!',
        html: `
            <div class="factura-container" style="text-align: left;">
                <div class="factura-header" style="text-align: center; margin-bottom: 25px;">
                    <h2 style="color: #ff7b00; margin: 0; font-size: 32px;">🏠 KAMEHOUSE</h2>
                    <p style="color: #666; margin: 5px 0; font-size: 14px;">Corporation Capsule</p>
                    <p style="color: #999; margin: 5px 0; font-size: 12px;">RFC: KMH-123456-ABC</p>
                    <hr style="border: none; border-top: 3px solid #ff7b00; margin: 15px 0;">
                </div>
                
                <div class="factura-info" style="margin: 20px 0; background: #f8f9fa; padding: 15px; border-radius: 8px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <p style="margin: 5px 0; font-size: 13px;"><strong>📋 Factura N°:</strong> ${numeroFactura}</p>
                            <p style="margin: 5px 0; font-size: 13px;"><strong>📅 Fecha:</strong> ${fecha}</p>
                        </div>
                        <div>
                            <p style="margin: 5px 0; font-size: 13px;"><strong>👤 Cliente:</strong> Usuario Kamehouse</p>
                            <p style="margin: 5px 0; font-size: 13px;"><strong>💳 Método:</strong> Pago Efectivo</p>
                        </div>
                    </div>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                    <thead>
                        <tr style="background: linear-gradient(135deg, #ff7b00, #ff9100); color: white;">
                            <th style="padding: 12px; text-align: left; border-radius: 6px 0 0 0;">Producto</th>
                            <th style="padding: 12px; text-align: center;">Cant.</th>
                            <th style="padding: 12px; text-align: right;">P. Unit.</th>
                            <th style="padding: 12px; text-align: right; border-radius: 0 6px 0 0;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productosHTML}
                    </tbody>
                </table>
                
                <div class="factura-totales" style="margin-top: 25px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 15px;">
                        <span><strong>Subtotal:</strong></span>
                        <span>$${subtotal.toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 15px;">
                        <span><strong>IVA (16%):</strong></span>
                        <span>$${iva.toFixed(2)}</span>
                    </div>
                    <hr style="border: none; border-top: 2px solid #ddd; margin: 12px 0;">
                    <div style="display: flex; justify-content: space-between; margin: 12px 0; font-size: 22px; color: #ff7b00;">
                        <span><strong>TOTAL:</strong></span>
                        <span><strong>$${total.toFixed(2)}</strong></span>
                    </div>
                </div>
                
                <div class="factura-footer" style="margin-top: 25px; padding-top: 20px; border-top: 2px solid #ff7b00; text-align: center;">
                    <p style="color: #666; font-size: 14px; margin: 8px 0;">✨ ¡Gracias por tu compra! ✨</p>
                    <p style="color: #999; font-size: 12px; margin: 5px 0;">Este documento es una factura simulada con fines demostrativos</p>
                    <p style="color: #ccc; font-size: 11px; margin: 5px 0;">© 2026 Kamehouse Corporation - Todos los derechos reservados</p>
                </div>
            </div>
        `,
        icon: 'success',
        iconColor: '#ff7b00',
        confirmButtonText: '📥 Descargar Factura',
        showCancelButton: true,
        cancelButtonText: 'Cerrar',
        confirmButtonColor: '#ff7b00',
        cancelButtonColor: '#6c757d',
        width: '750px',
        padding: '2em',
        customClass: {
            popup: 'factura-popup',
            confirmButton: 'btn-factura-download'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            descargarFactura(productos, numeroFactura, fecha, subtotal, iva, total);
        }
    });
}

function descargarFactura(productos, numeroFactura, fecha, subtotal, iva, total) {
    // Crear contenido de la factura en formato texto
    let contenido = `
╔════════════════════════════════════════╗
║          🏠 KAMEHOUSE                  ║
║       Corporation Capsule              ║
║      RFC: KMH-123456-ABC              ║
╚════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            FACTURA DE COMPRA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Factura N°: ${numeroFactura}
📅 Fecha: ${fecha}
👤 Cliente: Usuario Kamehouse
💳 Método de Pago: Efectivo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            DETALLE DE COMPRA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    productos.forEach((p, index) => {
        contenido += `${index + 1}. ${p.nombre || p.titulo}\n`;
        contenido += `   Cantidad: ${p.cantidad} x $${p.precio.toFixed(2)} = $${(p.precio * p.cantidad).toFixed(2)}\n\n`;
    });

    contenido += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            RESUMEN DE PAGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Subtotal:              $${subtotal.toFixed(2)}
IVA (16%):             $${iva.toFixed(2)}
─────────────────────────────────────────
TOTAL A PAGAR:         $${total.toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ ¡Gracias por tu compra! ✨

Este documento es una factura simulada 
con fines demostrativos.

© 2026 Kamehouse Corporation
Todos los derechos reservados

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

    // Crear blob y descargar
    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Factura_Kamehouse_${numeroFactura}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    Toastify({
        text: "📥 Factura descargada exitosamente",
        duration: 3000,
        gravity: "top",
        position: "right",
        style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
            borderRadius: "2rem"
        }
    }).showToast();
}