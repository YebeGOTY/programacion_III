import os
from flask import Flask, request, render_template, redirect, url_for, session, flash, jsonify
from flask_bcrypt import Bcrypt
from pymongo import MongoClient
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from itsdangerous import URLSafeTimedSerializer as Serializer
from dotenv import load_dotenv
from functools import wraps
from bson import ObjectId
import json

load_dotenv()
app = Flask(__name__)
bcrypt = Bcrypt(app)

app.secret_key = os.getenv("SECRET_KEY")

client = MongoClient(os.getenv("MONGO_URI"))
db = client['db1'] 
collection = db['usuarios'] 
productos_collection = db['productos']
carritos_collection = db['carritos']

SENDGRID_API_KEY = os.getenv("SENDGRID_KEY") 

serializer = Serializer(app.secret_key, salt='password-reset-salt')

def enviar_email(destinatario, asunto, cuerpo):
    mensaje = Mail(
        from_email='miniyebe@gmail.com',
        to_emails=destinatario,
        subject=asunto,
        html_content=cuerpo
    )
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY) 
        response = sg.send(mensaje)
        print(f"Correo enviado con éxito! Status code: {response.status_code}")
    except Exception as e:
        print(f"Error al enviar el correo: {e}")

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'usuario' not in session or session.get('role') != 'admin':
            flash("Acceso denegado: Se requieren permisos de administrador.")
            return redirect(url_for('pagina_principal'))
        return f(*args, **kwargs)
    return decorated_function

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'usuario' not in session:
            flash("Debes iniciar sesión para acceder a esta página.")
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def home():
    if 'usuario' not in session:
        return redirect(url_for('login'))
    return redirect(url_for('pagina_principal'))

@app.route('/register', methods=['GET', 'POST'])
def registro():
    if request.method == 'POST':
        usuario = request.form['usuario']
        email = request.form['email']
        contrasena = request.form['contrasena']

        if collection.find_one({'email': email}):
            flash("El correo electrónico ya está registrado.")
            return redirect(url_for('registro'))

        hashed_password = bcrypt.generate_password_hash(contrasena).decode('utf-8')

        collection.insert_one({
            'usuario': usuario,
            'email': email,
            'contrasena': hashed_password
        })
        
        session['usuario'] = usuario
        return redirect(url_for('pagina_principal'))

    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        usuario = request.form['usuario']
        contrasena = request.form['contrasena']

        user = collection.find_one({'usuario': usuario})
        
        if user and bcrypt.check_password_hash(user['contrasena'], contrasena):
            session['usuario'] = usuario
            session['role'] = user.get('role', 'cliente') 
            return redirect(url_for('pagina_principal'))
        else:
            flash("Usuario o contraseña incorrectos.")
            return render_template('login.html')

    return render_template('login.html')

@app.route('/pagina_principal')
def pagina_principal():
    if 'usuario' not in session:
        return redirect(url_for('login'))
    return render_template('index.html', usuario=session['usuario'])

@app.route('/carrito')
def carrito():
    if 'usuario' not in session:
        return redirect(url_for('login'))
    return render_template('carrito.html', usuario=session['usuario'])

@app.route('/mi_perfil')
def mi_perfil():
    if 'usuario' not in session:
        return redirect(url_for('login'))
    
    usuario = session['usuario']
    user_data = collection.find_one({'usuario': usuario})
    return render_template('mi_perfil.html', usuario=user_data['usuario'], email=user_data['email'])


@app.route('/admin/productos')
@admin_required
def admin_productos():
    """Panel de administración de productos - solo admin"""
    return render_template('agregar_productos.html', usuario=session['usuario'])

@app.route('/api/productos', methods=['GET'])
@login_required
def obtener_productos():
    categoria = request.args.get('categoria', None)
    
    if categoria and categoria != 'todos':
        # Búsqueda case-insensitive
        productos = list(productos_collection.find({'categoria': {'$regex': f'^{categoria}$', '$options': 'i'}}))
    else:
        productos = list(productos_collection.find())
    
    for producto in productos:
        producto['_id'] = str(producto['_id'])
    
    return jsonify(productos)

@app.route('/api/productos/buscar', methods=['GET'])
@login_required
def buscar_productos():
    termino = request.args.get('q', '').strip()
    
    if not termino:
        return jsonify([])
    
    productos = list(productos_collection.find({
        '$or': [
            {'codigo': {'$regex': termino, '$options': 'i'}},
            {'nombre': {'$regex': termino, '$options': 'i'}}
        ]
    }))
    
    for producto in productos:
        producto['_id'] = str(producto['_id'])
    
    return jsonify(productos)

