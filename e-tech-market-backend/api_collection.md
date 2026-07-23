# E-Tech Market - API Collection

File này liệt kê tất cả các API endpoints trong hệ thống để hỗ trợ việc test bằng Postman.

| Phương thức | Endpoint | Middleware | Action |
|---|---|---|---|
| GET | `/api/documentation` | L5Swagger\Http\Middleware\Config | SwaggerController@api |
| GET | `/api/oauth2-callback` | L5Swagger\Http\Middleware\Config | SwaggerController@oauth2Callback |
| POST | `/api/v1/auth/register` | api, throttle:auth.register | AuthController@register |
| POST | `/api/v1/auth/login` | api, throttle:auth.login | AuthController@login |
| POST | `/api/v1/auth/google-login` | api, throttle:auth.login | AuthController@googleLogin |
| POST | `/api/v1/auth/forgot-password` | api, throttle:auth.password | PasswordResetController@forgot |
| POST | `/api/v1/auth/reset-password` | api, throttle:auth.password | PasswordResetController@reset |
| GET | `/api/v1/auth/email/verify/{id}/{hash}` | api, signed, throttle:6,1 | VerificationController@verify |
| POST | `/api/v1/contact/messages` | api, throttle:60,1 | ContactMessagesController@store |
| GET | `/api/v1/health` | api | MetricsController@health |
| GET | `/api/v1/metrics/prometheus` | api, authenticate.prometheus | MetricsController@prometheus |
| GET | `/api/v1/me` | api, auth:sanctum | AuthController@me |
| GET | `/api/v1/sse/stream` | api, auth:sanctum | SseController@stream |
| GET | `/api/v1/me/loyalty` | api, auth:sanctum | AuthController@loyalty |
| PATCH | `/api/v1/me` | api, auth:sanctum | AuthController@updateMe |
| POST | `/api/v1/me/avatar` | api, auth:sanctum | AuthController@updateAvatar |
| PATCH | `/api/v1/me/password` | api, auth:sanctum, throttle:5,1 | AuthController@changePassword |
| GET | `/api/v1/me/sessions` | api, auth:sanctum | AuthController@sessions |
| POST | `/api/v1/auth/logout` | api, auth:sanctum | AuthController@logout |
| DELETE | `/api/v1/me` | api, auth:sanctum | AuthController@deleteAccount |
| POST | `/api/v1/2fa/setup` | api, auth:sanctum | TwoFactorController@setup |
| POST | `/api/v1/2fa/verify` | api, auth:sanctum | TwoFactorController@verify |
| POST | `/api/v1/2fa/disable` | api, auth:sanctum | TwoFactorController@disable |
| POST | `/api/v1/auth/email/verification-notification` | api, auth:sanctum, throttle:6,1 | VerificationController@resend |
| GET | `/api/v1/cart` | api, auth:sanctum | CartController@show |
| POST | `/api/v1/cart/items` | api, auth:sanctum | CartController@addItem |
| PUT | `/api/v1/cart/items/{product}` | api, auth:sanctum | CartController@updateItem |
| DELETE | `/api/v1/cart/items/{product}` | api, auth:sanctum | CartController@removeItem |
| DELETE | `/api/v1/cart` | api, auth:sanctum | CartController@clear |
| POST | `/api/v1/orders` | api, auth:sanctum | OrdersController@store |
| POST | `/api/v1/orders/from-items` | api, auth:sanctum | OrdersController@storeFromItems |
| GET | `/api/v1/orders` | api, auth:sanctum | OrdersController@index |
| GET | `/api/v1/orders/{order}` | api, auth:sanctum | OrdersController@show |
| PATCH | `/api/v1/orders/{order}/cancel` | api, auth:sanctum | OrdersController@cancel |
| PATCH | `/api/v1/orders/{order}/confirm-received` | api, auth:sanctum | OrdersController@confirmReceived |
| PATCH | `/api/v1/orders/{order}/confirm-payment` | api, auth:sanctum | OrdersController@confirmPayment |
| POST | `/api/v1/orders/{order}/return-request` | api, auth:sanctum | OrdersController@requestReturn |
| PATCH | `/api/v1/orders/{order}/return-request/confirm-refund` | api, auth:sanctum | OrdersController@confirmRefundReceived |
| POST | `/api/v1/payments/vnpay/create` | api, auth:sanctum | PaymentsController@createVnpay |
| POST | `/api/v1/payments/momo/create` | api, auth:sanctum | PaymentsController@createMomo |
| GET | `/api/v1/wishlist` | api, auth:sanctum | WishlistController@index |
| POST | `/api/v1/wishlist/toggle` | api, auth:sanctum | WishlistController@toggle |
| GET | `/api/v1/notifications` | api, auth:sanctum | NotificationsController@index |
| PATCH | `/api/v1/notifications/{notification}/read` | api, auth:sanctum | NotificationsController@markRead |
| PATCH | `/api/v1/notifications/read-all` | api, auth:sanctum | NotificationsController@markReadAll |
| GET | `/api/v1/admin/dashboard/stats` | api, auth:sanctum, admin, throttle:120,1 | DashboardController@stats |
| GET | `/api/v1/admin/orders` | api, auth:sanctum, admin, throttle:120,1 | OrdersController@index |
| GET | `/api/v1/admin/orders/{order}` | api, auth:sanctum, admin, throttle:120,1 | OrdersController@show |
| PATCH | `/api/v1/admin/orders/{order}` | api, auth:sanctum, admin, throttle:120,1 | OrdersController@update |
| DELETE | `/api/v1/admin/orders/{order}` | api, auth:sanctum, admin, throttle:120,1 | OrdersController@destroy |
| POST | `/api/v1/admin/orders/{order}/return-request/approve` | api, auth:sanctum, admin, throttle:120,1 | OrdersController@approveReturnRequest |
| POST | `/api/v1/admin/orders/{order}/return-request/reject` | api, auth:sanctum, admin, throttle:120,1 | OrdersController@rejectReturnRequest |
| POST | `/api/v1/admin/orders/{order}/return-request/refunded` | api, auth:sanctum, admin, throttle:120,1 | OrdersController@markReturnRefunded |
| GET | `/api/v1/admin/settings` | api, auth:sanctum, admin, throttle:120,1 | SettingsController@show |
| PATCH | `/api/v1/admin/settings` | api, auth:sanctum, admin, throttle:120,1 | SettingsController@update |
| GET | `/api/v1/admin/membership-ranks` | api, auth:sanctum, admin, throttle:120,1 | MembershipRanksController@index |
| POST | `/api/v1/admin/membership-ranks` | api, auth:sanctum, admin, throttle:120,1 | MembershipRanksController@store |
| PATCH | `/api/v1/admin/membership-ranks/{membershipRank}` | api, auth:sanctum, admin, throttle:120,1 | MembershipRanksController@update |
| DELETE | `/api/v1/admin/membership-ranks/{membershipRank}` | api, auth:sanctum, admin, throttle:120,1 | MembershipRanksController@destroy |
| GET | `/api/v1/admin/shipping/zones` | api, auth:sanctum, admin, throttle:120,1 | ShippingZonesController@index |
| POST | `/api/v1/admin/shipping/zones` | api, auth:sanctum, admin, throttle:120,1 | ShippingZonesController@store |
| PATCH | `/api/v1/admin/shipping/zones/{zone}` | api, auth:sanctum, admin, throttle:120,1 | ShippingZonesController@update |
| DELETE | `/api/v1/admin/shipping/zones/{zone}` | api, auth:sanctum, admin, throttle:120,1 | ShippingZonesController@destroy |
| GET | `/api/v1/admin/shipping/methods` | api, auth:sanctum, admin, throttle:120,1 | ShippingMethodsController@index |
| POST | `/api/v1/admin/shipping/methods` | api, auth:sanctum, admin, throttle:120,1 | ShippingMethodsController@store |
| PATCH | `/api/v1/admin/shipping/methods/{method}` | api, auth:sanctum, admin, throttle:120,1 | ShippingMethodsController@update |
| DELETE | `/api/v1/admin/shipping/methods/{method}` | api, auth:sanctum, admin, throttle:120,1 | ShippingMethodsController@destroy |
| GET | `/api/v1/admin/categories` | api, auth:sanctum, admin, throttle:120,1 | CategoriesController@index |
| POST | `/api/v1/admin/categories` | api, auth:sanctum, admin, throttle:120,1 | CategoriesController@store |
| PUT | `/api/v1/admin/categories/{category}` | api, auth:sanctum, admin, throttle:120,1 | CategoriesController@update |
| DELETE | `/api/v1/admin/categories/{category}` | api, auth:sanctum, admin, throttle:120,1 | CategoriesController@destroy |
| GET | `/api/v1/admin/video-categories` | api, auth:sanctum, admin, throttle:120,1 | VideoCategoryController@index |
| POST | `/api/v1/admin/video-categories` | api, auth:sanctum, admin, throttle:120,1 | VideoCategoryController@store |
| GET | `/api/v1/admin/video-categories/{video_category}` | api, auth:sanctum, admin, throttle:120,1 | VideoCategoryController@show |
| PUT, PATCH | `/api/v1/admin/video-categories/{video_category}` | api, auth:sanctum, admin, throttle:120,1 | VideoCategoryController@update |
| DELETE | `/api/v1/admin/video-categories/{video_category}` | api, auth:sanctum, admin, throttle:120,1 | VideoCategoryController@destroy |
| GET | `/api/v1/admin/roles` | api, auth:sanctum, admin, throttle:120,1 | RolesController@index |
| PATCH | `/api/v1/admin/roles/{role}` | api, auth:sanctum, admin, throttle:120,1 | RolesController@update |
| GET | `/api/v1/admin/users` | api, auth:sanctum, admin, throttle:120,1 | UsersController@index |
| PATCH | `/api/v1/admin/users/{user}` | api, auth:sanctum, admin, throttle:120,1 | UsersController@update |
| DELETE | `/api/v1/admin/users/{user}` | api, auth:sanctum, admin, throttle:120,1 | UsersController@destroy |
| GET | `/api/v1/admin/products/deleted-variants` | api, auth:sanctum, admin, throttle:120,1 | ProductsDeletedVariantsController@index |
| POST | `/api/v1/admin/products/deleted-variants/hard-delete` | api, auth:sanctum, admin, throttle:120,1 | ProductsDeletedVariantsController@hardDelete |
| GET | `/api/v1/admin/deleted-data/reviews` | api, auth:sanctum, admin, throttle:120,1 | DeletedDataController@indexDeletedReviews |
| POST | `/api/v1/admin/deleted-data/reviews/hard-delete` | api, auth:sanctum, admin, throttle:120,1 | DeletedDataController@hardDeleteReviews |
| GET | `/api/v1/admin/deleted-data/users` | api, auth:sanctum, admin, throttle:120,1 | DeletedDataController@indexDeletedUsers |
| POST | `/api/v1/admin/deleted-data/users/hard-delete` | api, auth:sanctum, admin, throttle:120,1 | DeletedDataController@hardDeleteUsers |
| GET | `/api/v1/admin/deleted-data/categories` | api, auth:sanctum, admin, throttle:120,1 | DeletedDataController@indexDeletedCategories |
| POST | `/api/v1/admin/deleted-data/categories/hard-delete` | api, auth:sanctum, admin, throttle:120,1 | DeletedDataController@hardDeleteCategories |
| GET | `/api/v1/admin/deleted-data/products` | api, auth:sanctum, admin, throttle:120,1 | DeletedDataController@indexDeletedProducts |
| POST | `/api/v1/admin/deleted-data/products/hard-delete` | api, auth:sanctum, admin, throttle:120,1 | DeletedDataController@hardDeleteProducts |
| GET | `/api/v1/admin/deleted-data/product-news` | api, auth:sanctum, admin, throttle:120,1 | DeletedDataController@indexDeletedProductNews |
| POST | `/api/v1/admin/deleted-data/product-news/hard-delete` | api, auth:sanctum, admin, throttle:120,1 | DeletedDataController@hardDeleteProductNews |
| GET | `/api/v1/admin/deleted-data/product-faqs` | api, auth:sanctum, admin, throttle:120,1 | DeletedDataController@indexDeletedProductFaqs |
| POST | `/api/v1/admin/deleted-data/product-faqs/hard-delete` | api, auth:sanctum, admin, throttle:120,1 | DeletedDataController@hardDeleteProductFaqs |
| GET | `/api/v1/admin/deleted-data/blog-posts` | api, auth:sanctum, admin, throttle:120,1 | DeletedDataController@indexDeletedBlogPosts |
| POST | `/api/v1/admin/deleted-data/blog-posts/hard-delete` | api, auth:sanctum, admin, throttle:120,1 | DeletedDataController@hardDeleteBlogPosts |
| GET | `/api/v1/admin/deleted-data/blog-comments` | api, auth:sanctum, admin, throttle:120,1 | DeletedDataController@indexDeletedBlogComments |
| POST | `/api/v1/admin/deleted-data/blog-comments/hard-delete` | api, auth:sanctum, admin, throttle:120,1 | DeletedDataController@hardDeleteBlogComments |
| GET | `/api/v1/admin/products` | api, auth:sanctum, admin, throttle:120,1 | ProductsController@index |
| GET | `/api/v1/admin/products/{product}` | api, auth:sanctum, admin, throttle:120,1 | ProductsController@show |
| POST | `/api/v1/admin/products` | api, auth:sanctum, admin, throttle:120,1 | ProductsController@store |
| POST | `/api/v1/admin/products/{product}` | api, auth:sanctum, admin, throttle:120,1 | ProductsController@update |
| DELETE | `/api/v1/admin/products/{product}` | api, auth:sanctum, admin, throttle:120,1 | ProductsController@destroy |
| PATCH | `/api/v1/admin/product-variants/{variant}/restock` | api, auth:sanctum, admin, throttle:120,1 | ProductsController@restockVariant |
| GET | `/api/v1/admin/shop-qna` | api, auth:sanctum, admin, throttle:120,1 | ProductShopQnaController@all |
| GET | `/api/v1/admin/shop-qna/pending` | api, auth:sanctum, admin, throttle:120,1 | ProductShopQnaController@pendingAll |
| GET | `/api/v1/admin/products/{product}/shop-qna` | api, auth:sanctum, admin, throttle:120,1 | ProductShopQnaController@index |
| PATCH | `/api/v1/admin/products/{product}/shop-qna/{shopQna}` | api, auth:sanctum, admin, throttle:120,1 | ProductShopQnaController@update |
| DELETE | `/api/v1/admin/products/{product}/shop-qna/{shopQna}` | api, auth:sanctum, admin, throttle:120,1 | ProductShopQnaController@destroy |
| GET | `/api/v1/admin/reviews` | api, auth:sanctum, admin, throttle:120,1 | ReviewsController@index |
| PATCH | `/api/v1/admin/reviews/{review}` | api, auth:sanctum, admin, throttle:120,1 | ReviewsController@update |
| DELETE | `/api/v1/admin/reviews/{review}` | api, auth:sanctum, admin, throttle:120,1 | ReviewsController@destroy |
| GET | `/api/v1/admin/contact-messages` | api, auth:sanctum, admin, throttle:120,1 | ContactMessagesController@index |
| PATCH | `/api/v1/admin/contact-messages/{contact_message}/handle` | api, auth:sanctum, admin, throttle:120,1 | ContactMessagesController@handle |
| DELETE | `/api/v1/admin/contact-messages/{contact_message}` | api, auth:sanctum, admin, throttle:120,1 | ContactMessagesController@destroy |
| GET | `/api/v1/admin/coupons` | api, auth:sanctum, admin, throttle:120,1 | CouponsController@index |
| POST | `/api/v1/admin/coupons` | api, auth:sanctum, admin, throttle:120,1 | CouponsController@store |
| PUT | `/api/v1/admin/coupons/{coupon}` | api, auth:sanctum, admin, throttle:120,1 | CouponsController@update |
| DELETE | `/api/v1/admin/coupons/{coupon}` | api, auth:sanctum, admin, throttle:120,1 | CouponsController@destroy |
| GET | `/api/v1/admin/products/{product}/news` | api, auth:sanctum, admin, throttle:120,1 | ProductNewsController@index |
| POST | `/api/v1/admin/products/{product}/news` | api, auth:sanctum, admin, throttle:120,1 | ProductNewsController@store |
| PUT | `/api/v1/admin/products/{product}/news/{news}` | api, auth:sanctum, admin, throttle:120,1 | ProductNewsController@update |
| DELETE | `/api/v1/admin/products/{product}/news/{news}` | api, auth:sanctum, admin, throttle:120,1 | ProductNewsController@destroy |
| GET | `/api/v1/admin/blog-posts` | api, auth:sanctum, admin, throttle:120,1 | AdminBlogPostsController@index |
| POST | `/api/v1/admin/blog-posts` | api, auth:sanctum, admin, throttle:120,1 | AdminBlogPostsController@store |
| GET | `/api/v1/admin/blog-posts/{blog_post}` | api, auth:sanctum, admin, throttle:120,1 | AdminBlogPostsController@show |
| PUT, PATCH | `/api/v1/admin/blog-posts/{blog_post}` | api, auth:sanctum, admin, throttle:120,1 | AdminBlogPostsController@update |
| DELETE | `/api/v1/admin/blog-posts/{blog_post}` | api, auth:sanctum, admin, throttle:120,1 | AdminBlogPostsController@destroy |
| POST | `/api/v1/admin/blog-categories` | api, auth:sanctum, admin, throttle:120,1 | AdminBlogPostsController@storeCategory |
| PUT | `/api/v1/admin/blog-categories/{category}` | api, auth:sanctum, admin, throttle:120,1 | AdminBlogPostsController@updateCategory |
| DELETE | `/api/v1/admin/blog-categories/{category}` | api, auth:sanctum, admin, throttle:120,1 | AdminBlogPostsController@destroyCategory |
| GET | `/api/v1/admin/flash-sales` | api, auth:sanctum, admin, throttle:120,1 | FlashSaleController@index |
| POST | `/api/v1/admin/flash-sales` | api, auth:sanctum, admin, throttle:120,1 | FlashSaleController@store |
| GET | `/api/v1/admin/flash-sales/{flash_sale}` | api, auth:sanctum, admin, throttle:120,1 | FlashSaleController@show |
| PUT, PATCH | `/api/v1/admin/flash-sales/{flash_sale}` | api, auth:sanctum, admin, throttle:120,1 | FlashSaleController@update |
| DELETE | `/api/v1/admin/flash-sales/{flash_sale}` | api, auth:sanctum, admin, throttle:120,1 | FlashSaleController@destroy |
| POST | `/api/v1/admin/flash-sales/{flash_sale}/items` | api, auth:sanctum, admin, throttle:120,1 | FlashSaleController@addItem |
| DELETE | `/api/v1/admin/flash-sales/{flash_sale}/items/{item}` | api, auth:sanctum, admin, throttle:120,1 | FlashSaleController@removeItem |
| POST | `/api/v1/admin/flash-sales/{flash_sale}/bulk-discount` | api, auth:sanctum, admin, throttle:120,1 | FlashSaleController@addBulkItems |
| POST | `/api/v1/admin/uploads/product-news-thumbnail` | api, auth:sanctum, admin, throttle:120,1 | UploadsController@storeProductNewsThumbnail |
| POST | `/api/v1/admin/uploads/blog-thumbnail` | api, auth:sanctum, admin, throttle:120,1 | UploadsController@storeBlogThumbnail |
| GET | `/api/v1/admin/banners` | api, auth:sanctum, admin, throttle:120,1 | BannerController@index |
| POST | `/api/v1/admin/banners` | api, auth:sanctum, admin, throttle:120,1 | BannerController@store |
| GET | `/api/v1/admin/banners/{banner}` | api, auth:sanctum, admin, throttle:120,1 | BannerController@show |
| PUT, PATCH | `/api/v1/admin/banners/{banner}` | api, auth:sanctum, admin, throttle:120,1 | BannerController@update |
| DELETE | `/api/v1/admin/banners/{banner}` | api, auth:sanctum, admin, throttle:120,1 | BannerController@destroy |
| GET | `/api/v1/admin/videos` | api, auth:sanctum, admin, throttle:120,1 | VideoController@index |
| POST | `/api/v1/admin/videos` | api, auth:sanctum, admin, throttle:120,1 | VideoController@store |
| GET | `/api/v1/admin/videos/{video}` | api, auth:sanctum, admin, throttle:120,1 | VideoController@show |
| PUT, PATCH | `/api/v1/admin/videos/{video}` | api, auth:sanctum, admin, throttle:120,1 | VideoController@update |
| DELETE | `/api/v1/admin/videos/{video}` | api, auth:sanctum, admin, throttle:120,1 | VideoController@destroy |
| GET | `/api/v1/flash-sale/current` | api | FlashSaleController@current |
| GET | `/api/v1/payments/vnpay/return` | api | PaymentsController@vnpayReturn |
| GET | `/api/v1/payments/vnpay/ipn` | api | PaymentsController@vnpayIpn |
| POST | `/api/v1/payments/momo/ipn` | api | PaymentsController@momoIpn |
| GET | `/api/v1/payments/momo/return` | api | PaymentsController@momoReturn |
| GET | `/api/v1/categories` | api | CategoriesController@index |
| GET | `/api/v1/categories/{category}` | api | CategoriesController@show |
| GET | `/api/v1/products` | api | ProductsController@index |
| GET | `/api/v1/products/{product}` | api | ProductsController@show |
| GET | `/api/v1/products/{product}/related` | api | ProductsController@related |
| GET | `/api/v1/products/{product}/shop-qna` | api | ProductShopQnaController@index |
| POST | `/api/v1/products/{product}/shop-qna` | api | ProductShopQnaController@store |
| GET | `/api/v1/product-news/{news}` | api | ProductNewsController@show |
| GET | `/api/v1/reviews` | api | ReviewsController@index |
| GET | `/api/v1/blog/categories` | api | ClientBlogPostsController@categories |
| GET | `/api/v1/blog/posts` | api | ClientBlogPostsController@index |
| GET | `/api/v1/blog/posts/{slug}` | api | ClientBlogPostsController@show |
| POST | `/api/v1/blog/posts/{slug}/comments` | api | ClientBlogPostsController@storeComment |
| POST | `/api/v1/newsletter/subscriptions` | api | NewsletterController@store |
| GET | `/api/v1/store/config` | api | StoreProfileController@config |
| GET | `/api/v1/store/contact` | api | StoreProfileController@contact |
| GET | `/api/v1/store/payments` | api | StoreProfileController@payments |
| GET | `/api/v1/store/shipping` | api | StoreProfileController@shipping |
| GET | `/api/v1/banners` | api | BannerController@index |
| GET | `/api/v1/videos` | api | VideoController@index |
| GET | `/api/v1/videos/{video}` | api | VideoController@show |
| POST | `/api/v1/chatbot/message` | api, throttle:30,1 | ChatbotController@message |
| GET | `/api/v1/home` | api | HomeController@index |
| GET | `/api/v1/coupons` | api | CouponsController@index |
| POST | `/api/v1/coupons/apply` | api, throttle:5,1 | CouponsController@apply |
| POST | `/api/v1/products/{product}/reviews` | api, auth:sanctum | Closure (Hàm nặc danh) |
| GET | `/api/v1/me/coupons` | api, auth:sanctum | CouponsController@saved |
| POST | `/api/v1/me/coupons/save` | api, auth:sanctum | CouponsController@save |
| GET | `/api/v1/docs` | api | Closure (Hàm nặc danh) |
| GET | `/api/v2/status` | api | Closure (Hàm nặc danh) |
| GET | `/api/v2/webhooks/vnpay/ipn` | api | WebhookController@vnpay |
| POST | `/api/v2/webhooks/momo/ipn` | api | WebhookController@momo |
