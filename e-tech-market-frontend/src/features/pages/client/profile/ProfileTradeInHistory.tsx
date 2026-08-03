import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '@/configs/api.config';
import '@/styles/pages/ProfileTradeInHistory.css';

interface TradeInRequest {
  id: number;
  request_code: string;
  category: { name: string; slug?: string };
  machine_info: string;
  images: string[] | string;
  status: string;
  estimated_price: string | null;
  admin_note: string | null;
  created_at: string;
  conditions?: { name: string; type?: string }[];
}

const formatCurrency = (value: string | number) => {
  if (!value) return '0 ₫';
  return Number(value).toLocaleString('vi-VN') + ' ₫';
};

const parseImages = (imgs: any): string[] => {
  if (!imgs) return [];
  if (Array.isArray(imgs)) return imgs;
  if (typeof imgs === 'string') {
    try { return JSON.parse(imgs); } catch { return []; }
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

const parseInfoLines = (machineInfo: string) => {
  const lines = (machineInfo || '').split('\n').filter(Boolean);
  const name = lines[0]?.replace(/^Tên máy:\s*/, '') || '';
  const specs: { key: string; val: string }[] = [];
  lines.slice(1).forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx > -1) {
      specs.push({ key: line.slice(0, colonIdx).trim(), val: line.slice(colonIdx + 1).trim() });
    } else {
      specs.push({ key: '', val: line.trim() });
    }
  });
  return { name, specs };
};

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Mới tiếp nhận', cls: 'pending' },
  quoted:    { label: 'Đã báo giá',    cls: 'quoted' },
  approved:  { label: 'Đã xác nhận',   cls: 'approved' },
  rejected:  { label: 'Từ chối',       cls: 'rejected' },
  completed: { label: 'Đã thu mua',    cls: 'completed' },
};