@app.route('/api/productos/<producto_id>', methods=['GET'])
@login_required
def obtener_producto(producto_id):
    try:
        producto = productos_collection.find_one({'_id': ObjectId(producto_id)})
        if producto:
            producto['_id'] = str(producto['_id'])
            return jsonify(producto)
        return jsonify({'error': 'Producto no encontrado'}), 404
    except:
        return jsonify({'error': 'ID inválido'}), 400

@app.route('/api/productos', methods=['POST'])
@admin_required
def crear_producto():
    data = request.get_json()
    
    # Validar datos requeridos
    if not all(k in data for k in ['nombre', 'precio', 'codigo', 'categoria']):
        return jsonify({'error': 'Faltan campos requeridos'}), 400

    if productos_collection.find_one({'codigo': data['codigo']}):
        return jsonify({'error': 'El código ya existe'}), 400
    
    nuevo_producto = {
        'nombre': data['nombre'],
        'precio': float(data['precio']),
        'codigo': data['codigo'],
        'categoria': data['categoria'],
        'imagen': data.get('imagen', './img/default.jpg'),
        'stock': data.get('stock', 0)
    }
    
    resultado = productos_collection.insert_one(nuevo_producto)
    nuevo_producto['_id'] = str(resultado.inserted_id)
    
    return jsonify(nuevo_producto), 201

@app.route('/api/productos/<producto_id>', methods=['PUT'])
@admin_required
def actualizar_producto(producto_id):
    try:
        data = request.get_json()
        
        producto_existente = productos_collection.find_one({'_id': ObjectId(producto_id)})
        if not producto_existente:
            return jsonify({'error': 'Producto no encontrado'}), 404
        
        # Si se cambia el código, verificar que no exista otro producto con ese código
        if 'codigo' in data and data['codigo'] != producto_existente['codigo']:
            if productos_collection.find_one({'codigo': data['codigo']}):
                return jsonify({'error': 'El código ya existe'}), 400
        
        datos_actualizados = {}
        campos_permitidos = ['nombre', 'precio', 'descripcion', 'codigo', 'categoria', 'imagen', 'stock']
        
        for campo in campos_permitidos:
            if campo in data:
                if campo == 'precio':
                    datos_actualizados[campo] = float(data[campo])
                elif campo == 'stock':
                    datos_actualizados[campo] = int(data[campo])
                else:
                    datos_actualizados[campo] = data[campo]
        
        productos_collection.update_one(
            {'_id': ObjectId(producto_id)},
            {'$set': datos_actualizados}
        )
        
        producto_actualizado = productos_collection.find_one({'_id': ObjectId(producto_id)})
        producto_actualizado['_id'] = str(producto_actualizado['_id'])
        
        return jsonify(producto_actualizado)
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/productos/<producto_id>', methods=['DELETE'])
@admin_required
def eliminar_producto(producto_id):
    try:
        resultado = productos_collection.delete_one({'_id': ObjectId(producto_id)})
        
        if resultado.deleted_count == 0:
            return jsonify({'error': 'Producto no encontrado'}), 404
        
        return jsonify({'mensaje': 'Producto eliminado exitosamente'})
    except:
        return jsonify({'error': 'ID inválido'}), 400

# NUEVO ENDPOINT PARA PROCESAR COMPRA Y ACTUALIZAR STOCK
@app.route('/api/procesar-compra', methods=['POST'])
@login_required
def procesar_compra():
    try:
        data = request.get_json()
        productos_comprados = data.get('productos', [])
        
        if not productos_comprados:
            return jsonify({'error': 'No hay productos en el carrito'}), 400
        
        # Verificar stock disponible antes de procesar
        for item in productos_comprados:
            producto_id = item.get('_id') or item.get('id')
            cantidad = item.get('cantidad', 0)
            
            producto = productos_collection.find_one({'_id': ObjectId(producto_id)})
            if not producto:
                return jsonify({'error': f'Producto {producto_id} no encontrado'}), 404
            
            if producto['stock'] < cantidad:
                return jsonify({
                    'error': f'Stock insuficiente para {producto["nombre"]}. Disponible: {producto["stock"]}, Solicitado: {cantidad}'
                }), 400
        
        # Actualizar stock de cada producto
        for item in productos_comprados:
            producto_id = item.get('_id') or item.get('id')
            cantidad = item.get('cantidad', 0)
            
            productos_collection.update_one(
                {'_id': ObjectId(producto_id)},
                {'$inc': {'stock': -cantidad}}
            )
        
        return jsonify({
            'mensaje': 'Compra procesada exitosamente',
            'productos_actualizados': len(productos_comprados)
        }), 200
        
    except Exception as e:
        print(f"Error al procesar compra: {e}")
        return jsonify({'error': str(e)}), 500

