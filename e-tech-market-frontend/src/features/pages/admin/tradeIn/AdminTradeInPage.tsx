import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/configs/api.config';
import { useGlobalToast } from '@/components/GlobalToastProvider';
import ConfirmModal from '@/components/ConfirmModal';
import '@/styles/admin/AdminTradeInPage.css';

interface TradeInRequest {
  id: number;
  request_code: string;
  category: { name: string; slug?: string };
  machine_info: string;
  images: string[];
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  estimated_price: string;
  final_price: string;
  status: string;
  admin_note: string;
  created_at: string;
  conditions?: TradeInCondition[];
}

interface TradeInCondition {
  id: number;
  category_id: number;
  category?: { name: string; slug?: string };
  name: string;
  description: string;
}

interface Category {
  id: number;
  name: string;
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

// --- BỘ ICON SVG CAO CẤP ---
const Icons = {
  Search: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  ArrowLeft: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>,
  User: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Device: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>,
  Calendar: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  Tag: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg>,
  AlertCircle: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>,
  Eye: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>,
  Trash: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6"/></svg>,
  Edit: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  Plus: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5v14"/></svg>
};

const AdminTradeInPage = () => {
  const [activeTab, setActiveTab] = useState('requests');
  const [requests, setRequests] = useState<TradeInRequest[]>([]);
  const [conditions, setConditions] = useState<TradeInCondition[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [condSearchKeyword, setCondSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const toast = useGlobalToast();

  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedRequest, setSelectedRequest] = useState<TradeInRequest | null>(null);
  const [quotePrice, setQuotePrice] = useState<string>('');
  const [adminNote, setAdminNote] = useState<string>('');

  const [editingCond, setEditingCond] = useState<TradeInCondition | null>(null);
  const [condForm, setCondForm] = useState({ category_id: '', name: '', description: '' });
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    if (activeTab === 'requests') {
      fetchRequests();
    } else {
      fetchConditions();
      fetchCategories();
    }
  }, [activeTab, filterStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = filterStatus ? `/admin/trade-in/requests?status=${filterStatus}` : '/admin/trade-in/requests';
      const data = await apiFetch<any>(url);
      if (data.status === 'success') {
        setRequests(data.data.data);
      }
    } catch (error) {
      toast.showToast({ type: 'error', message: 'Lỗi khi lấy danh sách yêu cầu' });
    } finally {
      setLoading(false);
    }
  };