const IconDevice = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="5" y="2" width="14" height="20" rx="2"/>
    <path d="M12 18h.01"/>
  </svg>
);
const IconBug = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M8 2l1.5 1.5M16 2l-1.5 1.5M9 9H5M19 9h-4M5 15H9M15 15h4M12 5a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V9a4 4 0 0 0-4-4z"/>
  </svg>
);
const IconImage = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);
const IconTag = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.41 0l7.71-7.71a1 1 0 0 0 0-1.41L12 2z"/>
    <path d="M7 7h.01"/>
  </svg>
);
const IconMessage = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconWarning = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function ProfileTradeInHistory() {
  const [requests, setRequests] = useState<TradeInRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<TradeInRequest | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/me/trade-in') as any;
      if (data.status === 'success') setRequests(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xác nhận mức giá dự kiến này không?')) return;
    try {
      setIsAccepting(true);
      const res = await apiFetch(`/me/trade-in/${id}/accept`, { method: 'POST' }) as any;
      if (res.status === 'success') {
        setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
        setSelectedRequest(prev => prev?.id === id ? { ...prev, status: 'approved' } : prev);
      }
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra!');
    } finally {
      setIsAccepting(false);
    }
  };

  /* ── Loading ── */
  if (loading) return (
    <div className="ptih-container">
      <div className="ptih-header"><h1 className="ptih-title">Thu cũ đổi mới</h1></div>
      <div className="ptih-loading">
        <div className="ptih-loading-spinner" />
        Đang tải dữ liệu...
      </div>
    </div>
  );

  /* ── Main render ── */
  return (
    <div className="ptih-container">

      {/* Header */}
      <div className="ptih-header">
        <h1 className="ptih-title">Thu cũ đổi mới</h1>
        <Link to="/trade-in" className="ptih-btn-new">
          + Gửi yêu cầu mới
        </Link>
      </div>

      {/* Empty */}
      {requests.length === 0 ? (
        <div className="ptih-empty">
          <div className="ptih-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M17 17h2a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h2m8-6H7m0 0l3-3m-3 3l3 3"/>
            </svg>
          </div>
          <p>Bạn chưa gửi yêu cầu thu cũ đổi mới nào.</p>
          <Link to="/trade-in" className="ptih-btn-new">Định giá thiết bị ngay</Link>
        </div>
      ) : (
        <div className="ptih-list">
          {requests.map(req => {
            const d = new Date(req.created_at);
            const dateStr = d.toLocaleDateString('vi-VN');
            const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const imgs = parseImages(req.images);
            const thumb = imgs.length > 0 ? resolveMediaUrl(imgs[0]) : null;
            const { name, specs } = parseInfoLines(req.machine_info);
            const statusInfo = STATUS_MAP[req.status] ?? { label: req.status, cls: 'gray' };
            const shortSpec = specs.map(s => s.val).slice(0, 3).join(' – ');

            return (
              <div key={req.id} className="ptih-card">
                <div className="ptih-card-top">
                  <div>
                    <div className="ptih-code">#{req.request_code}</div>
                    <div className="ptih-date">{timeStr} ngày {dateStr}</div>
                  </div>
                  <span className={`ptih-badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                </div>

                <div className="ptih-card-main">
                  <div className="ptih-img-wrap">
                    {thumb
                      ? <img src={thumb} alt="thumb" />
                      : <div className="ptih-img-placeholder">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        </div>
                    }
                  </div>
                  <div className="ptih-info">
                    <div className="ptih-device-name">{name || req.category?.name || 'Thiết bị'}</div>
                    <div className="ptih-specs">{shortSpec}</div>
                    {req.estimated_price && (
                      <div className="ptih-price-block">
                        <span className="ptih-price-label">Giá dự kiến:</span>
                        <span className="ptih-price-val">{formatCurrency(req.estimated_price)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ptih-card-actions">
                  <button className="ptih-btn-view" onClick={() => setSelectedRequest(req)}>
                    Xem chi tiết →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selectedRequest && (() => {
        const { name, specs } = parseInfoLines(selectedRequest.machine_info);
        const imgs = parseImages(selectedRequest.images);
        const statusInfo = STATUS_MAP[selectedRequest.status] ?? { label: selectedRequest.status, cls: 'gray' };
        const hasPrice = !!selectedRequest.estimated_price;
        const hasNote = !!selectedRequest.admin_note;

        return (
          <div className="ptih-modal-overlay" onClick={() => setSelectedRequest(null)}>
            <div className="ptih-modal-content" onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div className="ptih-modal-header">
                <div className="ptih-modal-header-left">
                  <div className="ptih-modal-code">Mã yêu cầu</div>
                  <h2 className="ptih-modal-title">#{selectedRequest.request_code}</h2>
                </div>
                <button className="ptih-modal-close" onClick={() => setSelectedRequest(null)}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              {/* Body */}
              <div className="ptih-modal-body">

                {/* 1. Thông tin thiết bị */}
                <div className="ptih-modal-section">
                  <div className="ptih-section-label">
                    <span className="ptih-section-label-icon blue"><IconDevice /></span>
                    Thông tin thiết bị
                  </div>
                  <div className="ptih-info-grid">
                    {name && <div className="ptih-info-row"><span className="ptih-info-key">Tên máy</span><span className="ptih-info-val">{name}</span></div>}
                    {specs.map((s, i) => s.key
                      ? <div key={i} className="ptih-info-row"><span className="ptih-info-key">{s.key}</span><span className="ptih-info-val">{s.val}</span></div>
                      : <div key={i} className="ptih-info-row"><span className="ptih-info-val">{s.val}</span></div>
                    )}
                  </div>
                </div>

                {/* 2. Tình trạng */}
                {selectedRequest.conditions && selectedRequest.conditions.length > 0 && (
                  <div className="ptih-modal-section">
                    <div className="ptih-section-label">
                      <span className="ptih-section-label-icon orange"><IconBug /></span>
                      Tình trạng thiết bị đã khai báo
                    </div>
                    <div className="ptih-conditions-list">
                      {selectedRequest.conditions.map((c, i) => (
                        <div key={i} className="ptih-condition-item">
                          <span className="ptih-condition-check">✓</span>
                          {c.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Hình ảnh */}
                <div className="ptih-modal-section">
                  <div className="ptih-section-label">
                    <span className="ptih-section-label-icon green"><IconImage /></span>
                    Hình ảnh đính kèm
                  </div>
                  {imgs.length > 0 ? (
                    <div className="ptih-images-grid">
                      {imgs.map((img, i) => (
                        <div key={i} className="ptih-image-item" onClick={() => setLightbox(resolveMediaUrl(img))}>
                          <img src={resolveMediaUrl(img)} alt={`Hình ${i + 1}`} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ptih-no-images">Không có hình ảnh đính kèm.</div>
                  )}
                </div>

                {/* 4. Trạng thái & Giá */}
                <div className="ptih-modal-section">
                  <div className="ptih-section-label">
                    <span className="ptih-section-label-icon purple"><IconTag /></span>
                    Trạng thái định giá
                  </div>
                  <div className="ptih-status-row">
                    <span className="ptih-status-label">Trạng thái hiện tại</span>
                    <span className={`ptih-badge ${statusInfo.cls}`}>{statusInfo.label}</span>
                  </div>
                  {hasPrice && (
                    <div className="ptih-price-display">
                      <div className="ptih-price-display-label">Mức giá dự kiến từ Admin</div>
                      <div className="ptih-price-display-value">{formatCurrency(selectedRequest.estimated_price!)}</div>
                    </div>
                  )}
                </div>

                {/* 5. Phản hồi từ Admin */}
                {hasNote && (
                  <div className="ptih-modal-section">
                    <div className="ptih-section-label">
                      <span className="ptih-section-label-icon amber"><IconMessage /></span>
                      Nhận xét từ Admin
                    </div>
                    <div className="ptih-admin-note">
                      "{selectedRequest.admin_note}"
                    </div>
                  </div>
                )}

              </div>

              {/* Action Footer */}
              {selectedRequest.status === 'quoted' && (
                <div className="ptih-action-area">
                  <div className="ptih-notice">
                    <span className="ptih-notice-icon"><IconWarning /></span>
                    <span>
                      <strong>Lưu ý:</strong> Mức giá trên chỉ là dự kiến dựa vào mô tả của bạn.
                      Vui lòng mang máy ra <strong>cửa hàng gần nhất</strong> để nhân viên kiểm tra thực tế và định giá chính xác nhất trước khi xác nhận.
                    </span>
                  </div>
                  <button
                    className="ptih-btn-accept"
                    onClick={() => handleAcceptQuote(selectedRequest.id)}
                    disabled={isAccepting}
                  >
                    <IconCheck />
                    {isAccepting ? 'Đang xử lý...' : 'Xác nhận đồng ý mức giá dự kiến'}
                  </button>
                </div>
              )}

              {selectedRequest.status === 'approved' && (
                <div className="ptih-action-area">
                  <div className="ptih-success-notice">
                    <IconCheck />
                    <span>
                      Bạn đã xác nhận mức giá. Vui lòng <strong>mang máy ra cửa hàng</strong> để nhân viên kiểm tra và hoàn tất thu mua.
                    </span>
                  </div>
                </div>
              )}

              {selectedRequest.status === 'completed' && (
                <div className="ptih-action-area">
                  <div className="ptih-completed-notice">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                    Giao dịch đã hoàn tất thành công. Cảm ơn bạn đã tin tưởng E-Tech Market!
                  </div>
                </div>
              )}

              {selectedRequest.status === 'rejected' && (
                <div className="ptih-action-area">
                  <div className="ptih-rejected-notice">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    Yêu cầu này đã bị từ chối. {hasNote ? 'Vui lòng xem nhận xét từ Admin ở trên.' : ''}
                  </div>
                </div>
              )}

            </div>
          </div>
        );
      })()}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Preview" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 8, objectFit: 'contain', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }} />
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', backdropFilter: 'blur(4px)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

    </div>
  );
}
