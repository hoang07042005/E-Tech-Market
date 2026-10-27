Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   KHOI PHUC DATABASE ETECH_MARKET (UTF-8)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

Write-Host "`n[1/3] Copying clean UTF-8 SQL into Docker..." -ForegroundColor Yellow
docker cp .\etech_clean_utf8.sql etech_db:/tmp/etech_clean_utf8.sql

Write-Host "`n[2/3] Restoring clean UTF-8 schema, products and users..." -ForegroundColor Yellow
@'
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

\i /tmp/etech_clean_utf8.sql

CREATE TABLE IF NOT EXISTS public.category_coupon (
    category_id bigint NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    coupon_id bigint NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    PRIMARY KEY (category_id, coupon_id)
);

CREATE TABLE IF NOT EXISTS public.product_video (
    id bigserial PRIMARY KEY,
    video_id bigint NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at timestamp(0) without time zone DEFAULT now(),
    updated_at timestamp(0) without time zone DEFAULT now()
);

UPDATE public.users 
SET password = '$2y$10$I5curck5.TReZKO9l/uH/e.8NBsmmXPhe.1z0sVkC1BrnYHvguEsy', 
    updated_at = NOW() 
WHERE email IN ('admin@etech.com', 'doviethoang@gmail.com', 'doviethoang07042005@gmail.com');

INSERT INTO public.model_has_roles (role_id, model_type, model_id)
SELECT 58, 'App\Models\User', id FROM public.users WHERE email IN ('admin@etech.com', 'doviethoang@gmail.com', 'doviethoang07042005@gmail.com')
ON CONFLICT DO NOTHING;

INSERT INTO public.model_has_roles (role_id, model_type, model_id)
SELECT 59, 'App\Models\User', id FROM public.users WHERE email IN ('admin@etech.com', 'doviethoang@gmail.com', 'doviethoang07042005@gmail.com')
ON CONFLICT DO NOTHING;

SELECT id, name, email FROM public.users WHERE email IN ('admin@etech.com', 'doviethoang@gmail.com', 'doviethoang07042005@gmail.com');
'@ | docker compose exec -T db psql -U postgres -d etech_market

Write-Host "`n[3/3] Restarting backend container..." -ForegroundColor Yellow
docker compose up -d backend queue_worker

Write-Host "`n=== THANH CONG! He thong da khoi phuc hoan toan UTF-8 tieng Viet! ===" -ForegroundColor Green
Write-Host "Tai khoan Admin: doviethoang@gmail.com (hoac admin@etech.com)" -ForegroundColor Green
Write-Host "Mat khau: 1234567890" -ForegroundColor Green
