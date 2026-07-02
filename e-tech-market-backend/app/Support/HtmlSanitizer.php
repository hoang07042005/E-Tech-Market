<?php

namespace App\Support;

/**
 * Lightweight sanitizer for admin-entered HTML content.
 *
 * Admin users are trusted, so we only strip the critical XSS vectors:
 *   - <script> blocks (including inline event content)
 *   - on* event handler attributes  (onclick=, onerror=, …)
 *   - javascript: URIs inside href / src / action
 *
 * We intentionally preserve SVG, complex HTML, inline styles, Font Awesome
 * icons, and other rich markup that Symfony HtmlSanitizer was stripping.
 */
class HtmlSanitizer
{
    public static function sanitize(?string $html): ?string
    {
        if ($html === null) {
            return null;
        }

        $html = trim($html);
        if ($html === '') {
            return null;
        }

        // 1. Strip <script>...</script> blocks (including multiline)
        $html = preg_replace('/<script\b[^>]*>[\s\S]*?<\/script>/i', '', $html);

        // 2. Strip standalone <script ...> tags without closing tag
        $html = preg_replace('/<script\b[^>]*>/i', '', $html);

        // 3. Strip on* event handler attributes  (onclick="...", onerror='...', onload=foo)
        $html = preg_replace('/\s+on[a-z]+\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+)/i', '', $html);

        // 4. Strip javascript: URIs in href / src / action attributes
        $html = preg_replace(
            '/(\b(?:href|src|action|formaction)\s*=\s*["\']?)\s*javascript\s*:[^"\'>\s]*/i',
            '$1#',
            $html
        );

        // 5. Strip data: URIs in src (potential XSS vector via SVG/HTML data URIs)
        //    Allow data: for img src only (common for base64 images) – leave those alone.
        //    Strip data: in href/action.
        $html = preg_replace(
            '/(\b(?:href|action|formaction)\s*=\s*["\']?)\s*data\s*:[^"\'>\s]*/i',
            '$1#',
            $html
        );

        $result = trim($html);
        return $result === '' ? null : $result;
    }
}
