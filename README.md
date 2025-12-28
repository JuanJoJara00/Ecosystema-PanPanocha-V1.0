# 🥐 Ecosistema Digital PanPanocha

Plataforma unificada de gestión y ventas diseñada bajo una arquitectura de **Monorepo** escalable. Este repositorio integra todas las herramientas digitales para la operación de Pan Panocha, desde la facturación en tienda hasta la administración estratégica en la nube.

## 🚀 Arquitectura del Sistema

El ecosistema se divide en dos aplicaciones principales que comparten lógica de negocio y tipado estricto:

### 🖥️ 1. PanPanocha POS (`apps/pos`)
**El motor de la operación en tienda.**
Una aplicación de escritorio robusta y veloz, diseñada con filosofía **Offline-First** para garantizar ventas ininterrumpidas sin dependencia de internet.

- **Core**: Electron 39 + Vite + React 19.
- **Base de Datos**: SQLite local (via `better-sqlite3`) gestionada con **Drizzle ORM**.
- **Sincronización**: Motor de sincronización bidireccional (PowerSync) que asegura la consistencia de datos con la nube cuando hay conexión.
- **Hardware**: Integración nativa con impresoras térmicas, lectores de código y cajones de dinero.

### 🌐 2. PanPanocha Portal (`apps/portal`)
**El centro de comando administrativo.**
Aplicación web moderna para la gestión remota del negocio, inventarios, empleados y análisis de datos en tiempo real.

- **Framework**: Next.js 16 (App Router) para máximo rendimiento y SEO.
- **Backend as a Service**: **Supabase** (PostgreSQL) para autenticación, almacenamiento y base de datos central.
- **Estilos**: Tailwind CSS 4 con un sistema de diseño personalizado.

---

## 🛠️ Tecnologías Compartidas (`packages/*`)

Utilizamos **pnpm workspaces** para modularizar y reutilizar código eficientemente:

*   **`@panpanocha/types`**: Biblioteca de definiciones TypeScript que actúa como la *Single Source of Truth* para todo el ecosistema, garantizando consistencia de datos entre el POS y el Portal.
*   **`@panpanocha/config`**: Configuraciones base unificadas para ESLint, TypeScript y Tailwind, asegurando estándares de calidad de código idénticos en ambos proyectos.
*   **`@panpanocha/ui`**: Sistema de diseño compartido (en desarrollo) para mantener identidad visual coherente.

## ⚡ Stack Tecnológico Destacado

*   **Lenguaje**: 100% TypeScript.
*   **Frontend**: React 19 (aprovechando las últimas mejoras de concurrencia).
*   **Gestor de Paquetes**: pnpm (rápido y eficiente con espacio en disco).
*   **Seguridad**: Autenticación centralizada y manejo seguro de variables de entorno.

## 📝 Licencia

UNLICENSED - Proyecto privado para Pan Panocha
