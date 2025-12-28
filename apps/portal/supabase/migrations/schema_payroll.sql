-- ============================================
-- SCHEMA: Payroll & Employees Management
-- ============================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: employees
-- ============================================
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  position TEXT NOT NULL, -- Cargo: cajero, cocinero, gerente, etc.
  branch_id UUID REFERENCES branches(id), -- Sede asignada
  hire_date DATE NOT NULL,
  salary_type TEXT CHECK (salary_type IN ('monthly', 'biweekly', 'daily', 'hourly')) DEFAULT 'monthly',
  base_salary DECIMAL(10,2) NOT NULL CHECK (base_salary > 0),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLE: payroll
-- ============================================
CREATE TABLE IF NOT EXISTS payroll (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  base_amount DECIMAL(10,2) NOT NULL CHECK (base_amount >= 0),
  bonuses DECIMAL(10,2) DEFAULT 0 CHECK (bonuses >= 0),
  deductions DECIMAL(10,2) DEFAULT 0 CHECK (deductions >= 0),
  net_amount DECIMAL(10,2) GENERATED ALWAYS AS (base_amount + bonuses - deductions) STORED,
  payment_date DATE,
  payment_method TEXT CHECK (payment_method IN ('cash', 'transfer', 'check')),
  payment_proof_url TEXT, -- URL del comprobante de pago
  status TEXT CHECK (status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_period CHECK (period_start <= period_end)
);

-- ============================================
-- TABLE: payroll_items
-- ============================================
CREATE TABLE IF NOT EXISTS payroll_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  payroll_id UUID REFERENCES payroll(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT CHECK (item_type IN ('bonus', 'deduction')) NOT NULL,
  concept TEXT NOT NULL, -- Ej: "Horas extra", "Seguro social", "Préstamo"
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_items_payroll ON payroll_items(payroll_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;

-- Policies: Authenticated users can view
CREATE POLICY "Authenticated users can view employees" 
  ON employees FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view payroll" 
  ON payroll FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view payroll items" 
  ON payroll_items FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Policies: Only admins can insert/update/delete
CREATE POLICY "Admins can insert employees" 
  ON employees FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update employees" 
  ON employees FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert payroll" 
  ON payroll FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update payroll" 
  ON payroll FOR UPDATE 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert payroll items" 
  ON payroll_items FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employees_updated_at 
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payroll_updated_at 
  BEFORE UPDATE ON payroll
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================
-- Uncomment to insert sample employees
/*
INSERT INTO employees (full_name, email, phone, position, branch_id, hire_date, salary_type, base_salary) 
SELECT 
  'Juan Pérez', 
  'juan.perez@panpanocha.com', 
  '3001234567', 
  'Cajero', 
  id, 
  '2024-01-15', 
  'monthly', 
  1200000
FROM branches WHERE name = 'Sede Cerritos' LIMIT 1;

INSERT INTO employees (full_name, email, phone, position, branch_id, hire_date, salary_type, base_salary) 
SELECT 
  'María García', 
  'maria.garcia@panpanocha.com', 
  '3007654321', 
  'Cocinera', 
  id, 
  '2024-02-01', 
  'monthly', 
  1400000
FROM branches WHERE name = 'Sede Dosquebradas' LIMIT 1;
*/
