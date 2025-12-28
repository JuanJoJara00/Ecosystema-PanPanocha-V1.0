-- Agregar columna payment_type a la tabla payroll
ALTER TABLE payroll 
ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('on_time', 'late', 'advance')) DEFAULT 'on_time';

-- Comentario: 
-- on_time = Al día (pago en el periodo correspondiente)
-- late = Atrasado (pago de periodo anterior)
-- advance = Avance/Adelanto (pago anticipado que se descontará después)
