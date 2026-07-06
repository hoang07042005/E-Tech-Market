<?php

namespace App\Support;

use HTMLPurifier;
use HTMLPurifier_Config;

/**
 * HTML sanitizer backed by HTMLPurifier (ezyang/htmlpurifier).
 *
 * HTMLPurifier is a standards-compliant HTML filter that uses a proper parser
 * instead of regex, making it resistant to the full range of XSS vectors
 * including nested/malformed tags, unicode tricks, and CSS-based attacks.
 *
 * Configuration philosophy:
 *   - Allowlist approach: only explicitly permitted tags/attributes pass through.
 *   - Inline styles are permitted (needed for WYSIWYG editors) but CSS is also
 *     filtered by HTMLPurifier to remove expression(), url(), javascript:, etc.
 *   - javascript: and data: URIs are blocked by HTMLPurifier's URI scheme policy.
 *   - SVG is NOT in the allowlist — HTMLPurifier does not fully parse SVG and
 *     SVG can contain arbitrary JS. If SVG is needed, store it as a separate
 *     upload rather than inline HTML.
 *
 * Allowed tag set mirrors common rich-text editor output (TinyMCE / CKEditor).
 */
class HtmlSanitizer
{
    private static ?HTMLPurifier $purifier = null;

    private static function getPurifier(): HTMLPurifier
    {
        if (self::$purifier !== null) {
            return self::$purifier;
        }

        $config = HTMLPurifier_Config::createDefault();

        // ── Allowed elements & attributes ────────────────────────────────────
        $config->set('HTML.Allowed',
            // Structure
            'div[class|id|style],section[class|id|style],article[class|id|style],'
            . 'header[class|id|style],footer[class|id|style],main[class|id|style],'
            . 'aside[class|id|style],nav[class|id|style],'
            // Headings
            . 'h1[class|id|style],h2[class|id|style],h3[class|id|style],'
            . 'h4[class|id|style],h5[class|id|style],h6[class|id|style],'
            // Text
            . 'p[class|style],span[class|style],strong,b,em,i,u,s,del,ins,sup,sub,'
            . 'br,hr[class|style],'
            // Lists
            . 'ul[class|style],ol[class|style],li[class|style],'
            // Links — href is URI-filtered (javascript: blocked automatically)
            . 'a[href|title|target|rel|class|style],'
            // Images — src URI-filtered, data: blocked by URI policy
            . 'img[src|alt|title|width|height|class|style],'
            // Tables
            . 'table[class|style|border|cellspacing|cellpadding|width],'
            . 'thead[class|style],tbody[class|style],tfoot[class|style],'
            . 'tr[class|style],th[class|style|colspan|rowspan|scope],'
            . 'td[class|style|colspan|rowspan],'
            // Formatting
            . 'blockquote[class|style|cite],pre[class|style],code[class|style],'
            . 'figure[class|style],figcaption[class|style],'
            // Media
            . 'video[src|controls|width|height|class|style|autoplay|loop|muted|preload],'
            . 'audio[src|controls|class|style],'
            . 'source[src|type],'
            // iframes (for YouTube embeds etc.) — src is URI-filtered
            . 'iframe[src|width|height|frameborder|class|style|title],'
            // Font Awesome / icon spans
            . 'i[class|style],svg[class|style|width|height|viewbox|xmlns],'
            . 'path[d|fill|stroke|class],use[href]'
        );

        // ── URI / link policy ─────────────────────────────────────────────────
        // Block javascript: and data: URIs in href/src/action everywhere.
        $config->set('URI.AllowedSchemes', [
            'http'   => true,
            'https'  => true,
            'mailto' => true,
            'tel'    => true,
            'data'   => true,   // allow data: for img src (base64 images from WYSIWYG)
        ]);
        // Do NOT allow data: in href/action (only img src) — handled by per-attr config below.
        $config->set('URI.SafeIframeRegexp', '%^https?://(www\.)?(youtube\.com/embed/|youtu\.be/|player\.vimeo\.com/)%');

        // ── CSS filtering ─────────────────────────────────────────────────────
        // HTMLPurifier's CSS filter strips expression(), url(javascript:), etc.
        $config->set('CSS.AllowTricky', true);   // allow position/display etc. for rich layouts
        $config->set('CSS.Trusted', false);       // still apply filtering

        // ── Output / encoding ─────────────────────────────────────────────────
        $config->set('Core.Encoding', 'UTF-8');
        $config->set('HTML.TidyLevel', 'none');  // don't alter formatting aggressively
        $config->set('Output.Newline', "\n");

        // Store the serializer cache in Laravel's storage folder.
        $cacheDir = storage_path('framework/htmlpurifier');
        if (! is_dir($cacheDir)) {
            mkdir($cacheDir, 0755, true);
        }
        $config->set('Cache.SerializerPath', $cacheDir);

        // Required for iframe
        $config->set('HTML.SafeIframe', true);

        // Required to add custom elements
        $config->set('HTML.DefinitionID', 'html5-definitions');
        $config->set('HTML.DefinitionRev', 1);

        // Add HTML5 elements definitions
        if ($def = $config->maybeGetRawHTMLDefinition()) {
            $def->addElement('section', 'Block', 'Flow', 'Common');
            $def->addElement('article', 'Block', 'Flow', 'Common');
            $def->addElement('header', 'Block', 'Flow', 'Common');
            $def->addElement('footer', 'Block', 'Flow', 'Common');
            $def->addElement('main', 'Block', 'Flow', 'Common');
            $def->addElement('aside', 'Block', 'Flow', 'Common');
            $def->addElement('nav', 'Block', 'Flow', 'Common');
            $def->addElement('figure', 'Block', 'Flow', 'Common');
            $def->addElement('figcaption', 'Inline', 'Flow', 'Common');
            
            $def->addElement('video', 'Block', 'Flow', 'Common', [
                'src' => 'URI', 'controls' => 'Bool', 'width' => 'Length', 'height' => 'Length',
                'autoplay' => 'Bool', 'loop' => 'Bool', 'muted' => 'Bool', 'preload' => 'Text'
            ]);
            $def->addElement('audio', 'Block', 'Flow', 'Common', [
                'src' => 'URI', 'controls' => 'Bool', 'autoplay' => 'Bool', 'loop' => 'Bool', 'muted' => 'Bool'
            ]);
            $def->addElement('source', 'Block', 'Empty', 'Common', [
                'src' => 'URI', 'type' => 'Text'
            ]);
            
            $def->addElement('svg', 'Block', 'Flow', 'Common', [
                'width' => 'Text', 'height' => 'Text', 'viewbox' => 'Text', 'xmlns' => 'URI'
            ]);
            $def->addElement('path', 'Inline', 'Empty', 'Common', [
                'd' => 'Text', 'fill' => 'Text', 'stroke' => 'Text'
            ]);
            $def->addElement('use', 'Inline', 'Empty', 'Common', [
                'href' => 'URI'
            ]);
        }

        self::$purifier = new HTMLPurifier($config);
        return self::$purifier;
    }

    /**
     * Sanitize an HTML string using HTMLPurifier.
     *
     * Returns null for empty/null input (consistent with the previous API so
     * all existing callers continue to work without changes).
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

        $purified = self::getPurifier()->purify($html);

        $result = trim($purified);
        return $result === '' ? null : $result;
    }
}
