<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessProductImage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected string $imagePath
    ) {}

    public function handle(): void
    {
        Log::info('Bắt đầu xử lý tối ưu hóa ảnh sản phẩm chạy ngầm: '.$this->imagePath);

        $disk = Storage::disk('public');
        if (! $disk->exists($this->imagePath)) {
            Log::warning('Không tìm thấy ảnh cần xử lý: '.$this->imagePath);

            return;
        }

        // Use storage_path for a reliable local filesystem path (works for 'public' local driver).
        // Using $disk->path() may not be available for all filesystem adapters and static analyzers.
        $fullPath = storage_path('app/public/'.ltrim($this->imagePath, '/'));

        if (! extension_loaded('gd')) {
            Log::info('Không tìm thấy PHP GD Extension. Bỏ qua bước nén ảnh.');

            return;
        }

        $info = getimagesize($fullPath);
        if (! $info) {
            return;
        }

        $mime = $info['mime'];
        $width = $info[0];
        $height = $info[1];

        $srcImage = match ($mime) {
            'image/jpeg', 'image/jpg' => imagecreatefromjpeg($fullPath),
            'image/png' => imagecreatefrompng($fullPath),
            'image/webp' => @imagecreatefromwebp($fullPath),
            default => null,
        };

        if (! $srcImage) {
            Log::warning('Định dạng ảnh không được hỗ trợ xử lý GD hoặc file lỗi: '.$mime);

            return;
        }

        $maxDimension = 1200;
        if ($width > $maxDimension || $height > $maxDimension) {
            if ($width > $height) {
                $newWidth = $maxDimension;
                $newHeight = (int) round(($height / $width) * $maxDimension);
            } else {
                $newHeight = $maxDimension;
                $newWidth = (int) round(($width / $height) * $maxDimension);
            }

            $dstImage = imagecreatetruecolor($newWidth, $newHeight);

            if ($mime === 'image/png' || $mime === 'image/webp') {
                imagealphablending($dstImage, false);
                imagesavealpha($dstImage, true);
                $transparent = imagecolorallocatealpha($dstImage, 255, 255, 255, 127);
                imagefilledrectangle($dstImage, 0, 0, $newWidth, $newHeight, $transparent);
            }

            imagecopyresampled($dstImage, $srcImage, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
            imagedestroy($srcImage);
            $srcImage = $dstImage;
        }

        match ($mime) {
            'image/jpeg', 'image/jpg' => imagejpeg($srcImage, $fullPath, 80),
            'image/png' => imagepng($srcImage, $fullPath, 6),
            'image/webp' => imagewebp($srcImage, $fullPath, 80),
            default => null,
        };

        // Additionally, generate a WebP sibling file for browsers that support it
        if (function_exists('imagewebp') && $mime !== 'image/webp') {
            $webpPath = preg_replace('/\.[^.]+$/', '.webp', $fullPath);
            @imagewebp($srcImage, $webpPath, 80);
        }

        imagedestroy($srcImage);
        Log::info('Đã tối ưu hóa và nén ảnh thành công: '.$this->imagePath);
    }
}
