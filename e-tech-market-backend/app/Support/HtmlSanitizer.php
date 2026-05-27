<?php

namespace App\Support;

class HtmlSanitizer
{
    /**
     * Sanitizer for admin-entered HTML content.
     * - removes <script>/<style>/<iframe>/<object>/<embed>/<form>/<input>/<textarea>/<button>/<select>
     * - removes on* event handler attributes and javascript:/data: URLs
     * - strips <base>, <meta>, <link> tags that could redirect or inject
     * - allows common formatting tags + img/a/table...
     *
     * NOTE: For maximum safety in production, consider using HTMLPurifier or
     * symfony/html-sanitizer. This covers the most common XSS vectors.
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

        // 1. Remove dangerous blocks (including self-closing and malformed variants)
        $dangerousTags = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button', 'select', 'base', 'meta', 'link', 'applet'];
        foreach ($dangerousTags as $tag) {
            // Paired tags with content
            $html = preg_replace('~<' . $tag . '\b[^>]*>[\s\S]*?</' . $tag . '>~iu', '', $html) ?? $html;
            // Self-closing / orphan opening tags
            $html = preg_replace('~<' . $tag . '\b[^>]*/?>~iu', '', $html) ?? $html;
        }

        // 2. Allowlist tags (keep img/a/table etc.)
        $allowed = '<p><br><b><strong><i><em><u><s><span><div><ul><ol><li><h1><h2><h3><h4><h5><h6>'
            . '<blockquote><pre><code><hr><sup><sub><abbr><mark><del><ins><figure><figcaption>'
            . '<table><thead><tbody><tfoot><tr><th><td><caption><colgroup><col>'
            . '<a><img><picture><source><video>';
        $html = strip_tags($html, $allowed);

        // 3. Remove ALL event handler attributes (onclick, onload, onerror, etc.)
        // Handles single quotes, double quotes, no quotes, and encoded variants
        $html = preg_replace('/\s+on\w+\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+)/iu', '', $html) ?? $html;

        // 4. Remove dangerous URL schemes in href/src/action/formaction/xlink:href
        $dangerousAttrs = ['href', 'src', 'action', 'formaction', 'xlink:href', 'data', 'poster', 'background'];
        foreach ($dangerousAttrs as $attr) {
            // javascript:, vbscript:, data: (except data:image/...) URLs
            $html = preg_replace(
                '/\s' . preg_quote($attr, '/') . '\s*=\s*(["\'])\s*(?:javascript|vbscript|data(?!:image\/)):[^"\']*\1/iu',
                '',
                $html
            ) ?? $html;
            // Unquoted variant
            $html = preg_replace(
                '/\s' . preg_quote($attr, '/') . '\s*=\s*(?:javascript|vbscript|data(?!:image\/)):[^\s>]*/iu',
                '',
                $html
            ) ?? $html;
        }

        // 5. Remove style attributes containing expression(), url(javascript:), behavior, -moz-binding
        $html = preg_replace(
            '/\sstyle\s*=\s*(["\'])(?:[^"\']*(?:expression|javascript|vbscript|behavior|-moz-binding)[^"\']*)\1/iu',
            '',
            $html
        ) ?? $html;

        return $html;
    }
}
