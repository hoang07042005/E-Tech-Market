import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '@/configs/api.config';
import { useNavigate } from 'react-router-dom';

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
          text: 'Xin chào! 👋 Mình là **E-Tech Bot**, trợ lý tư vấn công nghệ của E-Tech Market.\n\nBạn cần mình hỗ trợ gì nào?',
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
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: '#f26522',
          color: 'white',
          border: 'none',
          boxShadow: '0 4px 12px rgba(242, 101, 34, 0.4)',
          cursor: 'pointer',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '380px',
        height: '600px',
        maxHeight: '80vh',
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f26522, #ff8a50)',
          padding: '16px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2a2 2 0 0 1 2 2v2.26l.46.12a5 5 0 0 1 3.51 3.51l.12.46H20a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1.91l-.12.46a5 5 0 0 1-3.51 3.51l-.46.12V20a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-1.34l-.46-.12a5 5 0 0 1-3.51-3.51l-.12-.46H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1.91l.12-.46a5 5 0 0 1 3.51-3.51l.46-.12V4a2 2 0 0 1 2-2h4zM9.5 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm5 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zm-2.5 4c-1.5 0-2.83-.8-3.5-2H15c-.67 1.2-2 2-3.5 2z" />
            </svg>
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>E-Tech Bot</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', opacity: 0.9 }}>
              <span style={{ width: '8px', height: '8px', backgroundColor: '#4ade80', borderRadius: '50%' }}></span>
              Sẵn sàng hỗ trợ
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => {
              setMessages([{
                id: 'welcome',
                role: 'model',
                text: 'Xin chào! 👋 Mình là **E-Tech Bot**, trợ lý tư vấn công nghệ của E-Tech Market.\n\nBạn cần mình hỗ trợ gì nào?',
                timestamp: new Date(),
              }]);
              setShowQuickActions(true);
            }}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
            title="Làm mới"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => setIsOpen(false)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '4px' }}
          >
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="etech-bot-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px', backgroundColor: '#f8fafc' }}>
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} style={{ marginBottom: '16px' }}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  gap: '8px',
                  alignItems: 'flex-end',
                }}
              >
                {!isUser && (
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      background: 'linear-gradient(135deg, #f26522, #ff8a50)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2a2 2 0 0 1 2 2v2.26l.46.12a5 5 0 0 1 3.51 3.51l.12.46H20a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1.91l-.12.46a5 5 0 0 1-3.51 3.51l-.46.12V20a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-1.34l-.46-.12a5 5 0 0 1-3.51-3.51l-.12-.46H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1.91l.12-.46a5 5 0 0 1 3.51-3.51l.46-.12V4a2 2 0 0 1 2-2h4z" />
                    </svg>
                  </div>
                )}
                <div
                  style={{
                    maxWidth: '75%',
                    backgroundColor: isUser ? '#f26522' : 'white',
                    color: isUser ? 'white' : '#1e293b',
                    padding: '12px 16px',
                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {renderText(msg.text)}
                  <div
                    style={{
                      fontSize: '10px',
                      color: isUser ? 'rgba(255,255,255,0.7)' : '#94a3b8',
                      marginTop: '4px',
                      textAlign: isUser ? 'right' : 'left',
                    }}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              {/* Extras */}
              <div style={{ marginLeft: isUser ? '0' : '36px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {msg.products && msg.products.length > 0 && (
                  <div className="etech-bot-scroll" style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', margin: '0 -16px', paddingLeft: '16px' }}>
                    {msg.products.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => navigate(`/products/${p.slug}`)}
                        style={{
                          minWidth: '160px',
                          width: '160px',
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          border: '1px solid #e2e8f0',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ height: '120px', backgroundColor: '#f8fafc', padding: '8px' }}>
                          <img
                            src={p.main_image_url}
                            alt={p.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png' }}
                          />
                        </div>
                        <div style={{ padding: '8px' }}>
                          <div style={{ fontSize: '10px', color: '#f26522', fontWeight: 'bold' }}>{p.brand}</div>
                          <div style={{ fontSize: '12px', fontWeight: '600', height: '34px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {p.name}
                          </div>
                          {p.avg_rating != null && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                              <span style={{ color: '#fbbf24', fontSize: '12px' }}>★</span>
                              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#fbbf24' }}>{p.avg_rating}</span>
                              <span style={{ fontSize: '10px', color: '#94a3b8' }}>({p.reviews_count || 0})</span>
                            </div>
                          )}
                          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#f26522' }}>
                                {new Intl.NumberFormat('vi-VN').format(p.price)}đ
                              </div>
                              {p.original_price && p.original_price > p.price && (
                                <div style={{ fontSize: '10px', textDecoration: 'line-through', color: '#94a3b8' }}>
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
                  <div
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #34d399)',
                      padding: '12px',
                      borderRadius: '12px',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      alignSelf: 'flex-start',
                    }}
                  >
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                    <div>
                      <div style={{ fontSize: '10px', opacity: 0.9 }}>Mã giảm giá dành cho bạn!</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '1px' }}>{msg.coupon_code}</div>
                    </div>
                  </div>
                )}

                {msg.intent === 'flashsale' && (
                  <button
                    onClick={() => navigate('/flash-sale')}
                    style={{
                      backgroundColor: '#f26522',
                      color: 'white',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer',
                      alignSelf: 'flex-start',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
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
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                background: 'linear-gradient(135deg, #f26522, #ff8a50)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a2 2 0 0 1 2 2v2.26l.46.12a5 5 0 0 1 3.51 3.51l.12.46H20a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1.91l-.12.46a5 5 0 0 1-3.51 3.51l-.46.12V20a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-1.34l-.46-.12a5 5 0 0 1-3.51-3.51l-.12-.46H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h1.91l.12-.46a5 5 0 0 1 3.51-3.51l.46-.12V4a2 2 0 0 1 2-2h4z" />
              </svg>
            </div>
            <div style={{ backgroundColor: 'white', padding: '12px 16px', borderRadius: '16px 16px 16px 4px', display: 'flex', gap: '4px' }}>
              <span className="typing-dot" style={{ width: '6px', height: '6px', backgroundColor: '#94a3b8', borderRadius: '50%', animation: 'typing 1s infinite' }}></span>
              <span className="typing-dot" style={{ width: '6px', height: '6px', backgroundColor: '#94a3b8', borderRadius: '50%', animation: 'typing 1s infinite 0.2s' }}></span>
              <span className="typing-dot" style={{ width: '6px', height: '6px', backgroundColor: '#94a3b8', borderRadius: '50%', animation: 'typing 1s infinite 0.4s' }}></span>
            </div>
          </div>
        )}

        {showQuickActions && messages.length === 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px', paddingLeft: '36px' }}>
            {['Sản phẩm bán chạy', 'Sản phẩm đang sale', 'Tư vấn laptop', 'Flash Sale'].map((text) => (
              <button
                key={text}
                onClick={() => handleSend(text)}
                style={{
                  border: '1px solid #f26522',
                  backgroundColor: 'white',
                  color: '#f26522',
                  padding: '6px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '500',
                }}
              >
                {text}
              </button>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', backgroundColor: 'white', borderTop: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: '24px', padding: '4px 8px 4px 16px' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend(inputText);
            }}
            placeholder="Nhập câu hỏi của bạn..."
            style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', padding: '8px 0' }}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend(inputText)}
            disabled={!inputText.trim() || isLoading}
            style={{
              background: inputText.trim() && !isLoading ? 'linear-gradient(135deg, #f26522, #ff8a50)' : '#e2e8f0',
              border: 'none',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              cursor: inputText.trim() && !isLoading ? 'pointer' : 'not-allowed',
            }}
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
      <style>
        {`
          @keyframes typing {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          .etech-bot-scroll::-webkit-scrollbar {
            display: none;
          }
          .etech-bot-scroll {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}
      </style>
    </div>
  );
}