  const fetchConditions = async () => {
    setLoading(true);
    try {
      const data = await apiFetch<any>('/admin/trade-in/conditions');
      if (data.status === 'success') {
        setConditions(data.data);
      }
    } catch (error) {
      toast.showToast({ type: 'error', message: 'Lỗi khi lấy danh sách tình trạng' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const data = await apiFetch<any>('/trade-in/categories');
      if (data.status === 'success') {
        setCategories(data.data);
      }
    } catch (error) {}
  };

  const handleOpenModal = (req: TradeInRequest) => {
    setSelectedRequest(req);
    setQuotePrice(req.estimated_price || '');
    setAdminNote(req.admin_note || '');
    setViewMode('detail');
  };

  const updateStatus = async (newStatus: string) => {
    if (!selectedRequest) return;
    try {
      const payload = {
        status: newStatus,
        estimated_price: quotePrice ? parseFloat(quotePrice) : null,
        admin_note: adminNote
      };
      const data = await apiFetch<any>(`/admin/trade-in/requests/${selectedRequest.id}/status`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (data.status === 'success') {
        toast.showToast({ type: 'success', message: 'Đã cập nhật hệ thống & gửi Email cho khách hàng!' });
        setViewMode('list');
        fetchRequests();
      } else {
        toast.showToast({ type: 'error', message: 'Có lỗi xảy ra' });
      }
    } catch (error) {
      toast.showToast({ type: 'error', message: 'Lỗi kết nối' });
    }
  };

  const handleSaveCondition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!condForm.category_id) {
        toast.showToast({ type: 'error', message: 'Vui lòng chọn danh mục' });
        return;
    }
    try {
      if (editingCond) {
          const url = `/admin/trade-in/conditions/${editingCond.id}`;
          const data = await apiFetch<any>(url, { method: 'PUT', body: JSON.stringify(condForm) });
          if (data.status === 'success') {
            toast.showToast({ type: 'success', message: 'Cập nhật tiêu chí thành công' });
            setEditingCond(null);
            setCondForm({ category_id: '', name: '', description: '' });
            fetchConditions();
          }
      } else {
          if (!bulkPasteText.trim()) return toast.showToast({ type: 'error', message: 'Vui lòng nhập dữ liệu' });
          const lines = bulkPasteText.split('\n').filter(line => line.trim() !== '');
          let successCount = 0;
          for (const line of lines) {
             const parts = line.split('|');
             const name = parts[0]?.trim();
             const desc = parts[1]?.trim() || '';
             if (name) {
                 await apiFetch<any>(`/admin/trade-in/conditions`, {
                    method: 'POST',
                    body: JSON.stringify({ category_id: condForm.category_id, name, description: desc })
                 });
                 successCount++;
             }
          }
          toast.showToast({ type: 'success', message: `Đã nhập thành công ${successCount} tiêu chí` });
          setBulkPasteText('');
          fetchConditions();
      }
    } catch (error) {
      toast.showToast({ type: 'error', message: 'Lỗi hệ thống' });
    }
  };

  const handleDeleteCondition = async (id: number) => {
    try {
      await apiFetch(`/admin/trade-in/conditions/${id}`, { method: 'DELETE' });
      toast.showToast({ type: 'success', message: 'Đã xóa tiêu chí' });
      fetchConditions();
      setDeleteConfirmId(null);
    } catch (error) {
      toast.showToast({ type: 'error', message: 'Lỗi khi xóa' });
    }
  };


  const filteredConds = conditions.filter(c => {
    const matchCat = !filterCategory || c.category_id.toString() === filterCategory;
    const matchSearch = !condSearchKeyword || `${c.name} ${c.description}`.toLowerCase().includes(condSearchKeyword.toLowerCase());
    return matchCat && matchSearch;
  });

  const filteredRequests = requests.filter(req => {
    if (searchKeyword) {
      const kw = searchKeyword.toLowerCase();
      if (!`${req.request_code} ${req.customer_name} ${req.customer_phone} ${req.machine_info}`.toLowerCase().includes(kw)) return false;
    }
    if (startDate) {
      const reqDate = new Date(req.created_at);
      const sDate = new Date(startDate);
      sDate.setHours(0,0,0,0);
      if (reqDate < sDate) return false;
    }
    if (endDate) {
      const reqDate = new Date(req.created_at);
      const eDate = new Date(endDate);
      eDate.setHours(23,59,59,999);
      if (reqDate > eDate) return false;
    }
    return true;
  });

  if (viewMode === 'detail' && selectedRequest) {
    const detailDate = new Date(selectedRequest.created_at);
    const detailTimeStr = detailDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const detailDateStr = detailDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '/');

    // Parse machine info lines
    const infoLines = selectedRequest.machine_info.split('\n').filter(Boolean);
    const machineName = infoLines.find(l => l.startsWith('Tên máy:'))?.replace('Tên máy: ', '') || infoLines[0] || '';
    const specLines = infoLines.filter(l => !l.startsWith('Tên máy:'));

    // Build thumbnail URL
    const detailImgs = parseImages(selectedRequest.images);
    const thumbImg = detailImgs.length > 0 ? (() => {
      let t = detailImgs[0];
      if (!t.startsWith('http')) {
        const prefix = t.startsWith('/') ? '' : '/';
        const sp = t.includes('storage') ? '' : '/storage';
        t = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${t.startsWith('/storage') ? '' : sp}${prefix}${t}`;
      }
      return t;
    })() : null;

    // Status timeline steps
    const timelineSteps = [
      { key: 'pending', label: 'Đã tiếp nhận yêu cầu' },
      { key: 'quoted', label: 'Đã báo giá (Chờ khách xác nhận)' },
      { key: 'approved', label: 'Khách đã xác nhận' },
      { key: 'completed', label: 'Hoàn tất thu mua' },
    ];
    const statusOrder: Record<string, number> = { pending: 0, quoted: 1, approved: 2, completed: 3, rejected: -1 };
    const currentStepIdx = statusOrder[selectedRequest.status] ?? 0;

    const statusBadgeConfig: Record<string, { label: string; color: string; bg: string }> = {
      pending: { label: 'Chờ định giá', color: '#10b981', bg: '#d1fae5' },
      quoted: { label: 'Đã báo giá', color: '#3b82f6', bg: '#dbeafe' },
      approved: { label: 'Khách đồng ý', color: '#6366f1', bg: '#e0e7ff' },
      rejected: { label: 'Từ chối', color: '#ef4444', bg: '#fee2e2' },
      completed: { label: 'Đã thu mua', color: '#f97316', bg: '#ffedd5' },
    };
    const badgeCfg = statusBadgeConfig[selectedRequest.status] || { label: selectedRequest.status, color: '#64748b', bg: '#f1f5f9' };

    return (
      <div className="ti-detail-page">
        {/* Header */}
        <div className="ti-detail-header">
          <button className="ti-detail-back-btn" onClick={() => setViewMode('list')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Quay lại danh sách
          </button>
          <div className="ti-detail-header-body">
            <div className="ti-detail-title-row">
              <div className="ti-detail-icon-box">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
              </div>
              <h1 className="ti-detail-title">Đơn Yêu Cầu Thu Cũ <span className="ti-detail-code">#{selectedRequest.request_code}</span></h1>
              <span className="ti-detail-status-badge" style={{ color: badgeCfg.color, backgroundColor: badgeCfg.bg }}>
                <span className="ti-detail-status-dot" style={{ background: badgeCfg.color }}></span>
                {badgeCfg.label}
              </span>
            </div>
            <div className="ti-detail-meta">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {detailTimeStr} • {detailDateStr}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="ti-detail-body">
          {/* LEFT COLUMN */}
          <div className="ti-detail-left">

            {/* Customer Info */}
            <div className="ti-detail-card">
              <div className="ti-detail-card-header">
                <div className="ti-detail-card-icon purple"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
                <h3>Thông tin khách hàng</h3>
              </div>
              <div className="ti-detail-card-body">
                <div className="ti-cust-grid">
                  <div>
                    <div className="ti-info-label">Họ và tên</div>
                    <div className="ti-info-value bold">{selectedRequest.customer_name}</div>
                  </div>
                  <div>
                    <div className="ti-info-label">Số điện thoại</div>
                    <div className="ti-info-value link">{selectedRequest.customer_phone}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div className="ti-info-label">Email</div>
                    <div className="ti-info-value">{selectedRequest.customer_email}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Device Info */}
            <div className="ti-detail-card">
              <div className="ti-detail-card-header">
                <div className="ti-detail-card-icon blue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg></div>
                <h3>Thiết bị cần định giá</h3>
                <span className="ti-category-pill">{selectedRequest.category?.name}</span>
              </div>
              <div className="ti-detail-card-body">
                <div className="ti-device-row">
                  {thumbImg ? (
                    <img src={thumbImg} alt="thumb" className="ti-device-thumb" />
                  ) : (
                    <div className="ti-device-thumb-placeholder"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/></svg></div>
                  )}
                    <div className="ti-device-info">
                      <div className="ti-info-label">Tên máy</div>
                      <div className="ti-device-name">{machineName}</div>
                      {specLines.map((line, i) => (
                        <div key={i} className="ti-device-specs">{line}</div>
                      ))}
                    </div>
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div className="ti-detail-card">
              <div className="ti-detail-card-header">
                <div className="ti-detail-card-icon orange"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
                <h3>Tình trạng &amp; Lỗi ghi nhận</h3>
              </div>
              <div className="ti-detail-card-body">
                {selectedRequest.conditions && selectedRequest.conditions.length > 0 ? (
                  <div className="ti-condition-grid">
                    {selectedRequest.conditions.map(c => (
                      <div key={c.id} className="ti-condition-card">
                        <div className="ti-cond-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div>
                        <div>
                          <div className="ti-cond-name">{c.name}</div>
                          <div className="ti-cond-desc">{c.description || 'Nhẹ'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="ti-empty-cond">Thiết bị hoạt động bình thường, không có lỗi ghi nhận.</div>
                )}
              </div>
            </div>

            {/* Images */}
            <div className="ti-detail-card">
              <div className="ti-detail-card-header">
                <div className="ti-detail-card-icon green"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
                <h3>Hình ảnh thực tế</h3>
              </div>
              <div className="ti-detail-card-body">
                {detailImgs.length > 0 ? (
                  <div className="ti-image-grid">
                    {detailImgs.map((img, i) => {
                      let fullUrl = img;
                      if (!img.startsWith('http')) {
                        const prefix = img.startsWith('/') ? '' : '/';
                        const sp = img.includes('storage') ? '' : '/storage';
                        fullUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${img.startsWith('/storage') ? '' : sp}${prefix}${img}`;
                      }
                      return (
                        <button
                          type="button"
                          key={i}
                          className="ti-image-item"
                          onClick={() => setLightboxIndex(i)}
                          style={{ border: 'none', padding: 0, cursor: 'pointer', background: 'none' }}
                        >
                          <img src={fullUrl} alt={`Ảnh ${i+1}`} loading="lazy" />
                          <div className="ti-image-overlay"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg></div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="ti-empty-cond">Không có hình ảnh đính kèm.</div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="ti-detail-right">

            {/* Pricing Decision */}
            <div className="ti-detail-card">
              <div className="ti-detail-card-header">
                <div className="ti-detail-card-icon purple"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><path d="M7 7h.01"/></svg></div>
                <h3>Quyết Định Thu Mua</h3>
              </div>
              <div className="ti-detail-card-body">
                <div className="ti-input-group">
                  <label>Mức giá đề xuất (VND)</label>
                  <div className="ti-price-input-wrap">
                    <input
                      type="text"
                      value={quotePrice ? Number(quotePrice).toLocaleString('vi-VN') : ''}
                      onChange={e => {
                        const raw = e.target.value.replace(/\./g, '').replace(/,/g, '').replace(/[^0-9]/g, '');
                        setQuotePrice(raw);
                      }}
                      placeholder="VD: 16.500.000"
                      className="ti-price-input"
                    />
                    <span className="ti-price-suffix">₫</span>
                  </div>
                </div>
                <div className="ti-input-group" style={{ marginTop: 16 }}>
                  <label>Ghi chú (Gửi qua Email cho khách)</label>
                  <textarea
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                    placeholder="Lý do chốt giá hoặc lý do từ chối thu mua..."
                    rows={5}
                    className="ti-admin-textarea"
                  />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="ti-detail-card">
              <div className="ti-detail-card-header">
                <div className="ti-detail-card-icon blue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
                <h3>Trạng thái xử lý</h3>
              </div>
              <div className="ti-detail-card-body">
                <div className="ti-timeline">
                  {selectedRequest.status === 'rejected' ? (
                    <div className="ti-timeline-step completed">
                      <div className="ti-timeline-circle done"><svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg></div>
                      <div className="ti-timeline-line"></div>
                      <div className="ti-timeline-content">
                        <div className="ti-timeline-label done">Đã tiếp nhận yêu cầu</div>
                        <div className="ti-timeline-time">{detailTimeStr} - {detailDateStr}</div>
                      </div>
                    </div>
                  ) : null}
                  {selectedRequest.status === 'rejected' ? (
                    <div className="ti-timeline-step rejected">
                      <div className="ti-timeline-circle reject">✕</div>
                      <div className="ti-timeline-content">
                        <div className="ti-timeline-label reject">Đã từ chối thu mua</div>
                        <div className="ti-timeline-time">{detailTimeStr} - {detailDateStr}</div>
                      </div>
                    </div>
                  ) : timelineSteps.map((step, idx) => {
                    const isDone = currentStepIdx >= idx;
                    const isCurrent = currentStepIdx === idx;
                    return (
                      <div key={step.key} className={`ti-timeline-step ${isDone ? 'completed' : ''}`}>
                        <div className={`ti-timeline-circle ${isDone ? 'done' : ''}`}>
                          {isDone ? <svg width="12" height="12" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> : null}
                        </div>
                        {idx < timelineSteps.length - 1 && <div className={`ti-timeline-line ${isDone ? 'done' : ''}`}></div>}
                        <div className="ti-timeline-content">
                          <div className={`ti-timeline-label ${isDone ? 'done' : ''}`}>{step.label}</div>
                          {isCurrent && <div className="ti-timeline-time">{detailTimeStr} - {detailDateStr}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {selectedRequest.status !== 'completed' && selectedRequest.status !== 'rejected' && (
              <div className="ti-action-btns">
                {selectedRequest.status === 'pending' && (
                  <button className="ti-btn-action ti-btn-approve" onClick={() => updateStatus('quoted')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Duyệt &amp; Báo giá
                  </button>
                )}
                {selectedRequest.status === 'quoted' && (
                  <button className="ti-btn-action ti-btn-edit" onClick={() => updateStatus('quoted')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Chỉnh sửa báo giá
                  </button>
                )}
                {selectedRequest.status === 'approved' && (
                  <button className="ti-btn-action ti-btn-approve" style={{ background: '#3b82f6' }} onClick={() => updateStatus('completed')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Hoàn tất thu mua
                  </button>
                )}
                <button className="ti-btn-action ti-btn-reject" onClick={() => updateStatus('rejected')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Từ chối
                </button>
              </div>
            )}
            {(selectedRequest.status === 'completed' || selectedRequest.status === 'rejected') && (
              <div style={{ marginTop: 20, textAlign: 'center', color: '#64748b', fontSize: 14 }}>
                Yêu cầu này đã {selectedRequest.status === 'completed' ? 'được hoàn tất' : 'bị từ chối'}. Không thể thay đổi trạng thái.
              </div>
            )}
          </div>
        </div>
      {/* Lightbox */}
      {lightboxIndex !== null && (() => {
        const allImgUrls = detailImgs.map(img => {
          if (img.startsWith('http')) return img;
          const prefix = img.startsWith('/') ? '' : '/';
          const sp = img.includes('storage') ? '' : '/storage';
          return `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${img.startsWith('/storage') ? '' : sp}${prefix}${img}`;
        });
        const total = allImgUrls.length;
        const goPrev = () => setLightboxIndex(idx => idx !== null ? (idx - 1 + total) % total : 0);
        const goNext = () => setLightboxIndex(idx => idx !== null ? (idx + 1) % total : 0);
        return (
          <div
            className="ti-lightbox-backdrop"
            onClick={() => setLightboxIndex(null)}
            onKeyDown={e => {
              if (e.key === 'Escape') setLightboxIndex(null);
              if (e.key === 'ArrowLeft') goPrev();
              if (e.key === 'ArrowRight') goNext();
            }}
            tabIndex={0}
            autoFocus
          >
            <div className="ti-lightbox-inner" onClick={e => e.stopPropagation()}>
              <button className="ti-lightbox-close" onClick={() => setLightboxIndex(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              {total > 1 && (
                <button className="ti-lightbox-nav ti-lightbox-prev" onClick={goPrev}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
              )}
              <img src={allImgUrls[lightboxIndex]} alt={`Ảnh ${lightboxIndex + 1}`} className="ti-lightbox-img" />
              {total > 1 && (
                <button className="ti-lightbox-nav ti-lightbox-next" onClick={goNext}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              )}
              <div className="ti-lightbox-counter">{lightboxIndex + 1} / {total}</div>
            </div>
          </div>
        );
      })()}
    </div>
    );
  }

  return (
    <div className="pro-layout ti-admin-layout">
      <div className="ti-admin-header">
        <div className="ti-admin-header-title">
          <h1 className="pro-title">Thu Cũ Đổi Mới</h1>
          <p className="pro-subtitle">Quản lý định giá và kiểm định thiết bị thương mại điện tử.</p>
        </div>
        
        {activeTab === 'requests' && (
          <div className="ti-admin-stats-card">
            <div className="ti-stats-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
            <div className="ti-stats-block border-right">
              <span className="ti-stats-label">Tổng yêu cầu</span>
              <span className="ti-stats-value text-purple">{requests.length}</span>
            </div>
            <div className="ti-stats-block">
              <span className="ti-stats-label">Đang xử lý</span>
              <span className="ti-stats-value text-orange">{requests.filter(r => r.status === 'pending').length}</span>
            </div>
          </div>
        )}


      </div>

      <div className="ti-admin-tabs">
        <button className={`ti-tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Yêu cầu định giá
        </button>
        <button className={`ti-tab-btn ${activeTab === 'conditions' ? 'active' : ''}`} onClick={() => setActiveTab('conditions')}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
          Tiêu chuẩn kiểm định
        </button>
      </div>

      <div className="ti-admin-main-container">
        {activeTab === 'requests' && (
            <>
                <div className="ti-admin-toolbar">
                    <div className="ti-admin-search">
                        <Icons.Search />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm mã đơn, tên thiết bị, khách hàng, SDT..." 
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                        />
                    </div>
                    <div className="ti-admin-filters">
                        <div className="ti-admin-select-wrapper">
                          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="">Tất cả trạng thái</option>
                            <option value="pending">Chờ định giá</option>
                            <option value="quoted">Đã báo giá</option>
                            <option value="approved">Khách đồng ý</option>
                            <option value="rejected">Từ chối</option>
                            <option value="completed">Đã thu mua</option>
                          </select>
                        </div>
                        <div className="ti-admin-date-picker" style={{ display: 'flex', gap: '8px', padding: 0, border: 'none', background: 'transparent' }}>
                          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }} title="Từ ngày" />
                          <span style={{ color: '#94a3b8' }}>-</span>
                          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px', outline: 'none' }} title="Đến ngày" />
                        </div>
                    </div>
                </div>
                
                <div className="ti-admin-req-list">
                  {loading ? <div className="pro-loader"><div className="spinner"></div> Đang tải dữ liệu...</div> : (
                    <>
                      {filteredRequests.map(req => {
                          const dateObj = new Date(req.created_at);
                          const dateString = dateObj.toLocaleDateString('vi-VN');
                          const timeString = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                          const catName = req.category?.name || 'Không rõ';
                          const isLaptop = req.category?.slug === 'laptop';
                          
                          let statusColor = 'gray';
                          let statusLabel = 'Chưa xác định';
                          switch(req.status) {
                              case 'pending': statusColor = 'green'; statusLabel = 'Mới tiếp nhận'; break;
                              case 'quoted': statusColor = 'blue'; statusLabel = 'Đã báo giá'; break;
                              case 'approved': statusColor = 'purple'; statusLabel = 'Khách đồng ý'; break;
                              case 'rejected': statusColor = 'red'; statusLabel = 'Từ chối'; break;
                              case 'completed': statusColor = 'orange'; statusLabel = 'Đã thu mua'; break;
                              default: break;
                          }

                          const deviceColor = isLaptop ? 'blue' : 'green';

                          return (
                              <div key={req.id} className={`ti-req-card border-${deviceColor}`}>
                                  <div className="ti-req-col ti-req-col-id">
                                      <div className={`ti-req-icon bg-${deviceColor}-light text-${deviceColor}`}>
                                          {isLaptop ? (
                                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="20" x2="22" y2="20"></line></svg>
                                          ) : (
                                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                                          )}
                                      </div>
                                      <div className="ti-req-id-info">
                                          <div className={`ti-req-code text-${deviceColor}`}>#{req.request_code}</div>
                                          <div className="ti-req-time"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg> {timeString} • {dateString}</div>
                                      </div>
                                  </div>

                                  <div className="ti-req-col ti-req-col-customer">
                                      <div className="ti-req-name">{req.customer_name}</div>
                                      <div className="ti-req-phone">{req.customer_phone}</div>
                                  </div>

                                  <div className="ti-req-col ti-req-col-device">
                                      <div className="ti-req-thumb">
                                          {(() => {
                                              const imgs = parseImages(req.images);
                                              if (imgs && imgs.length > 0) {
                                                  let thumbUrl = imgs[0];
                                                  if (!thumbUrl.startsWith('http')) {
                                                      const prefix = thumbUrl.startsWith('/') ? '' : '/';
                                                      const storagePrefix = thumbUrl.includes('storage') ? '' : '/storage';
                                                      thumbUrl = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${thumbUrl.startsWith('/storage') ? '' : storagePrefix}${prefix}${thumbUrl}`;
                                                  }
                                                  return <img src={thumbUrl} alt="thumb" />;
                                              }
                                              return <div className="ti-req-thumb-placeholder">No Image</div>;
                                          })()}
                                      </div>
                                      <div className="ti-req-device-info">
                                          <div className="ti-req-cat">{catName}</div>
                                          <div className="ti-req-specs">{req.machine_info.split('\n')[0].replace('Tên máy: ', '')}</div>
                                          <div className="ti-req-subspecs">{req.machine_info.split('\n').slice(1, 3).join(' - ').substring(0, 35)}...</div>
                                      </div>
                                  </div>

                                  <div className="ti-req-col ti-req-col-date">
                                      <div className="ti-req-label">Ngày yêu cầu</div>
                                      <div className="ti-req-value">{dateString}</div>
                                  </div>

                                  <div className="ti-req-col ti-req-col-price">
                                      <div className="ti-req-label">Giá đề xuất</div>
                                      <div className={`ti-req-value ${req.estimated_price ? 'text-purple price-bold' : ''}`}>
                                          {req.estimated_price ? formatCurrency(req.estimated_price) : '—'}
                                      </div>
                                  </div>

                                  <div className="ti-req-col ti-req-col-action">
                                      <div className={`ti-req-badge text-${statusColor}`}>
                                          <span className={`ti-req-dot bg-${statusColor}`}></span> {statusLabel}
                                      </div>
                                      <button className={`ti-req-btn-detail bg-${statusColor}-light text-${statusColor}`} onClick={() => handleOpenModal(req)}>
                                          Xem chi tiết <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                      {filteredRequests.length === 0 && <div className="pro-empty-state">Không có dữ liệu yêu cầu nào.</div>}
                      
                      <div className="ti-admin-pagination">
                          <div className="ti-page-info">Hiển thị 1 - {filteredRequests.length || 0} của {filteredRequests.length || 0} yêu cầu</div>
                          <div className="ti-page-controls">
                              <button className="ti-page-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button>
                              <button className="ti-page-btn active">1</button>
                              <button className="ti-page-btn"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></button>
                          </div>
                      </div>
                    </>
                  )}
                </div>
            </>
        )}

        {activeTab === 'conditions' && (
            <>
              {/* Inline Add/Edit Form */}
              <div className="ti-cond-form-card">
                <div className="ti-cond-form-title">
                  {editingCond ? 'Chỉnh sửa tiêu chuẩn kiểm định' : 'Thêm tiêu chuẩn kiểm định'}
                </div>
                <form onSubmit={handleSaveCondition}>
                  <div className="ti-cond-form-grid">
                    {/* Danh mục */}
                    <div className="ti-cond-field">
                      <label>Danh mục <span className="req">*</span></label>
                      <div className="ti-cond-select-wrap">
                        <select
                          required
                          value={condForm.category_id}
                          onChange={e => setCondForm({...condForm, category_id: e.target.value})}
                        >
                          <option value="">-- Chọn danh mục --</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <svg className="ti-cond-select-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                      </div>
                    </div>

                    {/* Tên tình trạng */}
                    <div className="ti-cond-field">
                      <label>Tên tình trạng / lỗi <span className="req">*</span></label>
                      {editingCond ? (
                        <input
                          type="text"
                          required
                          value={condForm.name}
                          onChange={e => setCondForm({...condForm, name: e.target.value})}
                          placeholder="Nhập tên tình trạng hoặc lỗi"
                          className="ti-cond-input"
                        />
                      ) : (
                        <input
                          type="text"
                          value={condForm.name}
                          onChange={e => setCondForm({...condForm, name: e.target.value})}
                          placeholder="Nhập tên tình trạng hoặc lỗi"
                          className="ti-cond-input"
                        />
                      )}
                    </div>

                    {/* Mô tả */}
                    <div className="ti-cond-field ti-cond-field-desc">
                      <label>Mô tả tiêu chuẩn <span className="req">*</span></label>
                      {editingCond ? (
                        <textarea
                          required
                          value={condForm.description}
                          onChange={e => setCondForm({...condForm, description: e.target.value})}
                          placeholder="Nhập mô tả chi tiết tiêu chuẩn"
                          rows={3}
                          className="ti-cond-textarea"
                        />
                      ) : (
                        <textarea
                          value={bulkPasteText}
                          onChange={e => setBulkPasteText(e.target.value)}
                          placeholder="Nhập mô tả chi tiết tiêu chuẩn"
                          rows={3}
                          className="ti-cond-textarea"
                        />
                      )}
                    </div>

                    {/* Actions */}
                    <div className="ti-cond-field ti-cond-field-actions">
                      <label>Thao tác</label>
                      <div className="ti-cond-action-btns">
                        <button type="submit" className="ti-cond-btn ti-cond-btn-save">
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                          Lưu
                        </button>
                        <button type="button" className="ti-cond-btn ti-cond-btn-reset" onClick={() => {
                          setEditingCond(null);
                          setCondForm({ category_id: '', name: '', description: '' });
                          setBulkPasteText('');
                        }}>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.15"/></svg>
                          Làm mới
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Hint box */}
                  {!editingCond && (
                    <div className="ti-cond-hint">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                      <span><strong>Hướng dẫn:</strong> Nhập thông tin tiêu chuẩn kiểm định để đánh giá tình trạng thiết bị một cách chính xác.</span>
                    </div>
                  )}
                </form>
              </div>

              {/* List */}
              <div className="ti-cond-list-card">
                <div className="ti-cond-list-header">
                  <div className="ti-cond-list-title">Danh sách tiêu chuẩn kiểm định</div>
                  <div className="ti-cond-list-controls">
                    <div className="ti-cond-filter-wrap">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                      <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option value="">Lọc theo danh mục: Tất cả</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="ti-cond-search-wrap">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                      <input
                        type="text"
                        placeholder="Tìm kiếm theo tên, mô tả..."
                        value={condSearchKeyword}
                        onChange={e => setCondSearchKeyword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="pro-loader"><div className="spinner"></div> Đang tải...</div>
                ) : (
                  <table className="ti-cond-table">
                    <thead>
                      <tr>
                        <th style={{width: 60}}>ID</th>
                        <th style={{width: 120}}>Danh mục</th>
                        <th style={{width: '25%'}}>Tên tình trạng / Lỗi</th>
                        <th>Mô tả tiêu chuẩn</th>
                        <th style={{width: 100, textAlign: 'right'}}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredConds.map(cond => {
                        const isLaptop = cond.category?.slug === 'laptop';
                        const catClass = isLaptop ? 'laptop' : (cond.category?.slug === 'dien-thoai' ? 'phone' : '');
                        return (
                          <tr key={cond.id}>
                            <td className="ti-cond-td-id">#{cond.id}</td>
                            <td>
                              <span className={`ti-cond-cat-tag ${catClass}`}>
                                {isLaptop ? (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="20" x2="22" y2="20"></line></svg>
                                ) : (
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                                )}
                                {cond.category?.name}
                              </span>
                            </td>
                            <td className="ti-cond-td-name">{cond.name}</td>
                          <td className="ti-cond-td-desc">{cond.description}</td>
                          <td>
                            <div className="ti-cond-td-actions">
                              <button className="ti-cond-icon-btn edit" title="Chỉnh sửa" onClick={() => {
                                setEditingCond(cond);
                                setCondForm({ category_id: cond.category_id.toString(), name: cond.name, description: cond.description });
                                setBulkPasteText('');
                              }}>
                                <Icons.Edit />
                              </button>
                              <button className="ti-cond-icon-btn delete" title="Xóa" onClick={() => setDeleteConfirmId(cond.id)}>
                                <Icons.Trash />
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                      {filteredConds.length === 0 && (
                        <tr><td colSpan={5} className="ti-cond-empty">Hệ thống chưa có tiêu chuẩn kiểm định nào.</td></tr>
                      )}
                    </tbody>
                  </table>
                )}

                <div className="ti-cond-list-footer">
                  <span>Hiển thị 1 đến {filteredConds.length} của {filteredConds.length} kết quả</span>
                  <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
                    <select style={{padding: '4px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13}}>
                      <option>10 / trang</option>
                      <option>20 / trang</option>
                    </select>
                    <button className="ti-page-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg></button>
                    <button className="ti-page-btn active">1</button>
                    <button className="ti-page-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg></button>
                  </div>
                </div>
              </div>
            </>
        )}
      </div>

      <ConfirmModal
        open={deleteConfirmId !== null}
        title="Xóa tiêu chí kiểm định?"
        message="Hành động này sẽ xóa vĩnh viễn tiêu chí khỏi hệ thống và không thể khôi phục. Bạn có chắc chắn?"
        onConfirm={() => { if (deleteConfirmId !== null) handleDeleteCondition(deleteConfirmId); }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};

export default AdminTradeInPage;