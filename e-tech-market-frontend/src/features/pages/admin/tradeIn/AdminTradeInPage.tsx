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
        toast.showToast({ type: 'success', message: 'Cập nhật trạng thái thành công, email đã được gửi đi!' });
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
          const data = await apiFetch<any>(url, {
            method: 'PUT',
            body: JSON.stringify(condForm)
          });
          
          if (data.status === 'success') {
            toast.showToast({ type: 'success', message: 'Cập nhật tình trạng thành công' });
            setCondModalOpen(false);
            fetchConditions();
          }
      } else {
          if (!bulkPasteText.trim()) {
              toast.showToast({ type: 'error', message: 'Vui lòng nhập dữ liệu' });
              return;
          }
          const lines = bulkPasteText.split('\n').filter(line => line.trim() !== '');
          let successCount = 0;
          for (const line of lines) {
             const parts = line.split('|');
             const name = parts[0]?.trim();
             const desc = parts[1]?.trim() || '';
             if (name) {
                 await apiFetch<any>(`/admin/trade-in/conditions`, {
                    method: 'POST',
                    body: JSON.stringify({
                       category_id: condForm.category_id,
                       name: name,
                       description: desc
                    })
                 });
                 successCount++;
             }
          }
          toast.showToast({ type: 'success', message: `Đã thêm thành công ${successCount} tiêu chí` });
          setCondModalOpen(false);
          fetchConditions();
      }
    } catch (error) {
      toast.showToast({ type: 'error', message: 'Lỗi khi lưu' });
    }
  };

  const handleDeleteCondition = async (id: number) => {
    try {
      await apiFetch(`/admin/trade-in/conditions/${id}`, {
        method: 'DELETE'
      });
      toast.showToast({ type: 'success', message: 'Xóa thành công' });
      fetchConditions();
      setDeleteConfirmId(null);
    } catch (error) {
      toast.showToast({ type: 'error', message: 'Lỗi khi xóa' });
    }
  };


  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending': return <span className="ti-badge pending">Chờ xử lý</span>;
      case 'quoted': return <span className="ti-badge quoted">Đã báo giá</span>;
      case 'approved': return <span className="ti-badge approved">Đã duyệt</span>;
      case 'rejected': return <span className="ti-badge rejected">Từ chối</span>;
      case 'completed': return <span className="ti-badge completed">Hoàn tất</span>;
      default: return <span>{status}</span>;
    }
  };

  const filteredConditions = filterCategory 
    ? conditions.filter(c => c.category_id.toString() === filterCategory)
    : conditions;

  const filteredRequests = requests.filter(req => {
    if (!searchKeyword) return true;
    const kw = searchKeyword.toLowerCase();
    const searchStr = `${req.request_code} ${req.customer_name} ${req.customer_phone} ${req.machine_info}`.toLowerCase();
    return searchStr.includes(kw);
  });

  if (viewMode === 'detail' && selectedRequest) {
    return (
      <div className="admin-page-content ti-detail-page-content">
        <div className="admin-page-header ti-detail-header">
          <button className="btn-secondary ti-back-btn" onClick={() => setViewMode('list')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Quay lại
          </button>
          <h2 className="ti-detail-title">Chi tiết yêu cầu: <span className="ti-highlight-text">{selectedRequest.request_code}</span></h2>
        </div>
        
        <div className="ti-detail-body">
          <div className="ti-detail-grid ti-detail-grid no-margin">
            <div>
              <h4>Thông tin khách hàng</h4>
              <p><strong>Tên:</strong> {selectedRequest.customer_name}</p>
              <p><strong>SĐT:</strong> {selectedRequest.customer_phone}</p>
              <p><strong>Email:</strong> {selectedRequest.customer_email}</p>
              <p><strong>Trạng thái:</strong> {getStatusBadge(selectedRequest.status)}</p>
            </div>
            <div>
              <h4>Thông tin máy & Tình trạng lỗi</h4>
              <p><strong>Loại thiết bị:</strong> {selectedRequest.category?.name}</p>
              <div><strong>Cấu hình chi tiết:</strong></div>
              <div className="ti-info-text">{selectedRequest.machine_info}</div>
              
              <div className="ti-section-label"><strong>Tình trạng lỗi do khách báo:</strong></div>
              {selectedRequest.conditions && selectedRequest.conditions.length > 0 ? (
                <div className="ti-condition-tags">
                  {selectedRequest.conditions.map(c => (
                    <span key={c.id} className="ti-condition-tag">{c.name}</span>
                  ))}
                </div>
              ) : (
                <div className="ti-empty-text">Không có lỗi (Máy bình thường)</div>
              )}
            </div>
          </div>

          <div className="ti-image-section">
            <h4 className="ti-section-title">Hình ảnh khách hàng gửi</h4>
            <div className="ti-image-gallery">
              {selectedRequest.images && selectedRequest.images.length > 0 ? (
                selectedRequest.images.map((img, i) => {
                  const imgUrl = (img.startsWith('http') || img.startsWith('/storage')) ? img : `/storage/${img}`;
                  return (
                      <a href={(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '') + imgUrl} target="_blank" rel="noreferrer" key={i}>
                        <img src={(import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '') + imgUrl} alt={`Ảnh ${i+1}`} className="ti-gallery-img ti-gallery-img zoomable" />
                      </a>
                  )
                })
              ) : <p className="ti-empty-text">Không có hình ảnh</p>}
            </div>
          </div>

          <div className="ti-admin-form ti-admin-form shadowed">
            <h4 className="ti-section-title">Xử lý yêu cầu (Báo giá / Từ chối)</h4>
            <div className="form-group form-group spaced">
              <label>Giá thu mua đề xuất (VNĐ)</label>
              <input 
                type="number" 
                value={quotePrice}
                onChange={e => setQuotePrice(e.target.value)}
                placeholder="Nhập giá thu mua nếu muốn duyệt báo giá"
                className="ti-input-control"
              />
            </div>
            <div className="form-group form-group spaced">
              <label>Ghi chú cho khách hàng (Lý do từ chối hoặc tình trạng thực tế)</label>
              <textarea 
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="Khách sẽ đọc được nội dung này trong Email..."
                className="ti-textarea-control"
                rows={4}
              />
            </div>
            <div className="ti-form-actions">
              <button className="btn-success ti-action-btn" onClick={() => updateStatus('quoted')}>Phê duyệt & Gửi Báo Giá</button>
              <button className="btn-danger ti-action-btn" onClick={() => updateStatus('rejected')}>Từ chối</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page-content">
      <div className="admin-page-header">
        <h2>Quản lý Thu cũ đổi mới</h2>
      </div>

      <div className="ti-admin-tabs">
        <button className={`ti-tab-btn ${activeTab === 'requests' ? 'active' : ''}`} onClick={() => setActiveTab('requests')}>Yêu cầu định giá</button>
        <button className={`ti-tab-btn ${activeTab === 'conditions' ? 'active' : ''}`} onClick={() => setActiveTab('conditions')}>Tiêu chí tình trạng</button>
      </div>

      <div className="admin-card">
        {activeTab === 'requests' && (
            <>
                <div className="ti-toolbar">
                    <div className="ti-toolbar-left">
                        <div className="ti-search-box">
                            <span className="ti-search-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </span>
                            <input 
                                type="text" 
                                className="ti-search-input" 
                                placeholder="Tìm kiếm mã, tên khách, SĐT, thông tin máy..." 
                                value={searchKeyword}
                                onChange={(e) => setSearchKeyword(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="ti-toolbar-right">
                        <select 
                            className="ti-filter-select" 
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                        <option value="">Tất cả trạng thái</option>
                        <option value="pending">Chờ xử lý</option>
                        <option value="quoted">Đã báo giá</option>
                        <option value="approved">Đã duyệt</option>
                        <option value="rejected">Từ chối</option>
                        <option value="completed">Hoàn tất</option>
                        </select>
                    </div>
                </div>
                {loading ? <p>Đang tải...</p> : (
                <table className="admin-table">
                    <thead>
                    <tr>
                        <th>Mã Yêu Cầu</th>
                        <th>Khách Hàng</th>
                        <th>Thông tin máy</th>
                        <th>Ngày tạo</th>
                        <th>Giá báo</th>
                        <th>Trạng thái</th>
                        <th>Hành động</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredRequests.map(req => (
                        <tr key={req.id}>
                        <td>{req.request_code}</td>
                        <td>
                            <div>{req.customer_name}</div>
                            <div style={{fontSize:'0.85rem', color:'#666'}}>{req.customer_phone}</div>
                        </td>
                        <td>
                          <div style={{ whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: '1.4', maxHeight: '80px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {req.machine_info}
                          </div>
                        </td>
                        <td>{new Date(req.created_at).toLocaleDateString('vi-VN')}</td>
                        <td>{formatCurrency(req.estimated_price || 0)}</td>
                        <td>{getStatusBadge(req.status)}</td>
                        <td>
                            <button className="ti-action-btn btn-secondary btn-sm" onClick={() => handleOpenModal(req)}><EyeIcon /></button>
                        </td>
                        </tr>
                    ))}
                    {filteredRequests.length === 0 && <tr><td colSpan={7} style={{textAlign:'center'}}>Không tìm thấy yêu cầu nào phù hợp</td></tr>}
                    </tbody>
                </table>
                )}
            </>
        )}

        {activeTab === 'conditions' && (
            <>
                <div className="ti-toolbar">
                    <div className="ti-toolbar-left">
                        <button className="ti-action-btn btn-primary" onClick={() => {
                            setEditingCond(null);
                            setCondForm({ category_id: '', name: '', description: '' });
                            setBulkPasteText('');
                            setCondModalOpen(true);
                        }}>+ Thêm tiêu chí</button>
                    </div>
                    <div className="ti-toolbar-right">
                        <select 
                            className="ti-filter-select" 
                            style={{ minWidth: '200px' }}
                            value={filterCategory}
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            <option value="">Tất cả danh mục</option>
                            {categories.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                {loading ? <p>Đang tải...</p> : (
                <table className="admin-table">
                    <thead>
                    <tr>
                        <th>ID</th>
                        <th>Danh mục</th>
                        <th>Tên lỗi / Tình trạng</th>
                        <th>Mô tả</th>
                        <th>Hành động</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredConditions.map(cond => (
                        <tr key={cond.id}>
                        <td>{cond.id}</td>
                        <td>{cond.category?.name}</td>
                        <td>{cond.name}</td>
                        <td>{cond.description}</td>
                        <td>
                            <button className="ti-action-btn btn-secondary btn-sm" style={{marginRight:'5px'}} onClick={() => {
                                setEditingCond(cond);
                                setCondForm({ category_id: cond.category_id.toString(), name: cond.name, description: cond.description });
                                setCondModalOpen(true);
                            }}>Sửa</button>
                            <button className="ti-action-btn btn-danger btn-sm" onClick={() => setDeleteConfirmId(cond.id)}>Xóa</button>
                        </td>
                        </tr>
                    ))}
                    {filteredConditions.length === 0 && <tr><td colSpan={5} style={{textAlign:'center'}}>Chưa có tiêu chí nào</td></tr>}
                      </tbody>
                </table>
                )}
            </>
        )}  
      </div>

      {condModalOpen && (
        <div className="admin-modal">
          <div className="admin-modal-content" style={{maxWidth: '500px', width: '90%'}}>
            <div className="admin-modal-header">
              <h3>{editingCond ? 'Sửa tiêu chí' : 'Thêm tiêu chí tình trạng'}</h3>
              <button className="close-btn" onClick={() => setCondModalOpen(false)}>×</button>
            </div>
            <div className="admin-modal-body">
              <form onSubmit={handleSaveCondition}>
                <div className="form-group form-group spaced" style={{paddingBottom:'14px'}}>
                  <label>Danh mục</label>
                  <select 
                    required 
                    value={condForm.category_id} 
                    onChange={e => setCondForm({...condForm, category_id: e.target.value})}
                    className="ti-input-control"
                    style={{marginTop:'6px'}}
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                {editingCond ? (
                    <>
                        <div className="form-group form-group spaced" style={{paddingBottom:'14px'}}> 
                        <label>Tên tình trạng / Lỗi</label>
                        <input 
                            type="text" 
                            required 
                            value={condForm.name} 
                            onChange={e => setCondForm({...condForm, name: e.target.value})}
                            className="ti-input-control" style={{marginTop:'6px'}}
                        />
                        </div>
                        <div className="form-group form-group spaced" style={{paddingBottom:'14px'}}>
                        <label>Mô tả chi tiết</label>
                        <textarea 
                            value={condForm.description} 
                            onChange={e => setCondForm({...condForm, description: e.target.value})}
                            className="ti-textarea-control"
                            rows={3} style={{marginTop:'6px'}}
                        />
                        </div>
                    </>
                ) : (
                    <div className="form-group form-group spaced">
                        <label>Dán nhanh (Định dạng: Tên lỗi | Mô tả chi tiết)</label>
                        <textarea 
                            required
                            value={bulkPasteText} 
                            onChange={e => setBulkPasteText(e.target.value)}
                            className="ti-textarea-control"
                            style={{marginTop:'6px'}}
                            rows={6}
                            placeholder="Ngoại hình đẹp 99% | Không cấn móp, ít trầy xước...&#10;Pin chai | Pin bảo trì hoặc dưới 80%..."
                        />
                        <p style={{fontSize: '0.85rem', color: '#64748b', marginTop: '8px'}}>Mỗi tiêu chí trên một dòng, cách nhau bởi dấu gạch đứng ( <strong>|</strong> )</p>
                    </div>
                )}

                <div className="ti-form-actions">
                  <button type="submit" className="ti-action-btn btn-primary">Lưu lại</button>
                  <button type="button" className="ti-action-btn btn-secondary" onClick={() => setCondModalOpen(false)}>Hủy</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteConfirmId !== null}
        title="Xác nhận xóa tiêu chí"
        message={
          <div style={{ display: 'grid', gap: 12 }}>
            <p>Bạn có chắc chắn muốn xóa tiêu chí này không?</p>
            <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              Hành động này không thể hoàn tác.
            </div>
          </div>
        }
        onConfirm={() => {
          if (deleteConfirmId !== null) {
            handleDeleteCondition(deleteConfirmId);
          }
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};

export default AdminTradeInPage;
function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}