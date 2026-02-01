// Variables globales
let usuarioIdActual = null;
let usuariosOriginales = [];

// Elementos del DOM
const searchInput = document.getElementById('search-usuarios');
const usuariosTbody = document.getElementById('usuarios-tbody');
const noResults = document.getElementById('no-results');
const modalEditarRol = document.getElementById('modal-editar-rol');
const modalEliminar = document.getElementById('modal-eliminar');
const selectRol = document.getElementById('select-rol');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    console.log('Panel de administración cargado');
    
    // Guardar usuarios originales para búsqueda
    const filas = usuariosTbody.querySelectorAll('tr');
    usuariosOriginales = Array.from(filas);
    console.log(`Total usuarios cargados: ${usuariosOriginales.length}`);
    
    // Configurar búsqueda
    if (searchInput) {
        searchInput.addEventListener('input', filtrarUsuarios);
    }
});

// Función de búsqueda
function filtrarUsuarios() {
    const termino = searchInput.value.toLowerCase().trim();
    
    if (!termino) {
        // Mostrar todos los usuarios
        usuariosOriginales.forEach(fila => {
            fila.style.display = '';
        });
        noResults.style.display = 'none';
        return;
    }
    
    let encontrados = 0;
    
    usuariosOriginales.forEach(fila => {
        const usuario = fila.querySelector('td:nth-child(1)').textContent.toLowerCase();
        const email = fila.querySelector('td:nth-child(2)').textContent.toLowerCase();
        
        if (usuario.includes(termino) || email.includes(termino)) {
            fila.style.display = '';
            encontrados++;
        } else {
            fila.style.display = 'none';
        }
    });
    
    // Mostrar mensaje si no hay resultados
    if (encontrados === 0) {
        noResults.style.display = 'block';
    } else {
        noResults.style.display = 'none';
    }
}

// Abrir modal para editar rol
function editarRol(usuarioId, nombreUsuario, rolActual) {
    console.log('Editando rol:', { usuarioId, nombreUsuario, rolActual });
    
    usuarioIdActual = usuarioId;
    
    document.getElementById('modal-usuario-nombre').textContent = nombreUsuario;
    selectRol.value = rolActual || 'cliente';
    
    modalEditarRol.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Cerrar modal de editar rol
function cerrarModalRol() {
    modalEditarRol.classList.remove('active');
    document.body.style.overflow = '';
    usuarioIdActual = null;
}

// Guardar cambio de rol
async function guardarRol() {
    if (!usuarioIdActual) {
        console.error('No hay usuario seleccionado');
        return;
    }
    
    const nuevoRol = selectRol.value;
    console.log('Guardando rol:', { usuarioIdActual, nuevoRol });
    
    try {
        const response = await fetch(`/api/usuarios/${usuarioIdActual}/rol`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: nuevoRol })
        });
        
        console.log('Respuesta del servidor:', response.status);
        const data = await response.json();
        console.log('Datos recibidos:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al actualizar rol');
        }
        
        mostrarToast('Rol actualizado exitosamente', 'success');
        cerrarModalRol();
        
        // Actualizar la tabla sin recargar
        setTimeout(() => {
            location.reload();
        }, 1000);
        
    } catch (error) {
        console.error('Error al guardar rol:', error);
        mostrarToast(error.message, 'error');
    }
}

// Abrir modal para confirmar eliminación
function confirmarEliminar(usuarioId, nombreUsuario) {
    console.log('Confirmando eliminación:', { usuarioId, nombreUsuario });
    
    usuarioIdActual = usuarioId;
    
    document.getElementById('modal-usuario-eliminar').textContent = nombreUsuario;
    
    modalEliminar.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Cerrar modal de eliminar
function cerrarModalEliminar() {
    modalEliminar.classList.remove('active');
    document.body.style.overflow = '';
    usuarioIdActual = null;
}

// Eliminar usuario
async function eliminarUsuario() {
    if (!usuarioIdActual) {
        console.error('No hay usuario seleccionado para eliminar');
        return;
    }
    
    console.log('Eliminando usuario:', usuarioIdActual);
    
    try {
        const response = await fetch(`/api/usuarios/${usuarioIdActual}`, {
            method: 'DELETE'
        });
        
        console.log('Respuesta del servidor:', response.status);
        const data = await response.json();
        console.log('Datos recibidos:', data);
        
        if (!response.ok) {
            throw new Error(data.error || 'Error al eliminar usuario');
        }
        
        mostrarToast('Usuario eliminado exitosamente', 'success');
        cerrarModalEliminar();
        
        // Eliminar fila de la tabla
        const fila = document.querySelector(`tr[data-usuario-id="${usuarioIdActual}"]`);
        if (fila) {
            fila.remove();
            
            // Actualizar array de usuarios originales
            usuariosOriginales = usuariosOriginales.filter(f => 
                f.getAttribute('data-usuario-id') !== usuarioIdActual
            );
            
            // Actualizar estadísticas
            actualizarEstadisticas();
        }
        
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        mostrarToast(error.message, 'error');
    }
}

// Actualizar estadísticas después de eliminar
function actualizarEstadisticas() {
    const totalUsuarios = usuariosOriginales.length;
    const totalAdmins = usuariosOriginales.filter(fila => 
        fila.querySelector('.badge-admin')
    ).length;
    const totalClientes = totalUsuarios - totalAdmins;
    
    const totalUsuariosEl = document.getElementById('total-usuarios');
    const totalAdminsEl = document.getElementById('total-admins');
    const totalClientesEl = document.getElementById('total-clientes');
    
    if (totalUsuariosEl) totalUsuariosEl.textContent = totalUsuarios;
    if (totalAdminsEl) totalAdminsEl.textContent = totalAdmins;
    if (totalClientesEl) totalClientesEl.textContent = totalClientes;
    
    console.log('Estadísticas actualizadas:', { totalUsuarios, totalAdmins, totalClientes });
}

// Mostrar toast de notificación
function mostrarToast(mensaje, tipo = 'info') {
    const toast = document.getElementById('toast');
    const iconos = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'info': 'fa-info-circle'
    };
    
    toast.className = `toast toast-${tipo}`;
    toast.innerHTML = `<i class="fas ${iconos[tipo]}"></i> ${mensaje}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Cerrar modales con tecla ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (modalEditarRol.classList.contains('active')) {
            cerrarModalRol();
        }
        if (modalEliminar.classList.contains('active')) {
            cerrarModalEliminar();
        }
    }
});

// Cerrar modales al hacer clic fuera
if (modalEditarRol) {
    modalEditarRol.addEventListener('click', (e) => {
        if (e.target === modalEditarRol) {
            cerrarModalRol();
        }
    });
}

if (modalEliminar) {
    modalEliminar.addEventListener('click', (e) => {
        if (e.target === modalEliminar) {
            cerrarModalEliminar();
        }
    });
}