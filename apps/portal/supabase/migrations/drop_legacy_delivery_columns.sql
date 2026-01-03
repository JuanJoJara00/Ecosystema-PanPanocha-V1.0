-- Drop legacy columns to enforce canonical naming
alter table deliveries drop column if exists delivery_cost;
alter table deliveries drop column if exists delivery_person;
