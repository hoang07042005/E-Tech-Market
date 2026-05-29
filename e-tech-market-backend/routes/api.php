<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\VerificationController;
use App\Http\Controllers\Client\CartController;
use App\Http\Controllers\Client\CategoriesController;
use App\Http\Controllers\Client\ProductsController;
use App\Http\Controllers\Client\ProductNewsController;
use App\Http\Controllers\Client\OrdersController;
use App\Http\Controllers\Client\PaymentsController;
use App\Http\Controllers\Client\WishlistController;
use App\Http\Controllers\Client\ReviewsController;
use App\Http\Controllers\Client\ProductShopQnaController as ClientProductShopQnaController;
use App\Http\Controllers\Client\StoreProfileController;
use App\Http\Controllers\Client\NewsletterController;
use App\Http\Controllers\Client\NotificationsController as ClientNotificationsController;
use App\Http\Controllers\Client\ContactMessagesController as ContactMessagesController;
use App\Http\Controllers\Client\CouponsController as ClientCouponsController;
use App\Http\Controllers\Admin\ProductShopQnaController as AdminProductShopQnaController;
use App\Http\Controllers\Admin\ReviewsController as AdminReviewsController;
use App\Http\Controllers\Admin\ContactMessagesController as AdminContactMessagesController;
use App\Http\Controllers\Admin\CouponsController as AdminCouponsController;
use App\Http\Controllers\Admin\CategoriesController as AdminCategoriesController;
use App\Http\Controllers\Admin\ProductsController as AdminProductsController;
use App\Http\Controllers\Admin\ProductNewsController as AdminProductNewsController;
use App\Http\Controllers\Admin\UploadsController as AdminUploadsController;
use App\Http\Controllers\Admin\UsersController as AdminUsersController;
use App\Http\Controllers\Admin\RolesController as AdminRolesController;
use App\Http\Controllers\Admin\DashboardController as AdminDashboardController;
use App\Http\Controllers\Admin\OrdersController as AdminOrdersController;
use App\Http\Controllers\Admin\SettingsController as AdminSettingsController;
use App\Http\Controllers\Admin\ShippingZonesController as AdminShippingZonesController;
use App\Http\Controllers\Admin\ShippingMethodsController as AdminShippingMethodsController;
use App\Http\Controllers\Admin\BannerController as AdminBannerController;
use App\Http\Controllers\Client\BannerController as ClientBannerController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('throttle:5,1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/google-login', [AuthController::class, 'googleLogin']);
    Route::post('/auth/forgot-password', [PasswordResetController::class, 'forgot']);
    Route::post('/auth/reset-password', [PasswordResetController::class, 'reset']);
    
    Route::get('/auth/email/verify/{id}/{hash}', [VerificationController::class, 'verify'])
        ->middleware(['signed'])
        ->name('verification.verify');
});

Route::middleware('throttle:10,1')->group(function () {
    Route::post('/contact/messages', [ContactMessagesController::class, 'store']);
});

