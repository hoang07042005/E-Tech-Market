<?php

namespace Tests\Unit;

use App\Support\HtmlSanitizer;
use PHPUnit\Framework\TestCase;

class HtmlSanitizerTest extends TestCase
{
    public function test_returns_null_for_null_input(): void
    {
        $this->assertNull(HtmlSanitizer::sanitize(null));
    }

    public function test_returns_null_for_empty_string(): void
    {
        $this->assertNull(HtmlSanitizer::sanitize(''));
        $this->assertNull(HtmlSanitizer::sanitize('   '));
    }

    public function test_preserves_basic_formatting_tags(): void
    {
        $html = '<p>Hello <strong>World</strong></p>';
        $this->assertEquals($html, HtmlSanitizer::sanitize($html));
    }

    public function test_preserves_lists(): void
    {
        $html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
        $this->assertEquals($html, HtmlSanitizer::sanitize($html));
    }

    public function test_preserves_headings(): void
    {
        $html = '<h1>Title</h1><h2>Subtitle</h2>';
        $this->assertEquals($html, HtmlSanitizer::sanitize($html));
    }

    public function test_preserves_tables(): void
    {
        $html = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>';
        $this->assertEquals($html, HtmlSanitizer::sanitize($html));
    }

    public function test_preserves_images_and_links(): void
    {
        $html = '<a href="https://example.com">Link</a><img src="/image.jpg" alt="img">';
        $result = HtmlSanitizer::sanitize($html);
        $this->assertStringContainsString('<a', $result);
        $this->assertStringContainsString('<img', $result);
    }

    public function test_removes_script_tags(): void
    {
        $html = '<p>Safe</p><script>alert("xss")</script><p>Also safe</p>';
        $result = HtmlSanitizer::sanitize($html);
        $this->assertStringNotContainsString('<script', $result);
        $this->assertStringNotContainsString('alert', $result);
        $this->assertStringContainsString('Safe', $result);
    }

    public function test_removes_style_tags(): void
    {
        $html = '<style>body { display: none; }</style><p>Content</p>';
        $result = HtmlSanitizer::sanitize($html);
        $this->assertStringNotContainsString('<style', $result);
        $this->assertStringContainsString('Content', $result);
    }

    public function test_removes_iframe_tags(): void
    {
        $html = '<iframe src="https://evil.com"></iframe><p>OK</p>';
        $result = HtmlSanitizer::sanitize($html);
        $this->assertStringNotContainsString('<iframe', $result);
    }

    public function test_removes_form_tags(): void
    {
        $html = '<form action="/steal"><input type="text"><button>Submit</button></form>';
        $result = HtmlSanitizer::sanitize($html);
        $this->assertStringNotContainsString('<form', $result);
        $this->assertStringNotContainsString('<input', $result);
        $this->assertStringNotContainsString('<button', $result);
    }

    public function test_removes_event_handler_attributes(): void
    {
        $html = '<p onclick="alert(1)">Click me</p>';
        $result = HtmlSanitizer::sanitize($html);
        $this->assertStringNotContainsString('onclick', $result);
        $this->assertStringContainsString('Click me', $result);
    }

    public function test_removes_onerror_on_img(): void
    {
        $html = '<img src="x" onerror="alert(1)">';
        $result = HtmlSanitizer::sanitize($html);
        $this->assertStringNotContainsString('onerror', $result);
    }

    public function test_removes_javascript_urls_in_href(): void
    {
        $html = '<a href="javascript:alert(1)">XSS</a>';
        $result = HtmlSanitizer::sanitize($html);
        $this->assertStringNotContainsString('javascript:', $result);
    }

    public function test_removes_vbscript_urls(): void
    {
        $html = '<a href="vbscript:MsgBox(1)">VBS</a>';
        $result = HtmlSanitizer::sanitize($html);
        $this->assertStringNotContainsString('vbscript:', $result);
    }

    public function test_allows_data_image_urls(): void
    {
        $html = '<img src="data:image/png;base64,ABC123">';
        $result = HtmlSanitizer::sanitize($html);
        $this->assertStringContainsString('data:image/', $result);
    }

    public function test_removes_base_tag(): void
    {
        $html = '<base href="https://evil.com"><p>Safe</p>';
        $result = HtmlSanitizer::sanitize($html);
        $this->assertStringNotContainsString('<base', $result);
    }

    public function test_removes_meta_tag(): void
    {
        $html = '<meta http-equiv="refresh" content="0;url=https://evil.com"><p>Safe</p>';
        $result = HtmlSanitizer::sanitize($html);
        $this->assertStringNotContainsString('<meta', $result);
    }

    public function test_removes_object_and_embed_tags(): void
    {
        $html = '<object data="evil.swf"></object><embed src="evil.swf"><p>OK</p>';
        $result = HtmlSanitizer::sanitize($html);
        $this->assertStringNotContainsString('<object', $result);
        $this->assertStringNotContainsString('<embed', $result);
    }
}
