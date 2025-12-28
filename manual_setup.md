# 🛠️ Manual Setup Guide: PowerSync & Supabase Infrastructure

Parece que tu base de datos en Supabase estaba vacía (error `relation "users" does not exist`). Este manual te guiará paso a paso para inicializar la infraestructura correcta.

---

## 1. Inicializar la Base de Datos (Supabase)

Como estamos pivotando a "Foundation First", vamos a crear las tablas con la estructura correcta (UUIDs) desde cero.

1.  Ve a tu **Supabase Dashboard** > **SQL Editor**.
2.  Crea una **New Query**.
3.  Copia y pega el contenido del archivo `20251226155500_initial_schema.sql` (que he creado en tu carpeta `supabase/migrations`).
    *   *Nota: Este script crea todas las tablas (`users`, `products`, `orders`, etc.) y habilita los UUIDs.*
4.  Ejecuta la Query (**Run**). ✅ Deberías ver "Success".

## 2. Configurar la "Publicación" para Sincronización

Ahora que las tablas existen, debemos decirle a Postgres qué tablas se pueden sincronizar.

1.  En el **SQL Editor** de Supabase.
2.  Copia y pega el contenido de `20251226160000_powersync_setup.sql`.
    *   `CREATE PUBLICATION powersync FOR TABLE ...`
3.  Ejecuta la Query. ✅

## 3. Configurar PowerSync Dashboard

Ahora conectaremos el "Motor de Sincronización".

1.  Ve a [powersync.com](https://www.powersync.com/) y crea una cuenta (o logueate).
2.  Crea una **New Instance**. Llámala `panpanocha-pos`.
3.  En **Connections**, selecciona **Supabase**.
4.  Sigue las instrucciones para pegar la conexión (PowerSync te dará un comando SQL para ejecutar en Supabase que crea un usuario de base de datos dedicado para la replicación). **Ejecuta ese comando en Supabase**.
5.  Una vez conectado, ve a la pestaña **Sync Rules** (Client Side Rules).
6.  Pega el siguiente archivo de reglas básico (`sync-rules.yaml`):

```yaml
bucket_definitions:
  global:
    # Datos compartidos por todas las sucursales (Menú, Usuarios)
    data:
      - SELECT * FROM products
      - SELECT * FROM users
      - SELECT * FROM branches
      - SELECT * FROM tables
  
  transactions:
    # Datos transaccionales (se filtrarán por usuario/sucursal en el futuro)
    data:
      - SELECT * FROM shifts
      - SELECT * FROM orders
      - SELECT * FROM order_items
      - SELECT * FROM clients
      - SELECT * FROM expenses
      - SELECT * FROM transaction_events
```

7.  Dale a **Validate** y **Deploy**.

## 4. Obtener Credenciales para el POS

Para que tu código local funcione, necesitamos las credenciales.

1.  En PowerSync Dashboard, ve a **Development Credentials** (o "Usage" > "Instance URL").
2.  Necesito dos cosas:
    *   **PowerSync Instance URL** (ej. `https://foo.powersync.city`)
    *   **PowerSync Token** (temporal para desarrollo) O confírmame si usaremos Supabase Auth directamente (recomendado).

---

### 📂 Archivos Generados
He dejado los archivos SQL listos en tu carpeta para que solo tengas que copiar y pegar:

1.  `supabase/migrations/20251226155500_initial_schema.sql` (LAS TABLAS)
2.  `supabase/migrations/20251226160000_powersync_setup.sql` (LA PUBLICACIÓN)
3.  `supabase/migrations/20251226161000_devices_setup.sql` (SEGURIDAD DISPOSITIVOS)

¡Avísame cuando hayas ejecutado el Paso 1 y 2 para continuar! 🚀
