-- Add min_stock_alert to branch_ingredients for per-branch thresholds
-- Default to 0 if not set

ALTER TABLE "public"."branch_ingredients" 
ADD COLUMN "min_stock_alert" double precision DEFAULT 0;

COMMENT ON COLUMN "public"."branch_ingredients"."min_stock_alert" IS 'Low stock threshold in Base/Usage Units (e.g. grams)';
