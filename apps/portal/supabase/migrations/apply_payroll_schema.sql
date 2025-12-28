-- ============================================
-- APLICAR ESTE SCRIPT EN SUPABASE SQL EDITOR
-- ============================================

-- 1. Crear tabla de empleados
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  position TEXT NOT NULL,
  branch_id UUID REFERENCES branches(id),
  hire_date DATE NOT NULL,
  salary_type TEXT CHECK (salary_type IN ('monthly', 'biweekly', 'daily', 'hourly')) DEFAULT 'monthly',
  base_salary DECIMAL(10,2) NOT NULL CHECK (base_salary > 0),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Crear tabla de nómina
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
  payment_proof_url TEXT,
  status TEXT CHECK (status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_period CHECK (period_start <= period_end)
);

-- 3. Crear tabla de items de nómina
CREATE TABLE IF NOT EXISTS payroll_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  payroll_id UUID REFERENCES payroll(id) ON DELETE CASCADE NOT NULL,
  item_type TEXT CHECK (item_type IN ('bonus', 'deduction')) NOT NULL,
  concept TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Crear índices
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_active ON employees(active);
CREATE INDEX IF NOT EXISTS idx_payroll_employee ON payroll(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_status ON payroll(status);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_payroll_items_payroll ON payroll_items(payroll_id);

-- 5. Habilitar RLS
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items ENABLE ROW LEVEL SECURITY;

-- 6. Políticas de seguridad
CREATE POLICY "Authenticated users can view employees" 
  ON employees FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view payroll" 
  ON payroll FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view payroll items" 
  ON payroll_items FOR SELECT 
  USING (auth.role() = 'authenticated');

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

-- 7. Trigger para updated_at
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
