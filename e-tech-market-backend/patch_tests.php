<?php
$files = glob(__DIR__ . '/tests/Feature/*.php');
foreach ($files as $file) {
    $content = file_get_contents($file);
    // Prefix /api/admin with /api/v1/admin, /api/auth with /api/v1/auth, /api/products with /api/v1/products, etc.
    $content = str_replace([
        "'/api/admin",
        "'/api/auth",
        "'/api/products",
        "'/api/cart",
        "'/api/orders",
        "'/api/payments",
        "'/api/news",
        "'/api/newsletter",
        "'/api/chatbot",
        "'/api/profile",
        "'/api/coupons",
    ], [
        "'/api/v1/admin",
        "'/api/v1/auth",
        "'/api/v1/products",
        "'/api/v1/cart",
        "'/api/v1/orders",
        "'/api/v1/payments",
        "'/api/v1/news",
        "'/api/v1/newsletter",
        "'/api/v1/chatbot",
        "'/api/v1/profile",
        "'/api/v1/coupons",
    ], $content);

    // Double check if some already have /v1/ to avoid /api/v1/v1/
    $content = str_replace("'/api/v1/v1/", "'/api/v1/", $content);
    file_put_contents($file, $content);
}
echo "Tests patched.\n";
