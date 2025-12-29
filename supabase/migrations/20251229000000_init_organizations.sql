-- Migration: 20251229000000_init_organizations.sql

-- 1. Crear la tabla de organizaciones
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true
);

-- 2. Habilitar RLS en organizaciones para proteger los datos del inquilino
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 3. Crear índice para búsquedas rápidas por slug (login flow)
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- 4. Insertar una organización placeholder por defecto para datos legados
-- Esto asegura que los datos existentes tengan un "hogar" antes de la migración estricta
INSERT INTO organizations (id, name, slug)
VALUES ('00000000-0000-0000-0000-000000000000', 'PanPanocha Legacy', 'legacy')
ON CONFLICT (id) DO NOTHING;
