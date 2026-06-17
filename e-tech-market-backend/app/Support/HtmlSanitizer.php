<?php

namespace App\Support;

use Symfony\Component\HtmlSanitizer\HtmlSanitizer as SymfonyHtmlSanitizer;
use Symfony\Component\HtmlSanitizer\HtmlSanitizerConfig;

class HtmlSanitizer
{
    /**
     * Sanitizer for admin-entered HTML content.
     * Upgraded to symfony/html-sanitizer to prevent mutation XSS and bypasses.
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

        $config = (new HtmlSanitizerConfig())
            ->allowSafeElements()
            ->allowAttribute('src', '*')
            ->allowAttribute('href', '*')
            ->allowAttribute('alt', '*')
            ->allowAttribute('title', '*')
            ->allowAttribute('style', '*')
            ->allowAttribute('class', '*')
            ->allowAttribute('width', '*')
            ->allowAttribute('height', '*')
            ->allowAttribute('target', '*')
            ->allowLinkSchemes(['http', 'https', 'mailto'])
            ->allowMediaSchemes(['http', 'https', 'data'])
            ->allowRelativeLinks()
            ->allowRelativeMedias()
            ->dropElement('script', true)
            ->dropElement('style', true)
            ->dropElement('iframe', true)
            ->dropElement('object', true)
            ->dropElement('embed', true);

        $sanitizer = new SymfonyHtmlSanitizer($config);

        return $sanitizer->sanitize($html);
    }
}
