import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '@/configs/api.config';
import '@/styles/pages/ProfileTradeInHistory.css';

interface TradeInRequest {
  id: number;
  request_code: string;
  category: { name: string; slug?: string };
  machine_info: string;
  images: string[];
  status: string;
  estimated_price: string;
  created_at: string;
  conditions?: { name: string; type: string }[];
}

const formatCurrency = (value: string | number) => {
  if (!value) return '0 ₫';
  return Number(value).toLocaleString('vi-VN') + ' ₫';
};

const parseImages = (imgs: any): string[] => {
  if (!imgs) return [];
  if (Array.isArray(imgs)) return imgs;
  if (typeof imgs === 'string') {
    try {
      return JSON.parse(imgs);
    } catch(e) {
      return [];
    }
  }
  return [];
};

const resolveMediaUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  const prefix = url.startsWith('/') ? '' : '/';
  const storagePrefix = url.includes('storage') ? '' : '/storage';
  return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${url.startsWith('/storage') ? '' : storagePrefix}${prefix}${url}`;
};

export default function ProfileTradeInHistory() {
  const [requests, setRequests] = useState<TradeInRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TradeInRequest | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/me/trade-in') as any;
      if (data.status === 'success') {
        setRequests(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching trade-in history', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn đồng ý với mức giá dự kiến này?')) return;
    
    try {
      setIsAccepting(true);
      const res = await apiFetch(`/me/trade-in/${id}/accept`, {
        method: 'POST'
      }) as any;
      if (res.status === 'success') {
        alert('Đã xác nhận mức giá thành công!');
        // Cập nhật lại UI
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
        setSelectedRequest(prev => prev && prev.id === id ? { ...prev, status: 'approved' } : prev);
      }
    } catch (error: any) {
      alert(error.message || 'Có lỗi xảy ra khi xác nhận!');
    } finally {
      setIsAccepting(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch(status) {
      case 'pending': return { label: 'Mới tiếp nhận', class: 'pending' };
      case 'quoted': return { label: 'Đã báo giá', class: 'quoted' };
      case 'approved': return { label: 'Đã đồng ý', class: 'approved' };
      case 'rejected': return { label: 'Từ chối', class: 'rejected' };
      case 'completed': return { label: 'Đã thu mua', class: 'completed' };
      default: return { label: 'Chưa xác định', class: 'gray' };
    }
  };

  if (loading) {
    return (
      <div className="ptih-container">
        <div className="ptih-header">
          <h1 className="ptih-title">Thu cũ đổi mới</h1>
        </div>
        <div className="ptih-loading">Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className="ptih-container">
      <div className="ptih-header">
        <h1 className="ptih-title">Thu cũ đổi mới</h1>
        {requests.length > 0 && (
          <Link to="/trade-in" className="ptih-btn-new">Gửi yêu cầu mới</Link>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="ptih-empty">
          <p>Bạn chưa gửi yêu cầu thu cũ đổi mới nào.</p>
          <Link to="/trade-in" className="ptih-btn-new">Định giá thiết bị ngay</Link>
        </div>
      ) : (
        <div className="ptih-list">
          {requests.map(req => {
            const dateObj = new Date(req.created_at);
            const dateString = dateObj.toLocaleDateString('vi-VN');
            const timeString = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            
            const imgs = parseImages(req.images);
            const thumbUrl = imgs.length > 0 ? resolveMediaUrl(imgs[0]) : null;
            const statusInfo = getStatusDisplay(req.status);
            
            const infoLines = (req.machine_info || '').split('\n');
            const deviceName = infoLines[0]?.replace('Tên máy: ', '') || req.category?.name || 'Thiết bị';
            const specs = infoLines.slice(1).join(' - ');

            return (
              <div key={req.id} className="ptih-card">
                <div className="ptih-card-top">
                  <div>
                    <div className="ptih-code">Mã yêu cầu: #{req.request_code}</div>
                    <div className="ptih-date">{timeString} ngày {dateString}</div>
                  </div>
                  <div className={`ptih-badge ${statusInfo.class}`}>{statusInfo.label}</div>
                </div>

                <div className="ptih-card-main">
                  <div className="ptih-img-wrap">
                    {thumbUrl ? (
                      <img src={thumbUrl} alt="Device thumbnail" />
                    ) : (
                      <div className="ptih-img-placeholder">No Image</div>
                    )}
                  </div>
                  
                  <div className="ptih-info">
                    <div className="ptih-device-name">{deviceName}</div>
                    <div className="ptih-specs">{specs}</div>
                    
                    {req.estimated_price && (
                      <div className="ptih-price-block">
                        <span className="ptih-price-label">Giá báo dự kiến:</span>
                        <span className="ptih-price-val">{formatCurrency(req.estimated_price)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ptih-card-actions">
                  <button className="ptih-btn-view" onClick={() => setSelectedRequest(req)}>
                    Xem chi tiết
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal View Details */}
      {selectedRequest && (
        <div className="ptih-modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="ptih-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="ptih-modal-header">
              <h2 className="ptih-modal-title">Chi tiết yêu cầu #{selectedRequest.request_code}</h2>
              <button className="ptih-modal-close" onClick={() => setSelectedRequest(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <div className="ptih-modal-body">
              
              <div>
                <div className="ptih-section-title">Thông tin thiết bị</div>
                {(selectedRequest.machine_info || '').split('\n').map((line, i) => (
                  <div key={i} style={{ marginBottom: 4, color: '#334155', fontSize: '14px' }}>
                    {line}
                  </div>
                ))}
              </div>

              {selectedRequest.conditions && selectedRequest.conditions.length > 0 && (
                <div>
                  <div className="ptih-section-title">Tình trạng đánh giá</div>
                  <div className="ptih-conditions-list">
                    {selectedRequest.conditions.map((cond, i) => (
                      <div key={i} className="ptih-condition-item">
                        {cond.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="ptih-section-title">Hình ảnh đính kèm</div>
                <div className="ptih-images-grid">
                  {parseImages(selectedRequest.images).map((img, i) => (
                    <img key={i} src={resolveMediaUrl(img)} alt={`Hình ${i + 1}`} />
                  ))}
                  {parseImages(selectedRequest.images).length === 0 && (
                    <div style={{ color: '#64748b', fontSize: '14px' }}>Không có hình ảnh</div>
                  )}
                </div>
              </div>

              <div>
                <div className="ptih-section-title">Trạng thái định giá</div>
                <div className="ptih-detail-row">
                  <span className="ptih-detail-label">Trạng thái</span>
                  <span className="ptih-detail-value">
                    <span className={`ptih-badge ${getStatusDisplay(selectedRequest.status).class}`}>
                      {getStatusDisplay(selectedRequest.status).label}
                    </span>
                  </span>
                </div>
                {selectedRequest.estimated_price && (
                  <div className="ptih-detail-row" style={{ borderBottom: 'none', marginBottom: 0 }}>
                    <span className="ptih-detail-label">Giá dự kiến (Admin báo)</span>
                    <span className="ptih-detail-value" style={{ color: '#9333ea', fontSize: '18px', fontWeight: '700' }}>
                      {formatCurrency(selectedRequest.estimated_price)}
                    </span>
                  </div>
                )}
              </div>

              {selectedRequest.status === 'quoted' && (
                <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ background: '#fef3c7', color: '#b45309', padding: '12px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.5' }}>
                    <strong>Lưu ý:</strong> Mức giá trên chỉ là dự kiến dựa vào mô tả của bạn. Vui lòng mang máy ra cửa hàng gần nhất để được nhân viên kiểm tra chi tiết và định giá một cách chính xác nhất.
                  </div>
                  <button 
                    onClick={() => handleAcceptQuote(selectedRequest.id)}
                    disabled={isAccepting}
                    style={{ background: '#16a34a', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontSize: '15px', fontWeight: '600', cursor: isAccepting ? 'not-allowed' : 'pointer', opacity: isAccepting ? 0.7 : 1 }}
                  >
                    {isAccepting ? 'Đang xử lý...' : 'Xác nhận mức giá dự kiến'}
                  </button>
                </div>
              )}

              {selectedRequest.status === 'approved' && (
                <div style={{ marginTop: '12px', background: '#fef3c7', color: '#b45309', padding: '12px', borderRadius: '8px', fontSize: '14px', lineHeight: '1.5' }}>
                  <strong>Lưu ý:</strong> Vui lòng mang máy ra cửa hàng gần nhất để được nhân viên kiểm tra chi tiết và định giá một cách chính xác nhất.
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
