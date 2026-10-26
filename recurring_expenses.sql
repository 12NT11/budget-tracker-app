CREATE TABLE IF NOT EXISTS recurring_expenses (
  id TEXT PRIMARY KEY,
  merchant TEXT,
  category TEXT,
  frequency TEXT CHECK (frequency IN ('monthly','weekly')),
  estimated_amount NUMERIC,
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  occurrences_count INTEGER,
  last_charged DATE,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS merchant TEXT;
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS estimated_amount NUMERIC;
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS day_of_month INTEGER;
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS occurrences_count INTEGER;
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS last_charged DATE;
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE recurring_expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE recurring_expenses ALTER COLUMN id TYPE TEXT;
ALTER TABLE recurring_expenses ALTER COLUMN name DROP NOT NULL;
ALTER TABLE recurring_expenses ALTER COLUMN amount DROP NOT NULL;