Route::get('/health', function () {
    $services = [
        'database' => 'unknown',
        'redis' => 'unknown',
    ];

    try {
        DB::connection()->getPdo();
        $services['database'] = 'ok';
    } catch (\Throwable $exception) {
        $services['database'] = 'error';
    }

    try {
        $pong = Redis::connection()->ping();
        $services['redis'] = $pong === 'PONG' || $pong === '+PONG' ? 'ok' : 'error';
    } catch (\Throwable $exception) {
        $services['redis'] = 'error';
    }

    $ok = $services['database'] === 'ok' && $services['redis'] === 'ok';

    return response()->json([
        'status' => $ok ? 'ok' : 'error',
        'services' => $services,
        'timestamp' => now()->toISOString(),
    ], $ok ? 200 : 503);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::patch('/me', [AuthController::class, 'updateMe']);
    Route::post('/me/avatar', [AuthController::class, 'updateAvatar']);
    Route::patch('/me/password', [AuthController::class, 'changePassword'])->middleware('throttle:5,1');
    Route::get('/me/sessions', [AuthController::class, 'sessions']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::post('/auth/email/verification-notification', [VerificationController::class, 'resend'])
        ->middleware(['throttle:6,1'])
        ->name('verification.send');

    Route::get('/cart', [CartController::class, 'show']);
    Route::post('/cart/items', [CartController::class, 'addItem']);
    Route::put('/cart/items/{product}', [CartController::class, 'updateItem']);
    Route::delete('/cart/items/{product}', [CartController::class, 'removeItem']);

    Route::post('/orders', [OrdersController::class, 'store']);
    Route::post('/orders/from-items', [OrdersController::class, 'storeFromItems']);
    Route::get('/orders', [OrdersController::class, 'index']);
    Route::get('/orders/{order}', [OrdersController::class, 'show']);
    Route::patch('/orders/{order}/cancel', [OrdersController::class, 'cancel']);
    Route::patch('/orders/{order}/confirm-received', [OrdersController::class, 'confirmReceived']);
    Route::patch('/orders/{order}/confirm-payment', [OrdersController::class, 'confirmPayment']);
    Route::post('/orders/{order}/return-request', [OrdersController::class, 'requestReturn']);
    Route::patch('/orders/{order}/return-request/confirm-refund', [OrdersController::class, 'confirmRefundReceived']);

    Route::post('/payments/vnpay/{order}/create', [PaymentsController::class, 'createVnpay']);
    Route::post('/payments/momo/{order}/create', [PaymentsController::class, 'createMomo']);

    Route::get('/wishlist', [WishlistController::class, 'index']);
    Route::post('/wishlist/toggle', [WishlistController::class, 'toggle']);

    Route::get('/notifications', [ClientNotificationsController::class, 'index']);
    Route::patch('/notifications/{notification}/read', [ClientNotificationsController::class, 'markRead']);
    Route::patch('/notifications/read-all', [ClientNotificationsController::class, 'markReadAll']);

    // Admin Routes
    Route::prefix('admin')->name('admin.')->middleware(['admin', 'throttle:30,1'])->group(function () {
        Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats'])->name('dashboard.stats'); 
        Route::get('/orders', [AdminOrdersController::class, 'index'])->name('orders'); 
        Route::get('/orders/{order}', [AdminOrdersController::class, 'show'])->name('orders'); 
        Route::patch('/orders/{order}', [AdminOrdersController::class, 'update'])->name('orders'); 
        Route::post('/orders/{order}/return-request/approve', [AdminOrdersController::class, 'approveReturnRequest'])->name('orders.return-request.approve'); 
        Route::post('/orders/{order}/return-request/reject', [AdminOrdersController::class, 'rejectReturnRequest'])->name('orders.return-request.reject'); 
        Route::post('/orders/{order}/return-request/refunded', [AdminOrdersController::class, 'markReturnRefunded'])->name('orders.return-request.refunded'); 
        Route::get('/settings', [AdminSettingsController::class, 'show'])->name('settings'); 
        Route::patch('/settings', [AdminSettingsController::class, 'update'])->name('settings'); 
        Route::get('/shipping/zones', [AdminShippingZonesController::class, 'index'])->name('shipping.zones'); 
        Route::post('/shipping/zones', [AdminShippingZonesController::class, 'store'])->name('shipping.zones'); 
        Route::patch('/shipping/zones/{zone}', [AdminShippingZonesController::class, 'update'])->name('shipping.zones'); 
        Route::delete('/shipping/zones/{zone}', [AdminShippingZonesController::class, 'destroy'])->name('shipping.zones'); 
        Route::get('/shipping/methods', [AdminShippingMethodsController::class, 'index'])->name('shipping.methods'); 
        Route::post('/shipping/methods', [AdminShippingMethodsController::class, 'store'])->name('shipping.methods'); 
        Route::patch('/shipping/methods/{method}', [AdminShippingMethodsController::class, 'update'])->name('shipping.methods'); 
        Route::delete('/shipping/methods/{method}', [AdminShippingMethodsController::class, 'destroy'])->name('shipping.methods'); 

        Route::get('/categories', [AdminCategoriesController::class, 'index'])->name('categories'); 
        Route::post('/categories', [AdminCategoriesController::class, 'store'])->name('categories'); 
        Route::put('/categories/{category}', [AdminCategoriesController::class, 'update'])->name('categories'); 
        Route::delete('/categories/{category}', [AdminCategoriesController::class, 'destroy'])->name('categories'); 

        Route::apiResource('video-categories', App\Http\Controllers\Admin\VideoCategoryController::class);

        Route::get('/roles', [AdminRolesController::class, 'index'])->name('roles'); 

        Route::get('/users', [AdminUsersController::class, 'index'])->name('users'); 
        Route::patch('/users/{user}', [AdminUsersController::class, 'update'])->name('users'); 
        Route::delete('/users/{user}', [AdminUsersController::class, 'destroy'])->name('users'); 

        Route::get('/products', [AdminProductsController::class, 'index'])->name('products'); 
        Route::get('/products/{product}', [AdminProductsController::class, 'show'])->name('products'); 
        Route::post('/products', [AdminProductsController::class, 'store'])->name('products'); 
        Route::post('/products/{product}', [AdminProductsController::class, 'update'])->name('products'); // Use POST for multipart/form-data support in PHP for updates
        Route::delete('/products/{product}', [AdminProductsController::class, 'destroy'])->name('products'); 
        Route::patch('/product-variants/{variant}/restock', [AdminProductsController::class, 'restockVariant'])->name('product-variants.restock'); 

        Route::get('/shop-qna/pending', [AdminProductShopQnaController::class, 'pendingAll'])->name('shop-qna.pending'); 
        Route::get('/products/{product}/shop-qna', [AdminProductShopQnaController::class, 'index'])->name('products.shop-qna'); 
        Route::patch('/products/{product}/shop-qna/{shopQna}', [AdminProductShopQnaController::class, 'update'])->name('products.shop-qna'); 

        Route::get('/reviews', [AdminReviewsController::class, 'index'])->name('reviews'); 
        Route::patch('/reviews/{review}', [AdminReviewsController::class, 'update'])->name('reviews'); 
        Route::delete('/reviews/{review}', [AdminReviewsController::class, 'destroy'])->name('reviews'); 

        Route::get('/contact-messages', [AdminContactMessagesController::class, 'index'])->name('contact-messages'); 
        Route::patch('/contact-messages/{contact_message}/handle', [AdminContactMessagesController::class, 'handle'])->name('contact-messages.handle'); 
        Route::delete('/contact-messages/{contact_message}', [AdminContactMessagesController::class, 'destroy'])->name('contact-messages'); 

        Route::get('/coupons', [AdminCouponsController::class, 'index'])->name('coupons'); 
        Route::post('/coupons', [AdminCouponsController::class, 'store'])->name('coupons'); 
        Route::put('/coupons/{coupon}', [AdminCouponsController::class, 'update'])->name('coupons'); 
        Route::delete('/coupons/{coupon}', [AdminCouponsController::class, 'destroy'])->name('coupons'); 

        // Product News (per product)
        Route::get('/products/{product}/news', [AdminProductNewsController::class, 'index'])->name('products.news'); 
        Route::post('/products/{product}/news', [AdminProductNewsController::class, 'store'])->name('products.news'); 
        Route::put('/products/{product}/news/{news}', [AdminProductNewsController::class, 'update'])->name('products.news'); 
        Route::delete('/products/{product}/news/{news}', [AdminProductNewsController::class, 'destroy'])->name('products.news'); 

        // Tech Blog (Global)
        Route::apiResource('blog-posts', App\Http\Controllers\Admin\AdminBlogPostsController::class);
        Route::post('/blog-categories', [App\Http\Controllers\Admin\AdminBlogPostsController::class, 'storeCategory'])->name('blog-categories'); 

        Route::apiResource('flash-sales', App\Http\Controllers\Admin\FlashSaleController::class);
        Route::post('flash-sales/{flash_sale}/items', [App\Http\Controllers\Admin\FlashSaleController::class, 'addItem'])->name('flash-sales.items'); 
        Route::delete('flash-sales/{flash_sale}/items/{item}', [App\Http\Controllers\Admin\FlashSaleController::class, 'removeItem'])->name('flash-sales.items'); 
        Route::post('flash-sales/{flash_sale}/bulk-discount', [App\Http\Controllers\Admin\FlashSaleController::class, 'addBulkItems'])->name('flash-sales.bulk-discount'); 

        // Uploads
        Route::post('/uploads/product-news-thumbnail', [AdminUploadsController::class, 'storeProductNewsThumbnail'])->name('uploads.product-news-thumbnail'); 
        Route::post('/uploads/blog-thumbnail', [AdminUploadsController::class, 'storeBlogThumbnail'])->name('uploads.blog-thumbnail'); 

        // Banners
        Route::apiResource('banners', AdminBannerController::class);

        // Videos
        Route::apiResource('videos', App\Http\Controllers\Admin\VideoController::class);
    });
});

// Public Flash Sale
Route::get('/flash-sale/current', [App\Http\Controllers\Client\FlashSaleController::class, 'current']);

// Gateway callbacks (no auth)
Route::get('/payments/vnpay/return', [PaymentsController::class, 'vnpayReturn']);
Route::get('/payments/vnpay/ipn', [PaymentsController::class, 'vnpayIpn']);
Route::post('/payments/momo/ipn', [PaymentsController::class, 'momoIpn']);
Route::get('/payments/momo/return', [PaymentsController::class, 'momoReturn']);

Route::get('/categories', [CategoriesController::class, 'index']);
Route::get('/categories/{category:slug}', [CategoriesController::class, 'show']);
Route::get('/products', [ProductsController::class, 'index']);
Route::get('/products/{product:slug}', [ProductsController::class, 'show']);
Route::get('/products/{product:slug}/related', [ProductsController::class, 'related']);
Route::get('/products/{product:slug}/shop-qna', [ClientProductShopQnaController::class, 'index']);
Route::get('/product-news/{news:slug}', [ProductNewsController::class, 'show']);
Route::get('/reviews', [ReviewsController::class, 'index']);

Route::get('/blog/categories', [App\Http\Controllers\Client\ClientBlogPostsController::class, 'categories']);
Route::get('/blog/posts', [App\Http\Controllers\Client\ClientBlogPostsController::class, 'index']);
Route::get('/blog/posts/{slug}', [App\Http\Controllers\Client\ClientBlogPostsController::class, 'show']);
Route::post('/blog/posts/{slug}/comments', [App\Http\Controllers\Client\ClientBlogPostsController::class, 'storeComment']);
Route::post('/newsletter/subscriptions', [NewsletterController::class, 'store']);

Route::get('/store/config', [StoreProfileController::class, 'config']);
Route::get('/store/contact', [StoreProfileController::class, 'contact']);
Route::get('/store/payments', [StoreProfileController::class, 'payments']);
Route::get('/store/shipping', [StoreProfileController::class, 'shipping']);

Route::get('/banners', [ClientBannerController::class, 'index']);
Route::get('/videos', [App\Http\Controllers\Client\VideoController::class, 'index']);
Route::get('/videos/{video}', [App\Http\Controllers\Client\VideoController::class, 'show']);

Route::get('/coupons', [ClientCouponsController::class, 'index']);
Route::post('/coupons/apply', [ClientCouponsController::class, 'apply'])->middleware('throttle:5,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/products/{product}/reviews', [ReviewsController::class, 'store']);
    Route::get('/me/coupons', [ClientCouponsController::class, 'saved']);
    Route::post('/me/coupons/save', [ClientCouponsController::class, 'save']);
    
    // Moved from public routes
    Route::post('/products/{product:slug}/shop-qna', [ClientProductShopQnaController::class, 'store']);
});
