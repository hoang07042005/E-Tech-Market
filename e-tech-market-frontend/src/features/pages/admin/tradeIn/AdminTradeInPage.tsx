import React, { useState, useEffect } from 'react';
import { apiFetch } from '@/configs/api.config';
import { useGlobalToast } from '@/components/GlobalToastProvider';
import ConfirmModal from '@/components/ConfirmModal';
import '@/styles/admin/AdminTradeInPage.css';

interface TradeInRequest {
  id: number;
  request_code: string;
  category: { name: string };
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
  category?: { name: string };
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
  const [filterCategory, setFilterCategory] = useState('');
  const toast = useGlobalToast();

  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedRequest, setSelectedRequest] = useState<TradeInRequest | null>(null);
  const [quotePrice, setQuotePrice] = useState<string>('');
  const [adminNote, setAdminNote] = useState<string>('');

  const [condModalOpen, setCondModalOpen] = useState(false);
  const [editingCond, setEditingCond] = useState<TradeInCondition | null>(null);
  const [condForm, setCondForm] = useState({ category_id: '', name: '', description: '' });
  const [bulkPasteText, setBulkPasteText] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

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
            setCondModalOpen(false);
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
          setCondModalOpen(false);
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

  const renderStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string, cls: string }> = {
      'pending': { label: 'Chờ định giá', cls: 'status-pending' },
      'quoted': { label: 'Đã báo giá', cls: 'status-quoted' },
      'approved': { label: 'Khách đồng ý', cls: 'status-approved' },
      'rejected': { label: 'Đã hủy/Từ chối', cls: 'status-rejected' },
      'completed': { label: 'Đã thu mua', cls: 'status-completed' }
    };
    const conf = statusConfig[status] || { label: status, cls: 'status-default' };
    return (
      <div className={`pro-badge ${conf.cls}`}>
        <span className="dot"></span>
        {conf.label}
      </div>
    );
  };

  const filteredConditions = filterCategory ? conditions.filter(c => c.category_id.toString() === filterCategory) : conditions;
  const filteredRequests = requests.filter(req => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    return `${req.request_code} ${req.customer_name} ${req.customer_phone} ${req.machine_info}`.toLowerCase().includes(kw);
  });

  if (viewMode === 'detail' && selectedRequest) {
    return (
      <div className="pro-layout">
        <div className="pro-header-compact">
          <button className="pro-btn-back" onClick={() => setViewMode('list')}>
            <Icons.ArrowLeft /> <span>Quay lại danh sách</span>
          </button>
          <div className="pro-header-title-group">
            <h1 className="pro-title">Đơn Yêu Cầu Thu Cũ <span className="highlight">#{selectedRequest.request_code}</span></h1>
            {renderStatusBadge(selectedRequest.status)}
          </div>
          <div className="pro-header-meta">
            <span className="meta-item"><Icons.Calendar /> {new Date(selectedRequest.created_at).toLocaleString('vi-VN')}</span>
          </div>
        </div>
        
        <div className="pro-grid-master-detail">
          <div className="pro-master-col">
            {/* Customer Info Card */}
            <div className="pro-panel">
              <div className="pro-panel-header">
                <div className="pro-panel-icon"><Icons.User /></div>
                <h3 className="pro-panel-title">Thông tin khách hàng</h3>
              </div>
              <div className="pro-panel-body">
                <div className="pro-info-grid">
                  <div className="info-group">
                    <label>Họ và tên</label>
                    <div className="value-strong">{selectedRequest.customer_name}</div>
                  </div>
                  <div className="info-group">
                    <label>Số điện thoại</label>
                    <div className="value-link">{selectedRequest.customer_phone}</div>
                  </div>
                  <div className="info-group">
                    <label>Email liên hệ</label>
                    <div className="value">{selectedRequest.customer_email}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Device Info Card */}
            <div className="pro-panel mt-20">
              <div className="pro-panel-header">
                <div className="pro-panel-icon"><Icons.Device /></div>
                <h3 className="pro-panel-title">Thiết bị cần định giá</h3>
                <div className="pro-category-tag">{selectedRequest.category?.name}</div>
              </div>
              <div className="pro-panel-body">
                <div className="pro-device-specs">
                  <label>Thông số kỹ thuật (Khách hàng cung cấp):</label>
                  <div className="specs-box">{selectedRequest.machine_info}</div>
                </div>
                
                <div className="pro-device-conditions mt-16">
                  <label>Tình trạng & Lỗi ghi nhận:</label>
                  {selectedRequest.conditions && selectedRequest.conditions.length > 0 ? (
                    <div className="pro-tags-wrap">
                      {selectedRequest.conditions.map(c => (
                        <div key={c.id} className="pro-error-tag">
                          <Icons.AlertCircle /> <span>{c.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="pro-empty-text">Thiết bị hoạt động bình thường, ngoại hình tốt.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Gallery Card */}
            <div className="pro-panel mt-20">
              <div className="pro-panel-header">
                <h3 className="pro-panel-title">Hình ảnh thực tế</h3>
              </div>
              <div className="pro-panel-body">
                {selectedRequest.images && selectedRequest.images.length > 0 ? (
                  <div className="pro-image-grid">
                    {selectedRequest.images.map((img, i) => {
                      const fullUrl = img.startsWith('http') ? img : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/storage/${img}`;
                      return (
                        <a href={fullUrl} target="_blank" rel="noreferrer" key={i} className="pro-image-item">
                          <img src={fullUrl} alt={`Ảnh máy ${i+1}`} loading="lazy" />
                          <div className="pro-image-overlay"><Icons.Eye /></div>
                        </a>
                      )
                    })}
                  </div>
                ) : <div className="pro-empty-box">Không có hình ảnh đính kèm</div>}
              </div>
            </div>
          </div>

          <div className="pro-detail-col">
            <div className="pro-action-sticky-panel">
              <div className="pro-panel">
                <div className="pro-panel-header">
                  <div className="pro-panel-icon primary"><Icons.Tag /></div>
                  <h3 className="pro-panel-title">Quyết Định Thu Mua</h3>
                </div>
                <div className="pro-panel-body">
                  <div className="pro-input-group">
                    <label htmlFor="quotePrice">Mức giá đề xuất (VNĐ)</label>
                    <div className="pro-currency-input">
                      <input 
                        id="quotePrice"
                        type="number" 
                        value={quotePrice}
                        onChange={e => setQuotePrice(e.target.value)}
                        placeholder="VD: 15000000"
                      />
                      <span className="currency-symbol">VND</span>
                    </div>
                  </div>

                  <div className="pro-input-group mt-16">
                    <label htmlFor="adminNote">Ghi chú (Gửi qua Email cho khách)</label>
                    <textarea 
                      id="adminNote"
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      placeholder="Lý do chốt giá hoặc lý do từ chối thu mua..."
                      rows={5}
                      className="pro-textarea"
                    />
                  </div>
                </div>
                <div className="pro-panel-footer">
                  <button className="pro-btn pro-btn-success" onClick={() => updateStatus('quoted')}>
                    Duyệt & Báo giá
                  </button>
                  <button className="pro-btn pro-btn-danger-ghost" onClick={() => updateStatus('rejected')}>
                    Từ chối thu mua
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pro-layout">
      <div className="pro-page-heading">
        <div>
          <h1 className="pro-title">Thu Cũ Đổi Mới</h1>
          <p className="pro-subtitle">Quản lý định giá và kiểm định thiết bị thương mại điện tử.</p>
        </div>
        <div className="pro-heading-actions">
           {activeTab === 'conditions' && (
             <button className="pro-btn pro-btn-primary" onClick={() => {
                setEditingCond(null);
                setCondForm({ category_id: '', name: '', description: '' });
                setBulkPasteText('');
                setCondModalOpen(true);
             }}>
                <Icons.Plus /> Thêm Tiêu Chí
             </button>
           )}
        </div>
      </div>

      <div className="pro-segment-control">
        <button className={`segment-item ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>Yêu cầu định giá</button>
        <button className={`segment-item ${activeTab === 'conditions' ? 'active' : ''}`} onClick={() => setActiveTab('conditions')}>Tiêu chuẩn kiểm định</button>
      </div>

      <div className="pro-main-card">
        {activeTab === 'requests' && (
            <>
                <div className="pro-toolbar">
                    <div className="pro-search-box">
                        <Icons.Search />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm mã đơn, SĐT hoặc tên thiết bị..." 
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                        />
                    </div>
                    <div className="pro-filter-box">
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                          <option value="">Tất cả trạng thái</option>
                          <option value="pending">Chờ định giá</option>
                          <option value="quoted">Đã báo giá</option>
                          <option value="approved">Khách đồng ý</option>
                          <option value="rejected">Từ chối</option>
                          <option value="completed">Đã thu mua</option>
                        </select>
                    </div>
                </div>
                
                <div className="pro-table-wrapper">
                  {loading ? <div className="pro-loader"><div className="spinner"></div> Đang tải dữ liệu...</div> : (
                  <table className="pro-table">
                      <thead>
                      <tr>
                          <th style={{width: '120px'}}>Mã Đơn</th>
                          <th style={{width: '20%'}}>Khách Hàng</th>
                          <th style={{width: '28%'}}>Thiết Bị</th>
                          <th>Ngày Yêu Cầu</th>
                          <th>Định Giá</th>
                          <th>Trạng Thái</th>
                          <th className="align-right">Thao Tác</th>
                      </tr>
                      </thead>
                      <tbody>
                      {filteredRequests.map(req => (
                          <tr key={req.id}>
                            <td><span className="pro-code-id">#{req.request_code}</span></td>
                            <td>
                                <div className="pro-td-primary">{req.customer_name}</div>
                                <div className="pro-td-secondary">{req.customer_phone}</div>
                            </td>
                            <td>
                              <div className="pro-td-primary clamp-1">{req.category?.name}</div>
                              <div className="pro-td-secondary clamp-1">{req.machine_info}</div>
                            </td>
                            <td><span className="pro-td-text">{new Date(req.created_at).toLocaleDateString('vi-VN')}</span></td>
                            <td>
                              <span className={`pro-price-text ${!req.estimated_price ? 'empty' : ''}`}>
                                {req.estimated_price ? formatCurrency(req.estimated_price) : 'Chưa định giá'}
                              </span>
                            </td>
                            <td>{renderStatusBadge(req.status)}</td>
                            <td className="align-right">
                                <button className="pro-action-icon" onClick={() => handleOpenModal(req)} title="Chi tiết định giá">
                                  <span>Xử lý</span> <Icons.ArrowLeft />
                                </button>
                            </td>
                          </tr>
                      ))}
                      {filteredRequests.length === 0 && <tr><td colSpan={7} className="pro-empty-state">Không có dữ liệu yêu cầu nào.</td></tr>}
                      </tbody>
                  </table>
                  )}
                </div>
            </>
        )}

        {activeTab === 'conditions' && (
            <>
                <div className="pro-toolbar">
                    <div className="pro-filter-box" style={{maxWidth: '300px', marginLeft: 'auto'}}>
                        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                            <option value="">Lọc theo tất cả danh mục</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="pro-table-wrapper">
                  {loading ? <div className="pro-loader"><div className="spinner"></div> Đang tải dữ liệu...</div> : (
                  <table className="pro-table">
                      <thead>
                      <tr>
                          <th style={{width: '80px'}}>ID</th>
                          <th style={{width: '15%'}}>Danh Mục</th>
                          <th style={{width: '25%'}}>Tên Tình Trạng / Lỗi</th>
                          <th>Mô Tả Tiêu Chuẩn</th>
                          <th className="align-right">Thao Tác</th>
                      </tr>
                      </thead>
                      <tbody>
                      {filteredConditions.map(cond => (
                          <tr key={cond.id}>
                            <td className="pro-td-secondary">#{cond.id}</td>
                            <td><span className="pro-tag">{cond.category?.name}</span></td>
                            <td><div className="pro-td-primary">{cond.name}</div></td>
                            <td><div className="pro-td-secondary clamp-2">{cond.description}</div></td>
                            <td className="align-right">
                                <div className="pro-actions-group">
                                  <button className="pro-btn-icon" onClick={() => {
                                      setEditingCond(cond);
                                      setCondForm({ category_id: cond.category_id.toString(), name: cond.name, description: cond.description });
                                      setCondModalOpen(true);
                                  }}><Icons.Edit /></button>
                                  <button className="pro-btn-icon danger" onClick={() => setDeleteConfirmId(cond.id)}><Icons.Trash /></button>
                                </div>
                            </td>
                          </tr>
                      ))}
                      {filteredConditions.length === 0 && <tr><td colSpan={5} className="pro-empty-state">Hệ thống chưa có tiêu chuẩn kiểm định nào.</td></tr>}
                        </tbody>
                  </table>
                  )}
                </div>
            </>
        )}  
      </div>

      {condModalOpen && (
        <div className="pro-modal-backdrop">
          <div className="pro-modal-dialog">
            <div className="pro-modal-header">
              <h2>{editingCond ? 'Chỉnh Sửa Tiêu Chí' : 'Khởi Tạo Tiêu Chí Định Giá'}</h2>
              <button className="pro-close-btn" onClick={() => setCondModalOpen(false)}>×</button>
            </div>
            <div className="pro-modal-body">
              <form onSubmit={handleSaveCondition}>
                <div className="pro-input-group">
                  <label>Danh mục áp dụng <span className="req">*</span></label>
                  <select required value={condForm.category_id} onChange={e => setCondForm({...condForm, category_id: e.target.value})}>
                    <option value="">-- Lựa chọn danh mục --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                
                {editingCond ? (
                    <>
                        <div className="pro-input-group mt-20"> 
                          <label>Tên Lỗi / Tình Trạng <span className="req">*</span></label>
                          <input type="text" required value={condForm.name} onChange={e => setCondForm({...condForm, name: e.target.value})} placeholder="VD: Màn hình ám vàng nhẹ"/>
                        </div>
                        <div className="pro-input-group mt-20">
                          <label>Mô tả chi tiết (Tùy chọn)</label>
                          <textarea value={condForm.description} onChange={e => setCondForm({...condForm, description: e.target.value})} rows={3} placeholder="Mô tả kỹ thuật để nhân viên dễ đối chiếu..."/>
                        </div>
                    </>
                ) : (
                    <div className="pro-input-group mt-20">
                        <label>Nhập Liệu Hàng Loạt (Bulk Data) <span className="req">*</span></label>
                        <textarea 
                            required
                            value={bulkPasteText} 
                            onChange={e => setBulkPasteText(e.target.value)}
                            className="code-font"
                            rows={6}
                            placeholder="Màn hình xước dăm | Xước nhẹ dưới 1cm...&#10;Pin chai | Dung lượng tối đa dưới 80%..."
                        />
                        <div className="pro-help-text">Định dạng: <code>Tên tiêu chí | Mô tả chi tiết</code> (Mỗi tiêu chí 1 dòng).</div>
                    </div>
                )}
                <div className="pro-modal-actions mt-32">
                  <button type="button" className="pro-btn pro-btn-default" onClick={() => setCondModalOpen(false)}>Hủy Bỏ</button>
                  <button type="submit" className="pro-btn pro-btn-primary">{editingCond ? 'Lưu Thay Đổi' : 'Tạo Tiêu Chí'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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