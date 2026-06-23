<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiService
{
    private string $apiKey;
    private string $model;
    private string $baseUrl;

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY', ''));
        $this->model = config('services.gemini.model', 'gemini-1.5-flash-latest');
        $this->baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    }

    /**
     * Send a message to Gemini API with system instruction and context.
     *
     * @param string $userMessage  The user's chat message
     * @param string $systemPrompt System instruction for the AI
     * @param string $context      Additional context (product data, order info, etc.)
     * @param array  $history      Previous conversation messages [{role, text}]
     * @return string              The AI's response text
     */
    public function chat(string $userMessage, string $systemPrompt, string $context = '', array $history = []): string
    {
        if (empty($this->apiKey)) {
            Log::warning('GeminiService: API key is not configured.');
            return $this->getFallbackResponse($context);
        }

        $url = "{$this->baseUrl}/models/{$this->model}:generateContent?key={$this->apiKey}";

        // Build conversation contents
        $contents = [];

        // Add history
        foreach ($history as $msg) {
            $contents[] = [
                'role' => $msg['role'] === 'user' ? 'user' : 'model',
                'parts' => [['text' => $msg['text']]],
            ];
        }

        // Build final user message with context
        $finalMessage = $userMessage;
        if (!empty($context)) {
            $finalMessage = "Dữ liệu hệ thống (KHÔNG hiển thị trực tiếp cho khách, chỉ dùng để tham khảo trả lời):\n{$context}\n\nCâu hỏi của khách hàng: {$userMessage}";
        }

        $contents[] = [
            'role' => 'user',
            'parts' => [['text' => $finalMessage]],
        ];

        $payload = [
            'system_instruction' => [
                'parts' => [['text' => $systemPrompt]],
            ],
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => 0.7,
                'topP' => 0.95,
                'topK' => 40,
                'maxOutputTokens' => 1024,
            ],
            'safetySettings' => [
                ['category' => 'HARM_CATEGORY_HARASSMENT', 'threshold' => 'BLOCK_MEDIUM_AND_ABOVE'],
                ['category' => 'HARM_CATEGORY_HATE_SPEECH', 'threshold' => 'BLOCK_MEDIUM_AND_ABOVE'],
                ['category' => 'HARM_CATEGORY_SEXUALLY_EXPLICIT', 'threshold' => 'BLOCK_MEDIUM_AND_ABOVE'],
                ['category' => 'HARM_CATEGORY_DANGEROUS_CONTENT', 'threshold' => 'BLOCK_MEDIUM_AND_ABOVE'],
            ],
        ];

        try {
            $response = Http::timeout(30)
                ->withHeaders(['Content-Type' => 'application/json'])
                ->post($url, $payload);

            if ($response->failed()) {
                Log::error('Gemini API error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                return $this->getFallbackResponse($context);
            }

            $data = $response->json();
            $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';

            if (empty($text)) {
                return 'Xin lỗi, mình không thể trả lời câu hỏi này. Bạn có thể hỏi lại theo cách khác không?';
            }

            return trim($text);
        } catch (\Exception $e) {
            Log::error('GeminiService exception: ' . $e->getMessage());
            return $this->getFallbackResponse($context);
        }
    }

    /**
     * Provide a natural fallback response if AI fails or key is missing.
     */
    private function getFallbackResponse(string $context): string
    {
        if (str_contains($context, 'Thông tin đơn hàng:')) {
            return 'Dạ, đây là thông tin đơn hàng bạn cần tra cứu ạ:';
        }
        if (str_contains($context, 'Yêu cầu so sánh')) {
            return 'Dạ đây là các sản phẩm bạn muốn so sánh. Hiện tại hệ thống AI đang bảo trì nên mình chưa thể phân tích chi tiết, bạn xem cấu hình trên thẻ sản phẩm nhé!';
        }
        if (str_contains($context, 'LƯU Ý DÀNH CHO BOT: Khách hàng yêu cầu tư vấn')) {
            return 'Bạn đang cần tìm sản phẩm gì ạ? (Ví dụ: điện thoại, laptop, phụ kiện) Hãy cho E-Tech biết thêm chi tiết để mình tư vấn chính xác hơn nhé!';
        }
        if (str_contains($context, 'Danh sách sản phẩm phù hợp')) {
            if (str_contains($context, 'Không tìm thấy sản phẩm nào phù hợp')) {
                return 'Hiện tại E-Tech Market chưa có sản phẩm nào hoàn toàn khớp với yêu cầu này của bạn. Câu hỏi của bạn có thể cần chuyên viên kỹ thuật giải đáp kỹ hơn, bạn vui lòng đợi trong giây lát nhé!';
            }
            return 'Dựa vào yêu cầu, E-Tech Bot xin gợi ý cho bạn một số sản phẩm nổi bật sau đây:';
        }
        if (str_contains($context, 'Chương trình Flash Sale đang diễn ra:')) {
            return "Dạ đây là thông tin chương trình Flash Sale của E-Tech Market ạ:\n\n" . str_replace("Chương trình Flash Sale đang diễn ra:\n", "", str_replace("Một số sản phẩm nổi bật trong chương trình:\n", "", $context));
        }
        if (str_contains($context, 'Sản phẩm được đánh giá cao nhất:')) {
            return 'Dạ đây là những sản phẩm đang được khách hàng yêu thích và đánh giá cao nhất tại cửa hàng:';
        }
        if (str_contains($context, 'Các sản phẩm đang được giảm giá:')) {
            return 'Dạ E-Tech Bot xin gửi bạn danh sách các sản phẩm đang được giảm giá mạnh:';
        }
        if (str_contains($context, 'Tin tức công nghệ mới nhất:')) {
            return "Dạ đây là các bài viết và tin tức công nghệ mới nhất từ E-Tech Market:\n\n" . str_replace("Tin tức công nghệ mới nhất:\n", "", $context);
        }
        if (str_contains($context, 'Thông tin chung & Chính sách E-Tech Market (FAQs):')) {
            return "Dạ đây là thông tin và chính sách của E-Tech Market:\n\n" . str_replace("Thông tin chung & Chính sách E-Tech Market (FAQs):\n", "", $context);
        }
        if (str_contains($context, 'Chương trình khuyến mãi hiện tại:')) {
            return "Dạ hiện tại E-Tech đang có mã giảm giá này dành riêng cho bạn nhé:";
        }
        if (str_contains($context, 'Thông báo khuyến mãi:')) {
            return "Dạ rất tiếc hiện tại E-Tech Market đang không có chương trình giảm giá nào. Bạn ghé lại sau nha!";
        }
        return 'Câu hỏi của bạn cần chuyên viên kỹ thuật giải đáp kỹ hơn. Bạn vui lòng đợi trong giây lát, nhân viên tư vấn của E-Tech sẽ phản hồi bạn ngay lập tức ạ!';
    }
}
