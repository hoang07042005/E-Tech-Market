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
use Illuminate\Http\Request;

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

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::patch('/me', [AuthController::class, 'updateMe']);
    Route::post('/me/avatar', [AuthController::class, 'updateAvatar']);
    Route::patch('/me/password', [AuthController::class, 'changePassword']);
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
    Route::prefix('admin')->middleware(['admin', 'throttle:30,1'])->group(function () {
        Route::get('/dashboard/stats', [AdminDashboardController::class, 'stats']);
        Route::get('/orders', [AdminOrdersController::class, 'index']);
        Route::get('/orders/{order}', [AdminOrdersController::class, 'show']);
        Route::patch('/orders/{order}', [AdminOrdersController::class, 'update']);
        Route::post('/orders/{order}/return-request/approve', [AdminOrdersController::class, 'approveReturnRequest']);
        Route::post('/orders/{order}/return-request/reject', [AdminOrdersController::class, 'rejectReturnRequest']);
        Route::post('/orders/{order}/return-request/refunded', [AdminOrdersController::class, 'markReturnRefunded']);
        Route::get('/settings', [AdminSettingsController::class, 'show']);
        Route::patch('/settings', [AdminSettingsController::class, 'update']);
        Route::get('/shipping/zones', [AdminShippingZonesController::class, 'index']);
        Route::post('/shipping/zones', [AdminShippingZonesController::class, 'store']);
        Route::patch('/shipping/zones/{zone}', [AdminShippingZonesController::class, 'update']);
        Route::delete('/shipping/zones/{zone}', [AdminShippingZonesController::class, 'destroy']);
        Route::get('/shipping/methods', [AdminShippingMethodsController::class, 'index']);
        Route::post('/shipping/methods', [AdminShippingMethodsController::class, 'store']);
        Route::patch('/shipping/methods/{method}', [AdminShippingMethodsController::class, 'update']);
        Route::delete('/shipping/methods/{method}', [AdminShippingMethodsController::class, 'destroy']);

        Route::get('/categories', [AdminCategoriesController::class, 'index']);
        Route::post('/categories', [AdminCategoriesController::class, 'store']);
        Route::put('/categories/{category}', [AdminCategoriesController::class, 'update']);
        Route::delete('/categories/{category}', [AdminCategoriesController::class, 'destroy']);

        Route::apiResource('video-categories', App\Http\Controllers\Admin\VideoCategoryController::class);

        Route::get('/roles', [AdminRolesController::class, 'index']);

        Route::get('/users', [AdminUsersController::class, 'index']);
        Route::patch('/users/{user}', [AdminUsersController::class, 'update']);
        Route::delete('/users/{user}', [AdminUsersController::class, 'destroy']);

        Route::get('/products', [AdminProductsController::class, 'index']);
        Route::get('/products/{product}', [AdminProductsController::class, 'show']);
        Route::post('/products', [AdminProductsController::class, 'store']);
        Route::post('/products/{product}', [AdminProductsController::class, 'update']); // Use POST for multipart/form-data support in PHP for updates
        Route::delete('/products/{product}', [AdminProductsController::class, 'destroy']);
        Route::patch('/product-variants/{variant}/restock', [AdminProductsController::class, 'restockVariant']);

        Route::get('/shop-qna/pending', [AdminProductShopQnaController::class, 'pendingAll']);
        Route::get('/products/{product}/shop-qna', [AdminProductShopQnaController::class, 'index']);
        Route::patch('/products/{product}/shop-qna/{shopQna}', [AdminProductShopQnaController::class, 'update']);

        Route::get('/reviews', [AdminReviewsController::class, 'index']);
        Route::patch('/reviews/{review}', [AdminReviewsController::class, 'update']);
        Route::delete('/reviews/{review}', [AdminReviewsController::class, 'destroy']);

        Route::get('/contact-messages', [AdminContactMessagesController::class, 'index']);
        Route::patch('/contact-messages/{contact_message}/handle', [AdminContactMessagesController::class, 'handle']);
        Route::delete('/contact-messages/{contact_message}', [AdminContactMessagesController::class, 'destroy']);

        Route::get('/coupons', [AdminCouponsController::class, 'index']);
        Route::post('/coupons', [AdminCouponsController::class, 'store']);
        Route::put('/coupons/{coupon}', [AdminCouponsController::class, 'update']);
        Route::delete('/coupons/{coupon}', [AdminCouponsController::class, 'destroy']);

        // Product News (per product)
        Route::get('/products/{product}/news', [AdminProductNewsController::class, 'index']);
        Route::post('/products/{product}/news', [AdminProductNewsController::class, 'store']);
        Route::put('/products/{product}/news/{news}', [AdminProductNewsController::class, 'update']);
        Route::delete('/products/{product}/news/{news}', [AdminProductNewsController::class, 'destroy']);

        // Tech Blog (Global)
        Route::apiResource('blog-posts', App\Http\Controllers\Admin\AdminBlogPostsController::class);
        Route::post('/blog-categories', [App\Http\Controllers\Admin\AdminBlogPostsController::class, 'storeCategory']);

        Route::apiResource('flash-sales', App\Http\Controllers\Admin\FlashSaleController::class);
        Route::post('flash-sales/{flash_sale}/items', [App\Http\Controllers\Admin\FlashSaleController::class, 'addItem']);
        Route::delete('flash-sales/{flash_sale}/items/{item}', [App\Http\Controllers\Admin\FlashSaleController::class, 'removeItem']);
        Route::post('flash-sales/{flash_sale}/bulk-discount', [App\Http\Controllers\Admin\FlashSaleController::class, 'addBulkItems']);

        // Uploads
        Route::post('/uploads/product-news-thumbnail', [AdminUploadsController::class, 'storeProductNewsThumbnail']);
        Route::post('/uploads/blog-thumbnail', [AdminUploadsController::class, 'storeBlogThumbnail']);

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
Route::post('/coupons/apply', [ClientCouponsController::class, 'apply']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/products/{product}/reviews', [ReviewsController::class, 'store']);
    Route::get('/me/coupons', [ClientCouponsController::class, 'saved']);
    Route::post('/me/coupons/save', [ClientCouponsController::class, 'save']);
    
    // Moved from public routes
    Route::post('/products/{product:slug}/shop-qna', [ClientProductShopQnaController::class, 'store']);
});