# NUEVO ENDPOINT PARA RESTABLECER STOCK DE TODOS LOS PRODUCTOS
@app.route('/api/productos/restablecer-stock', methods=['POST'])
@admin_required
def restablecer_stock():
    try:
        data = request.get_json()
        stock_default = data.get('stock_default', 10)
        
        # Actualizar todos los productos
        resultado = productos_collection.update_many(
            {},
            {'$set': {'stock': stock_default}}
        )
        
        return jsonify({
            'mensaje': f'Stock restablecido a {stock_default} unidades',
            'productos_actualizados': resultado.modified_count
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/recuperar_contrasena', methods=['GET', 'POST'])
def recuperar_contrasena():
    if request.method == 'POST':
        email = request.form['email']
        usuario = collection.find_one({'email': email})

        if usuario:
            token = serializer.dumps(email, salt='password-reset-salt')
            enlace = url_for('restablecer_contrasena', token=token, _external=True)
            asunto = "Recuperación de contraseña"
            cuerpo = f"""
            <p>Hola, hemos recibido una solicitud para restablecer tu contraseña.</p>
            <p>Si no has solicitado este cambio, ignora este mensaje.</p>
            <p>Para restablecer tu contraseña, haz clic en el siguiente enlace:</p>
            <a href="{enlace}">Restablecer contraseña</a>
            """
            enviar_email(email, asunto, cuerpo)
            flash("Te hemos enviado un correo para recuperar tu contraseña.", "success")
        else:
            flash("El correo electrónico no está registrado.", "error")

    return render_template('recuperar_contrasena.html')

@app.route('/restablecer_contrasena/<token>', methods=['GET', 'POST'])
def restablecer_contrasena(token):
    try:
        email = serializer.loads(token, salt='password-reset-salt', max_age=3600)
    except:
        flash("El enlace de restablecimiento ha caducado o es inválido.", "error")
        return redirect(url_for('recuperar_contrasena'))

    if request.method == 'POST':
        nueva_contrasena = request.form['nueva_contrasena']
        hashed_password = bcrypt.generate_password_hash(nueva_contrasena).decode('utf-8')
        collection.update_one({'email': email}, {'$set': {'contrasena': hashed_password}})
        flash("Tu contraseña ha sido restablecida con éxito.", "success")
        return redirect(url_for('login'))

    return render_template('restablecer_contrasena.html')

@app.route('/api/usuarios/<usuario_id>/rol', methods=['PUT'])
@admin_required
def actualizar_rol_usuario(usuario_id):
    """Actualizar el rol de un usuario"""
    try:
        data = request.get_json()
        nuevo_rol = data.get('role')
        
        if nuevo_rol not in ['admin', 'cliente']:
            return jsonify({'error': 'Rol inválido'}), 400
        
        # Verificar que el usuario existe
        usuario = collection.find_one({'_id': ObjectId(usuario_id)})
        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Actualizar rol
        collection.update_one(
            {'_id': ObjectId(usuario_id)},
            {'$set': {'role': nuevo_rol}}
        )
        
        return jsonify({
            'mensaje': 'Rol actualizado exitosamente',
            'usuario_id': usuario_id,
            'nuevo_rol': nuevo_rol
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/usuarios/<usuario_id>', methods=['DELETE'])
@admin_required
def eliminar_usuario(usuario_id):
    """Eliminar un usuario"""
    try:
        # Verificar que el usuario existe
        usuario = collection.find_one({'_id': ObjectId(usuario_id)})
        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        # Evitar que un admin se elimine a sí mismo
        if usuario['usuario'] == session.get('usuario'):
            return jsonify({'error': 'No puedes eliminar tu propia cuenta'}), 400
        
        # Eliminar usuario
        resultado = collection.delete_one({'_id': ObjectId(usuario_id)})
        
        if resultado.deleted_count == 0:
            return jsonify({'error': 'No se pudo eliminar el usuario'}), 500
        
        return jsonify({
            'mensaje': 'Usuario eliminado exitosamente',
            'usuario_eliminado': usuario['usuario']
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/admin')
@admin_required
def panel_admin():
    todos_los_usuarios = list(collection.find())
    return render_template('panel_admin.html', usuarios=todos_los_usuarios)

@app.route('/logout')
def logout():
    session.pop('usuario', None)
    return redirect(url_for('login'))

if __name__ == '__main__':
    app.run(debug=True)