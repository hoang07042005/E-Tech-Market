import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '@/configs/api.config';
import { useNavigate } from 'react-router-dom';
import '@/styles/components/EtechChatbotWidget.css';

type ProductCard = {
  id: number;
  name: string;
  slug: string;
  brand: string;
  main_image_url: string;
  price: number;
  original_price?: number;
  avg_rating?: number;
  reviews_count?: number;
};

type OrderStatus = {
  order_code: string;
  status_label: string;
  status_color: string;
  total: number;
  created_at: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'model';
  text: string;
  products?: ProductCard[];
  order?: OrderStatus;
  coupon_code?: string;
  intent?: string;
  timestamp: Date;
};

export default function EtechChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'model',
          text: 'Xin chào bạn! Chào mừng bạn đến với **E-Tech Market - Thế giới công nghệ chính hãng**. 🤖\n\nTôi có thể giúp gì cho bạn hôm nay? (Vui lòng chọn một mục dưới đây hoặc nhập câu hỏi trực tiếp nhé):',
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, showQuickActions]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    setShowQuickActions(false);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await apiFetch<any>('/chatbot/message', {
        method: 'POST',
        body: JSON.stringify({ message: text, history }),
      });

      const modelMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: res.reply || 'Xin lỗi, mình không thể trả lời lúc này.',
        products: res.products,
        order: res.order,
        coupon_code: res.coupon_code,
        intent: res.intent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: 'Có lỗi xảy ra khi kết nối. Vui lòng thử lại sau.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderText = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  if (!isOpen) {
    return (
      <button
        className="etech-bot-fab"
        onClick={() => setIsOpen(true)}
      >
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="etech-bot-container">
      {/* Header */}
      <div className="etech-bot-header">
        <div className="etech-bot-header-left">
          <div className="etech-bot-header-icon">
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22 14h-1c0-3.87-3.13-7-7-7h-1V5.73A2 2 0 1 0 10 5.73V7H9c-3.87 0-7 3.13-7 7H1v4h1c0 2.21 1.79 4 4 4h12c2.21 0 4-1.79 4-4h1v-4zm-14-1c.83 0 1.5.67 1.5 1.5S8.83 16 8 16s-1.5-.67-1.5-1.5S7.17 13 8 13zm8 0c.83 0 1.5.67 1.5 1.5S16.83 16 16 16s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/>
            </svg>
          </div>
          <div>
            <h3 className="etech-bot-header-title">E-Tech Bot</h3>
            <div className="etech-bot-header-status">
              <span className="etech-bot-status-dot"></span>
              Sẵn sàng hỗ trợ
            </div>
          </div>
        </div>
        <div className="etech-bot-header-actions">
          <button
            className="etech-bot-header-btn"
            onClick={() => {
              setMessages([{
                id: 'welcome',
                role: 'model',
                text: 'Xin chào bạn! Chào mừng bạn đến với **E-Tech Market - Thế giới công nghệ chính hãng**. 🤖\n\nTôi có thể giúp gì cho bạn hôm nay? (Vui lòng chọn một mục dưới đây hoặc nhập câu hỏi trực tiếp nhé):',
                timestamp: new Date(),
              }]);
              setShowQuickActions(true);
            }}
            title="Làm mới"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            className="etech-bot-header-btn"
            onClick={() => setIsOpen(false)}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="etech-bot-messages">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className="etech-bot-msg-wrapper">
              <div className={`etech-bot-msg-row ${isUser ? 'user' : 'model'}`}>
                {!isUser && (
                  <div className="etech-bot-avatar">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22 14h-1c0-3.87-3.13-7-7-7h-1V5.73A2 2 0 1 0 10 5.73V7H9c-3.87 0-7 3.13-7 7H1v4h1c0 2.21 1.79 4 4 4h12c2.21 0 4-1.79 4-4h1v-4zm-14-1c.83 0 1.5.67 1.5 1.5S8.83 16 8 16s-1.5-.67-1.5-1.5S7.17 13 8 13zm8 0c.83 0 1.5.67 1.5 1.5S16.83 16 16 16s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/>
                    </svg>
                  </div>
                )}
                <div className="etech-bot-msg-bubble">
                  {renderText(msg.text)}
                  <div className="etech-bot-msg-time">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Extras */}
              <div className={`etech-bot-extras ${isUser ? 'user' : 'model'}`}>
                {msg.products && msg.products.length > 0 && (
                  <div className="etech-bot-product-carousel">
                    {msg.products.map((p) => (
                      <div
                        key={p.id}
                        className="etech-bot-product-card"
                        onClick={() => navigate(`/products/${p.slug}`)}
                      >
                        <div className="etech-bot-product-img-wrap">
                          <img
                            src={p.main_image_url}
                            alt={p.name}
                            className="etech-bot-product-img"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png' }}
                          />
                        </div>
                        <div className="etech-bot-product-info">
                          <div className="etech-bot-product-brand">{p.brand}</div>
                          <div className="etech-bot-product-name">{p.name}</div>
                          {p.avg_rating != null && (
                            <div className="etech-bot-product-rating">
                              <span style={{ color: '#fbbf24', fontSize: '12px' }}>★</span>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#fbbf24' }}>{p.avg_rating}</span>
                              <span style={{ fontSize: '10px', color: '#94a3b8' }}>({p.reviews_count || 0})</span>
                            </div>
                          )}
                          <div className="etech-bot-product-price-wrap">
                            <div>
                              <div className="etech-bot-product-price">
                                {new Intl.NumberFormat('vi-VN').format(p.price)}đ
                              </div>
                              {p.original_price && p.original_price > p.price && (
                                <div className="etech-bot-product-orig-price">
                                  {new Intl.NumberFormat('vi-VN').format(p.original_price)}đ
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {msg.coupon_code && (
                  <div className="etech-bot-coupon">
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    <div>
                      <div className="etech-bot-coupon-text">Mã giảm giá dành cho bạn!</div>
                      <div className="etech-bot-coupon-code">{msg.coupon_code}</div>
                    </div>
                  </div>
                )}

                {msg.intent === 'flashsale' && (
                  <button
                    className="etech-bot-flash-btn"
                    onClick={() => navigate('/flash-sale')}
                  >
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                    </svg>
                    Vào trang Flash Sale
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="etech-bot-msg-row model" style={{ marginBottom: '16px' }}>
            <div className="etech-bot-avatar">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 14h-1c0-3.87-3.13-7-7-7h-1V5.73A2 2 0 1 0 10 5.73V7H9c-3.87 0-7 3.13-7 7H1v4h1c0 2.21 1.79 4 4 4h12c2.21 0 4-1.79 4-4h1v-4zm-14-1c.83 0 1.5.67 1.5 1.5S8.83 16 8 16s-1.5-.67-1.5-1.5S7.17 13 8 13zm8 0c.83 0 1.5.67 1.5 1.5S16.83 16 16 16s-1.5-.67-1.5-1.5.67-1.5 1.5-1.5z"/>
              </svg>
            </div>
            <div className="etech-bot-typing-indicator">
              <span className="etech-bot-typing-dot"></span>
              <span className="etech-bot-typing-dot"></span>
              <span className="etech-bot-typing-dot"></span>
            </div>
          </div>
        )}

        {showQuickActions && messages.length === 1 && (
          <div className="etech-bot-quick-actions">
            {[
              '🔍 Tìm & Gợi ý sản phẩm',
              '⚖️ So sánh sản phẩm',
              '📦 Tra cứu đơn hàng',
              '🎁 Ưu đãi & Khuyến mãi',
              '💬 Cần tư vấn chuyên sâu',
              '❓ Câu hỏi thường gặp (FAQs)'
            ].map((text) => (
              <button
                key={text}
                onClick={() => handleSend(text)}
                className="etech-bot-quick-btn"
              >
                {text}
              </button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="etech-bot-input-wrap">
        <div className="etech-bot-input-inner">
          <input 
            className="etech-bot-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend(inputText);
            }}
            placeholder="Nhập câu hỏi của bạn..."
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend(inputText)}
            disabled={!inputText.trim() || isLoading}
            className={`etech-bot-send-btn ${inputText.trim() && !isLoading ? 'active' : 'disabled'}`}
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
