<?php

namespace App\Support;

class HtmlSanitizer
{
    /**
     * Lightweight sanitizer for pasted HTML.
     * - removes <script>/<style>/<iframe>/<object>/<embed>
     * - removes on* event handler attributes and javascript: URLs
     * - allows common formatting tags + img/a/table...
     *
     * NOTE: This is not as strict as HTMLPurifier, but good enough for quick paste.
     */
    public static function sanitize(?string $html): ?string
    {
        if ($html === null) {
            return null;
        }

        $html = trim($html);
        if ($html === '') {
            return null;
        }

        // Quick remove dangerous blocks
        $html = preg_replace('~<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?</\1>~i', '', $html) ?? '';

        // Allowlist tags (keep img/a/table etc)
        $allowed = '<p><br><b><strong><i><em><u><s><span><div><ul><ol><li><h1><h2><h3><h4><h5><h6>'
            . '<blockquote><pre><code><hr>'
            . '<table><thead><tbody><tfoot><tr><th><td>'
            . '<a><img>';
        $html = strip_tags($html, $allowed);

        // Remove event handlers like onclick=...
        $html = preg_replace('/\son\w+\s*=\s*(["\']).*?\1/iu', '', $html) ?? '';

        // Remove javascript: URLs in href/src
        $html = preg_replace('/\s(href|src)\s*=\s*(["\'])\s*javascript:[^"\']*\2/iu', '', $html) ?? '';

        return $html;
    }
}

