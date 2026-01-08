-- Create a function to handle atomic sales batch synchronization
-- This ensures that a sale header and its items are committed together.

CREATE OR REPLACE FUNCTION public.upsert_sales_batch(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of creator (service_role usually)
AS $$
DECLARE
    sale_record jsonb;
    item_record jsonb;
    v_sale_id uuid;
    v_success_count int := 0;
    v_error_count int := 0;
    v_errors jsonb := '[]'::jsonb;
BEGIN
    -- Iterate through each sale in the payload
    FOR sale_record IN SELECT * FROM jsonb_array_elements(payload)
    LOOP
        BEGIN
            -- Extract Sale ID
            v_sale_id := (sale_record->>'id')::uuid;

            -- 1. Upsert Sale Header
            INSERT INTO public.sales (
                id, organization_id, branch_id, shift_id, 
                subtotal, discount, total, 
                payment_method, status, 
                created_at, updated_at, 
                customer_id, created_by
            )
            VALUES (
                v_sale_id,
                (sale_record->>'organization_id')::uuid,
                (sale_record->>'branch_id')::uuid,
                (sale_record->>'shift_id')::uuid,
                (sale_record->>'subtotal')::numeric,
                (sale_record->>'discount')::numeric,
                (sale_record->>'total')::numeric,
                sale_record->>'payment_method',
                sale_record->>'status',
                (sale_record->>'created_at')::timestamptz,
                NOW(), -- updated_at
                (sale_record->>'customer_id')::uuid,
                (sale_record->>'created_by')::uuid
            )
            ON CONFLICT (id) DO UPDATE SET
                subtotal = EXCLUDED.subtotal,
                discount = EXCLUDED.discount,
                total = EXCLUDED.total,
                payment_method = EXCLUDED.payment_method,
                status = EXCLUDED.status,
                updated_at = NOW();

            -- 2. Upsert Sale Items (Iterate through items array in JSON)
            IF sale_record ? 'items' AND jsonb_array_length(sale_record->'items') > 0 THEN
                FOR item_record IN SELECT * FROM jsonb_array_elements(sale_record->'items')
                LOOP
                    INSERT INTO public.sale_items (
                        id, sale_id, product_id, 
                        quantity, unit_price, total_price, 
                        initial_cost, created_at
                    )
                    VALUES (
                        (item_record->>'id')::uuid,
                        v_sale_id,
                        (item_record->>'product_id')::uuid,
                        (item_record->>'quantity')::int,
                        (item_record->>'unit_price')::numeric,
                        (item_record->>'total_price')::numeric,
                        (item_record->>'initial_cost')::numeric,
                        (item_record->>'created_at')::timestamptz
                    )
                    ON CONFLICT (id) DO UPDATE SET
                        quantity = EXCLUDED.quantity,
                        unit_price = EXCLUDED.unit_price,
                        total_price = EXCLUDED.total_price,
                        initial_cost = EXCLUDED.initial_cost;
                END LOOP;
            END IF;

            v_success_count := v_success_count + 1;

        EXCEPTION WHEN OTHERS THEN
            v_error_count := v_error_count + 1;
            v_errors := v_errors || jsonb_build_object(
                'sale_id', v_sale_id, 
                'error', SQLERRM
            );
            -- Loop continues to next sale, but THIS sale's transaction block failed?
            -- Wait, nested transactions in Postgres loops are savepoints. 
            -- Yes, the exception block inside the loop handles safe rollback for this iteration.
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'success_count', v_success_count,
        'error_count', v_error_count,
        'errors', v_errors
    );
END;
$$;
