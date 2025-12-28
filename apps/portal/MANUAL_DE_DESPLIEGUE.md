# 🚧 Tareas Manuales para el Desarrollador

Has dado un gran salto hacia una arquitectura profesional. Para activar los cambios, sigue estos pasos obligatorios:

## 1. Configuración de Seguridad (CRÍTICO)
El sistema ya no usa credenciales quemadas. Debes crear tu archivo de variables de entorno local.

## 1. Configuración de Seguridad (CRÍTICO)
He creado automáticamente el archivo `.env.local` en la raíz por ti.

1.  Abre el archivo `.env.local`.
2.  Sustituye `TU_CLAVE_ANON_KEY_AQUI` por tu llave real de Supabase.
    *   *Nota:* En Supabase, la **`anon` key** es equivalente a una **publishable key**. Es la clave pública segura para usar en el frontend.
3.  Verifica que la URL sea la correcta.

## 2. Validación de Base de Datos
He movido todos los scripts SQL dispersos a la carpeta `supabase/migrations`.
*   Si ya ejecutaste estos scripts en tu Supabase, no necesitas hacer nada.
*   Si son nuevos cambios, ve al SQL Editor de Supabase y copia/pega el contenido de los archivos relevantes de esa carpeta.

## 3. Arquitectura Multi-Marca (White-Label)
El sistema ahora soporta múltiples marcas con una estructura limpia.

### Estructura de Carpetas
Cada marca tiene su propia carpeta de configuración:
```
src/config/brands/
└── pan-panocha/      <-- Carpeta de la marca
    └── config.ts     <-- Configuración (Colores, Textos, Rutas)
```

### Cómo crear una Nueva Marca
1.  Duplica la carpeta `src/config/brands/pan-panocha/` y renómbrala (ej: `mi-nueva-marca`).
2.  Edita `config.ts` dentro de esa carpeta con los nuevos colores y nombre.
3.  Coloca el logo de la nueva marca en `public/images/` (o crea una carpeta `public/brands/mi-nueva-marca/logo.png`).
4.  Actualiza la ruta del logo en el archivo `config.ts`.

### Cómo cambiar la Marca Activa
Para cambiar la marca que se está construyendo/ejecutando:
1.  Abre `src/config/app-config.ts`.
2.  Cambia la línea del import:
```typescript
// Cambia esto:
import { config as currentBrandConfig } from './brands/pan-panocha/config'

// Por esto:
import { config as currentBrandConfig } from './brands/mi-nueva-marca/config'
```
3.  El sistema se actualizará automáticamente.

## 4. Verificación de Rendimiento
Ve a la sección de **Proveedores**.
*   Antes: Veías un spinner de carga y luego la lista.
*   Ahora: La lista debería aparecer instantáneamente (Server Side Rendering), y el filtrado por texto es inmediato.

## 5. Próximos Pasos (Tarea para ti)
*   **Iconos:** Reemplaza `/public/images/logo_v2.png` con tu propio logo si lo deseas.
*   **Depuración:** Si ves errores de tipo "missing Supabase Url", reinicia tu servidor de desarrollo (`npm run dev`) después de crear el archivo `.env.local`.
