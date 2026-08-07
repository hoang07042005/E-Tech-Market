import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalToast } from '@/components/GlobalToastProvider';
import { API_BASE_URL, getAuthToken } from '@/configs/api.config';
import { useAuthStore } from '@/features/store/useAuthStore';
import '@/styles/pages/TradeInPage.css';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface TradeInCondition {
  id: number;
  name: string;
  description: string;
  category_id: number;
}

const TradeInPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [conditions, setConditions] = useState<TradeInCondition[]>([]);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [machineName, setMachineName] = useState('');
  
  // Điện thoại
  const [phoneStorage, setPhoneStorage] = useState('');
  const [phoneColor, setPhoneColor] = useState('');
  
  // Laptop
  const [laptopRam, setLaptopRam] = useState('');
  const [laptopDisk, setLaptopDisk] = useState('');
  const [laptopVga, setLaptopVga] = useState('');
  
  // Chung
  const [machineWarranty, setMachineWarranty] = useState('');
  const [machineAccessories, setMachineAccessories] = useState('');
  
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  
  const [selectedConditions, setSelectedConditions] = useState<number[]>([]);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const toast = useGlobalToast();
  const navigate = useNavigate();
  const userStr = useAuthStore((state) => state.userStr);

  useEffect(() => {
    fetchCategories();
  }, []);

  // Auto-fill contact info from logged-in user when entering step 3
  useEffect(() => {
    if (step === 3 && userStr) {
      try {
        const userData = JSON.parse(userStr);
        if (!customerName && userData.name) setCustomerName(userData.name);
        if (!customerPhone && userData.phone) setCustomerPhone(userData.phone);
        if (!customerEmail && userData.email) setCustomerEmail(userData.email);
      } catch(e) {
        // ignore parse errors
      }
    }
  }, [step]);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/trade-in/categories`);
      const data = await res.json();
      if (data.status === 'success') {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch categories', error);
    }
  };

  const fetchConditions = async (categoryId: number) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/trade-in/conditions?category_id=${categoryId}`);
      const data = await res.json();
      if (data.status === 'success') {
        setConditions(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch conditions', error);
    }
  };

  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    setSelectedConditions([]); // reset conditions
    fetchConditions(categoryId);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const totalImages = images.length + selectedFiles.length;
      
      if (totalImages > 6) {
        toast.showToast({ type: 'error', message: 'Bạn chỉ được tải lên tối đa 6 ảnh.' });
        return;
      }
      
      const newImages = [...images, ...selectedFiles];
      setImages(newImages);
      
      // Tạo preview URLs
      const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
        const newUrls = [...prev];
        URL.revokeObjectURL(newUrls[index]);
        newUrls.splice(index, 1);
        return newUrls;
    });
  };

  const submitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId || !machineName || images.length === 0 || !customerName || !customerPhone || !customerEmail) {
        toast.showToast({ type: 'error', message: 'Vui lòng điền đầy đủ thông tin bắt buộc và tải ảnh lên' });
        return;
    }
    
    setIsSubmitting(true);
    
    try {
      const cat = categories.find(c => c.id === selectedCategoryId);
      let finalMachineInfo = '';
      
      if (cat?.slug === 'dien-thoai') {
          finalMachineInfo = `Tên máy: ${machineName}\nDung lượng: ${phoneStorage || 'Không rõ'}\nMàu sắc: ${phoneColor || 'Không rõ'}\nTình trạng bảo hành: ${machineWarranty || 'Không rõ'}\nPhụ kiện đi kèm: ${machineAccessories || 'Không rõ'}`;
      } else if (cat?.slug === 'laptop') {
          finalMachineInfo = `Tên máy: ${machineName}\nRAM: ${laptopRam || 'Không rõ'}\nỔ cứng: ${laptopDisk || 'Không rõ'}\nVGA: ${laptopVga || 'Không rõ'}\nTình trạng bảo hành: ${machineWarranty || 'Không rõ'}\nPhụ kiện đi kèm: ${machineAccessories || 'Không rõ'}`;
      } else {
          finalMachineInfo = `Tên máy: ${machineName}\nTình trạng bảo hành: ${machineWarranty || 'Không rõ'}\nPhụ kiện đi kèm: ${machineAccessories || 'Không rõ'}`;
      }
        
      const formData = new FormData();
      formData.append('category_id', selectedCategoryId.toString());
      formData.append('machine_info', finalMachineInfo);
      formData.append('customer_name', customerName);
      formData.append('customer_phone', customerPhone);
      formData.append('customer_email', customerEmail);
      formData.append('condition_ids', JSON.stringify(selectedConditions));
      
      images.forEach((img) => {
        formData.append('images[]', img);
      });

      const res = await fetch(`${API_BASE_URL}/api/v1/trade-in/requests`, {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json',
            ...(getAuthToken() ? { 'Authorization': `Bearer ${getAuthToken()}` } : {})
        }
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.showToast({ type: 'success', message: 'Yêu cầu định giá đã gửi thành công! Admin sẽ gửi email báo giá cho bạn.' });
        navigate('/');
      } else {
        toast.showToast({ type: 'error', message: data.message || 'Có lỗi xảy ra' });
      }
    } catch (error) {
      toast.showToast({ type: 'error', message: 'Có lỗi xảy ra khi gửi yêu cầu' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCondition = (id: number) => {
    setSelectedConditions(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const isStep1Valid = () => {
    if (!selectedCategoryId || !machineName.trim() || images.length === 0) return false;
    
    const selectedCat = categories.find(c => c.id === selectedCategoryId);
    if (selectedCat?.slug === 'dien-thoai') {
        if (!phoneStorage.trim() || !phoneColor.trim()) return false;
    }
    if (selectedCat?.slug === 'laptop') {
        if (!laptopRam.trim() || !laptopDisk.trim()) return false;
    }
    return true;
  };

  return (
    <div className="ti-container">
      <div className="ti-hero">
        <h1 className="ti-title">Thu Cũ <span>Giá Cao</span> – Định Giá Nhanh Chóng</h1>
        <p className="ti-subtitle">Định giá máy cũ chính xác, quy trình thu mua nhanh chóng và giải ngân ngay tại E-Tech Market.</p>
      </div>
      
      <div className="ti-steps-header">
        <div className="ti-step-header">
          <div className={`ti-step-num ${step >= 1 ? 'active' : ''}`}>1</div>
          <div className="ti-step-text">
            <h4 className={step >= 1 ? 'active' : ''}>Thông tin máy</h4>
            <p>Chọn và nhập thông tin thiết bị</p>
          </div>
        </div>
        <div className="ti-step-header">
          <div className={`ti-step-num ${step >= 2 ? 'active' : ''}`}>2</div>
          <div className="ti-step-text">
            <h4 className={step >= 2 ? 'active' : ''}>Tình trạng máy</h4>
            <p>Chọn tình trạng hiện tại</p>
          </div>
        </div>
        <div className="ti-step-header">
          <div className={`ti-step-num ${step >= 3 ? 'active' : ''}`}>3</div>
          <div className="ti-step-text">
            <h4 className={step >= 3 ? 'active' : ''}>Thông tin liên hệ</h4>
            <p>Nhận kết quả định giá</p>
          </div>
        </div>
      </div>

      <form onSubmit={submitRequest}>
          <div className="ti-content-grid">
            
            {/* Column 1: Info */}
            <div className={`ti-column ${step === 1 ? 'ti-mobile-active' : 'ti-mobile-hidden'}`}>
              <div className="ti-col-header">
                <div className="ti-col-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
                </div>
                <h3>Chọn loại thiết bị</h3>
              </div>

              <div className="ti-device-grid">
                {categories.map(c => (
                  <div 
                    key={c.id} 
                    className={`ti-device-card ${selectedCategoryId === c.id ? 'selected' : ''}`}
                    onClick={() => handleCategorySelect(c.id)}
                  >
                    <div className="ti-device-icon">
                        {c.slug === 'laptop' ? <LaptopIcon /> : <PhoneIcon />}
                    </div>
                    <h4>{c.name}</h4>
                  </div>
                ))}
              </div>

              {selectedCategoryId && (() => {
                  const selectedCat = categories.find(c => c.id === selectedCategoryId);
                  const isPhone = selectedCat?.slug === 'dien-thoai';
                  const isLaptop = selectedCat?.slug === 'laptop';

                  return (
                      <>
                          <h4 className="ti-detail-title">Thông tin chi tiết thiết bị</h4>
                          <div className="ti-form-grid">
                              <div className="ti-form-group">
                                  <label>Tên máy <span>*</span></label>
                                  <input 
                                      type="text" 
                                      placeholder={isPhone ? 'VD: iPhone 13 Pro Max...' : 'VD: MacBook Air M2 2022'}
                                      value={machineName}
                                      onChange={e => setMachineName(e.target.value)}
                                  />
                              </div>
                              
                              {isPhone && (
                                  <>
                                      <div className="ti-form-group">
                                          <label>Dung lượng lưu trữ <span>*</span></label>
                                          <input type="text" placeholder="VD: 256GB..." value={phoneStorage} onChange={e => setPhoneStorage(e.target.value)} />
                                      </div>
                                      <div className="ti-form-group">
                                          <label>Màu sắc <span>*</span></label>
                                          <input type="text" placeholder="VD: Xanh dương..." value={phoneColor} onChange={e => setPhoneColor(e.target.value)} />
                                      </div>
                                  </>
                              )}

                              {isLaptop && (
                                  <>
                                      <div className="ti-form-group">
                                          <label>Dung lượng RAM <span>*</span></label>
                                          <input type="text" placeholder="VD: 8GB, 16GB..." value={laptopRam} onChange={e => setLaptopRam(e.target.value)} />
                                      </div>
                                      <div className="ti-form-group">
                                          <label>Ổ cứng <span>*</span></label>
                                          <input type="text" placeholder="VD: 512GB SSD..." value={laptopDisk} onChange={e => setLaptopDisk(e.target.value)} />
                                      </div>
                                      <div className="ti-form-group">
                                          <label>Card màn hình (nếu có)</label>
                                          <input type="text" placeholder="VD: NVIDIA RTX 3050..." value={laptopVga} onChange={e => setLaptopVga(e.target.value)} />
                                      </div>
                                  </>
                              )}

                              <div className="ti-form-group">
                                  <label>Tình trạng bảo hành</label>
                                  <select value={machineWarranty} onChange={e => setMachineWarranty(e.target.value)}>
                                    <option value="">Chọn tình trạng bảo hành</option>
                                    <option value="Còn bảo hành hãng">Còn bảo hành hãng</option>
                                    <option value="Hết bảo hành">Hết bảo hành</option>
                                  </select>
                              </div>
                              <div className="ti-form-group">
                                  <label>Phụ kiện đi kèm</label>
                                  <input type="text" placeholder="VD: Sạc, cáp, hộp..." value={machineAccessories} onChange={e => setMachineAccessories(e.target.value)} />
                              </div>

                              <div className="ti-form-group full-width">
                                  <label>Tải ảnh máy lên <span>*</span> <span style={{fontSize:'0.8rem', color:'#64748b', fontWeight:'normal'}}> Tối đa 6 ảnh</span></label>
                                  <div className="ti-upload-box">
                                      <input type="file" multiple accept="image/*" onChange={handleImageChange} disabled={images.length >= 6} />
                                      <div className="ti-upload-icon-wrapper">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                      </div>
                                      <p className="ti-upload-text-main">Kéo thả ảnh vào đây hoặc click để chọn</p>
                                      <p className="ti-upload-text-sub">Hỗ trợ: JPG, PNG, WEBP (tối đa 10MB/ảnh)</p>
                                  </div>
                                  
                                  {previewUrls.length > 0 && (
                                      <div className="ti-preview-container">
                                          {previewUrls.map((url, idx) => (
                                              <div key={idx} className="ti-preview-item">
                                                  <img src={url} alt={`preview-${idx}`} className="ti-preview-img" />
                                                  <button onClick={() => removeImage(idx)} className="ti-remove-btn" type="button">✕</button>
                                              </div>
                                          ))}
                                      </div>
                                  )}
                              </div>
                          </div>

                          <div className="ti-btn-wrapper">
                            <button 
                              type="button" 
                              className="ti-submit-btn ti-btn-auto"
                              disabled={!isStep1Valid()}
                              onClick={() => setStep(2)}
                            >
                              Tiếp tục
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ti-btn-icon"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                            </button>
                          </div>
                          <div className="ti-col-footer">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                            Thông tin của bạn được bảo mật tuyệt đối
                          </div>
                      </>
                  );
              })()}
            </div>

            {/* Column 2: Conditions */}
            <div className={`ti-column ${step < 2 ? 'ti-disabled-column' : ''} ${step === 2 ? 'ti-mobile-active' : 'ti-mobile-hidden'}`}>
              <div className="ti-col-header">
                <div className="ti-col-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <div>
                  <h3>Tình trạng máy</h3>
                  <p className="ti-col-desc">Vui lòng chọn tình trạng hiện tại của máy</p>
                </div>
              </div>

              <div className="ti-cond-list-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '550px', overflowY: 'auto'}}>
                  {(() => {
                      if (conditions.length === 0) return null;

                      // 1. Deduplicate by name
                      const seen = new Set<string>();
                      const uniqueConds = conditions.filter(c => {
                          const key = c.name.trim().toLowerCase();
                          if (seen.has(key)) return false;
                          seen.add(key);
                          return true;
                      });

                      // 2. Group by keywords
                      const groups: Record<string, TradeInCondition[]> = {
                          'Ngoại hình': [],
                          'Màn hình & Kính': [],
                          'Pin & Sạc': [],
                          'Camera & Âm thanh': [],
                          'Chức năng & Kết nối': [],
                          'Phần cứng & Sửa chữa': [],
                          'Khác': []
                      };

                      uniqueConds.forEach(c => {
                          const name = c.name.toLowerCase();
                          
                          if (name.includes('màn hình') || name.includes('hiển thị') || name.includes('cảm ứng') || name.includes('ám') || name.includes('sọc') || name.includes('mực') || name.includes('điểm chết') || name.includes('lưu ảnh') || name.includes('chấm sáng') || name.includes('hở sáng') || name.includes('bụi trong màn') || name.includes('true tone') || name.includes('ép kính') || (name.includes('kính') && !name.includes('camera'))) {
                              groups['Màn hình & Kính'].push(c);
                          } else if (name.includes('pin') || name.includes('sạc') || name.includes('cổng')) {
                              groups['Pin & Sạc'].push(c);
                          } else if (name.includes('camera') || name.includes('loa') || name.includes('mic') || name.includes('âm thanh') || name.includes('flash') || name.includes('đốm') || name.includes('chụp')) {
                              groups['Camera & Âm thanh'].push(c);
                          } else if (name.includes('rung') || name.includes('face id') || name.includes('touch id') || name.includes('vân tay') || name.includes('nút') || name.includes('wifi') || name.includes('bluetooth') || name.includes('gps') || name.includes('nfc') || name.includes('esim') || name.includes('sóng') || name.includes('5g') || name.includes('cảm biến') || name.includes('la bàn') || name.includes('gia tốc') || name.includes('con quay') || name.includes('nhận sim')) {
                              groups['Chức năng & Kết nối'].push(c);
                          } else if (name.includes('main') || name.includes('ic') || name.includes('sửa chữa') || name.includes('tháo máy') || name.includes('nước') || name.includes('oxy hóa') || name.includes('nguồn') || name.includes('treo logo') || name.includes('chống nước')) {
                              groups['Phần cứng & Sửa chữa'].push(c);
                          } else if (name.includes('mới') || name.includes('đẹp') || name.includes('khá') || name.includes('trầy') || name.includes('xước') || name.includes('tróc') || name.includes('cấn') || name.includes('móp') || name.includes('cong') || name.includes('vỏ') || name.includes('khung') || name.includes('lưng') || name.includes('logo') || name.includes('ốc') || name.includes('sim')) {
                              groups['Ngoại hình'].push(c);
                          } else {
                              groups['Khác'].push(c);
                          }
                      });

                      return Object.entries(groups).map(([groupName, conds]) => {
                          if (conds.length === 0) return null;
                          return (
                              <div key={groupName} className="ti-cond-group">
                                  <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginBottom: '12px', paddingBottom: '6px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <div style={{ width: 6, height: 16, background: '#6366f1', borderRadius: 4 }}></div>
                                      {groupName}
                                  </h4>
                                  <div className="ti-cond-list">
                                      {conds.map(c => (
                                          <div 
                                              key={c.id} 
                                              className={`ti-cond-item ${selectedConditions.includes(c.id) ? 'selected' : ''}`}
                                              onClick={() => toggleCondition(c.id)}
                                          >
                                              <div className="ti-checkbox">
                                                  {selectedConditions.includes(c.id) && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                              </div>
                                              <div className="ti-cond-text">
                                                  <h4 style={{ margin: 0, fontSize: '13.5px' }}>{c.name}</h4>
                                                  {c.description && <p style={{ margin: '4px 0 0', fontSize: '12px' }}>{c.description}</p>}
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          );
                      });
                  })()}
                  {conditions.length === 0 && (
                      <p className="ti-empty-cond">Vui lòng chọn Loại thiết bị trước.</p>
                  )}
              </div>
              <div className="ti-btn-wrapper" style={{ gap: '10px' }}>
                <button 
                  type="button" 
                  className="ti-btn-secondary ti-btn-auto"
                  onClick={() => setStep(1)}
                  disabled={step < 2}
                >
                  Quay lại
                </button>
                <button 
                  type="button" 
                  className="ti-submit-btn ti-btn-auto"
                  onClick={() => setStep(3)}
                  disabled={step < 2 || selectedConditions.length === 0}
                >
                  Tiếp tục
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ti-btn-icon"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
              <div className="ti-col-footer">
                {step < 2 ? (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Vui lòng hoàn tất bước trước</>
                ) : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                  Thông tin của bạn được bảo mật tuyệt đối</>
                )}
              </div>
            </div>

            {/* Column 3: Contact */}
            <div className={`ti-column ${step < 3 ? 'ti-disabled-column' : ''} ${step === 3 ? 'ti-mobile-active' : 'ti-mobile-hidden'}`}>
              <div className="ti-col-header">
                <div className="ti-col-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div>
                  <h3>Thông tin liên hệ</h3>
                  <p className="ti-col-desc">Nhận kết quả định giá qua email và điện thoại</p>
                </div>
              </div>

              <div className="ti-form-group-profile full-width ti-form-mt">
                  <label>Họ và tên <span>*</span></label>
                  <input type="text" required placeholder="Nhập họ và tên của bạn" value={customerName} onChange={e => setCustomerName(e.target.value)} />
              </div>
              <div className="ti-form-group-profile full-width">
                  <label>Số điện thoại <span>*</span></label>
                  <input type="tel" required placeholder="Nhập số điện thoại liên hệ" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
              </div>
              <div className="ti-form-group-profile full-width">
                  <label>Email <span>*</span></label>
                  <input type="email" required placeholder="Nhập địa chỉ email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} />
              </div>

              <div className="ti-security-box">
                <div className="ti-security-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>
                </div>
                <div className="ti-security-text">
                  <h4>Cam kết bảo mật thông tin</h4>
                  <p>E-Tech Market cam kết bảo mật tuyệt đối thông tin cá nhân của bạn và chỉ sử dụng để liên hệ về kết quả định giá.</p>
                  <ul className="ti-security-list">
                    <li>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ti-check-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      Thông tin của bạn được mã hóa và bảo vệ an toàn
                    </li>
                    <li>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ti-check-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      Không chia sẻ thông tin cho bên thứ ba
                    </li>
                    <li>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ti-check-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      Chỉ liên hệ khi có kết quả định giá
                    </li>
                    <li>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ti-check-icon"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                      Bạn có thể yêu cầu xóa thông tin bất kỳ lúc nào
                    </li>
                  </ul>
                </div>
              </div>

              <div className="ti-btn-wrapper-col3">
                <button type="button" className="ti-btn-secondary ti-btn-back" onClick={() => setStep(2)}>Quay lại</button>
                <button 
                  type="submit" 
                  className="ti-submit-btn ti-btn-submit-final" 
                  disabled={isSubmitting || !isStep1Valid() || step < 3 || !customerName.trim() || !customerPhone.trim() || !customerEmail.trim()}
                >
                    {isSubmitting ? 'Đang gửi...' : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                        Gửi yêu cầu thu cũ
                      </>
                    )}
                </button>
              </div>
              <div className="ti-col-footer">
                {step < 3 ? (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                  Vui lòng hoàn tất bước trước</>
                ) : (
                  <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                  Thông tin của bạn được bảo mật tuyệt đối</>
                )}
              </div>
            </div>

          </div>
      </form>

      {/* SECTION 1: QUY TRÌNH THU CŨ */}
      <div className="ti-redesign-process-section">
        <div className="ti-rp-header">
          <div className="ti-rp-line"></div>
          <h3>QUY TRÌNH THU CŨ TẠI E-TECH MARKET</h3>
          <div className="ti-rp-line"></div>
        </div>

        <div className="ti-rp-steps">
          
          <div className="ti-rp-step theme-orange">
            <div className="ti-rp-badge">01</div>
            <div className="ti-rp-image">
              <img src="/guiTT.png" alt="" />
            </div>
            <h4 className="ti-rp-title">Gửi thông tin</h4>
            <p className="ti-rp-desc">Điền form trực tuyến với các thông tin và hình ảnh thực tế về tình trạng thiết bị của bạn chỉ trong vài phút.</p>
          </div>

          <div className="ti-rp-arrow arrow-orange">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-arrow-right-short" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8"/>
            </svg>
          </div>

          <div className="ti-rp-step theme-yellow">
            <div className="ti-rp-badge">02</div>
            <div className="ti-rp-image">
              <img src="/quanTXTT.png" alt="" />
            </div>
            <h4 className="ti-rp-title">Tiếp nhận dữ liệu</h4>
            <p className="ti-rp-desc">Hệ thống và chuyên viên sẽ ghi nhận yêu cầu, tiến hành kiểm tra tính hợp lệ của các thông tin được cung cấp.</p>
          </div>

          <div className="ti-rp-arrow arrow-yellow">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-arrow-right-short" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8"/>
            </svg>
          </div>

          <div className="ti-rp-step theme-green">
            <div className="ti-rp-badge">03</div>
            <div className="ti-rp-image">
              <img src="/quanTDG&NX.png" alt="" />
            </div>
            <h4 className="ti-rp-title">Định giá chuẩn xác</h4>
            <p className="ti-rp-desc">Thiết bị được đánh giá minh bạch dựa trên tình trạng thực tế để đưa ra mức giá thu mua cạnh tranh nhất.</p>
          </div>

          <div className="ti-rp-arrow arrow-green">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-arrow-right-short" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8"/>
            </svg>
          </div>

          <div className="ti-rp-step theme-blue">
            <div className="ti-rp-badge">04</div>
            <div className="ti-rp-image">
              <img src="/pheTDTC.png" alt="" />
            </div>
            <h4 className="ti-rp-title">Phê duyệt yêu cầu</h4>
            <p className="ti-rp-desc">Đơn yêu cầu được xét duyệt nhanh chóng. Mọi quyết định đồng ý hay từ chối đều đi kèm lý do rõ ràng.</p>
          </div>

          <div className="ti-rp-arrow arrow-blue">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-arrow-right-short" viewBox="0 0 16 16">
              <path fill-rule="evenodd" d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8"/>
            </svg>
          </div>

          <div className="ti-rp-step theme-purple">
            <div className="ti-rp-badge">05</div>
            <div className="ti-rp-image">
              <img src="/guiKQ.png" alt="" />
            </div>
            <h4 className="ti-rp-title">Nhận kết quả qua Email</h4>
            <p className="ti-rp-desc">Nhận ngay thông báo kết quả thẩm định, mức giá chính thức và hướng dẫn các bước tiếp theo qua email của bạn.</p>
          </div>

        </div>
        
        {/* Continuous bottom line */}
        <div className="ti-rp-bottom-line">
          <div className="line-segment ls-orange"></div>
          <div className="line-segment ls-yellow"></div>
          <div className="line-segment ls-green"></div>
          <div className="line-segment ls-blue"></div>
          <div className="line-segment ls-purple"></div>
        </div>
      </div>

      {/* SECTION 2: CAM KẾT & LƯU Ý */}
      <div className="ti-redesign-bottom-layout">
        
        {/* Left Column */}
        <div className="ti-rb-commitment">
          <div className="ti-rb-c-header">
             <div className="ti-rb-c-shield">
               <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
             </div>
             <h4>CAM KẾT TỪ E-TECH MARKET</h4>
          </div>
          
          <div className="ti-rb-c-grid">
            <div className="ti-rb-c-item">
              <div className="ti-rb-c-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg></div>
              <div className="ti-rb-c-text">
                <h5>Thông tin bảo mật</h5>
                <p>Bảo mật tuyệt đối thông tin cá nhân và thiết bị của bạn.</p>
              </div>
            </div>
            <div className="ti-rb-c-item">
              <div className="ti-rb-c-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg></div>
              <div className="ti-rb-c-text">
                <h5>Định giá minh bạch</h5>
                <p>Định giá đúng giá trị thật của thiết bị.</p>
              </div>
            </div>
            <div className="ti-rb-c-item">
              <div className="ti-rb-c-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg></div>
              <div className="ti-rb-c-text">
                <h5>Không ép giá</h5>
                <p>Nói không với ép giá, mua bán rõ ràng.</p>
              </div>
            </div>
            <div className="ti-rb-c-item">
              <div className="ti-rb-c-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
              <div className="ti-rb-c-text">
                <h5>Xử lý nhanh chóng</h5>
                <p>Tiếp nhận và phản hồi trong 30 phút.</p>
              </div>
            </div>
            <div className="ti-rb-c-item">
              <div className="ti-rb-c-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5.5"></path><polygon points="8 11 5 15 8 19"></polygon><path d="M8 3v2a4 4 0 0 0 4 4h8.5"></path><polygon points="16 13 19 9 16 5"></polygon></svg></div>
              <div className="ti-rb-c-text">
                <h5>Hỗ trợ tận tâm</h5>
                <p>Đội ngũ tư vấn nhiệt tình, hỗ trợ 24/7.</p>
              </div>
            </div>
            <div className="ti-rb-c-item">
              <div className="ti-rb-c-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18"></path><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path></svg></div>
              <div className="ti-rb-c-text">
                <h5>Thu cũ đổi mới dễ dàng</h5>
                <p>Trợ giá hấp dẫn khi lên đời sản phẩm mới.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="ti-rb-notice">
          <div className="ti-rb-n-header">
             <div className="ti-rb-n-bell">
               <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
             </div>
             <h4>LƯU Ý QUAN TRỌNG</h4>
          </div>
          
          <ul className="ti-rb-n-list">
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span>Thông tin bạn cung cấp càng chi tiết, việc định giá càng chính xác.</span>
            </li>
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span>Thiết bị phải thuộc quyền sở hữu hợp pháp của bạn.</span>
            </li>
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span>Chúng tôi có quyền từ chối thu mua nếu thiết bị không đủ điều kiện.</span>
            </li>
            <li>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              <span>Mọi thông tin của bạn được bảo mật tuyệt đối.</span>
            </li>
          </ul>
        </div>

      </div>
      
    </div>
  );
};

export default TradeInPage;


function PhoneIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" fill="currentColor" className="bi bi-phone" viewBox="0 0 16 16">
  <path d="M11 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
  <path d="M8 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2"/>
</svg>
  );
}

function LaptopIcon() {
  return (
<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" fill="currentColor" className="bi bi-laptop" viewBox="0 0 16 16">
  <path d="M13.5 3a.5.5 0 0 1 .5.5V11H2V3.5a.5.5 0 0 1 .5-.5zm-11-1A1.5 1.5 0 0 0 1 3.5V12h14V3.5A1.5 1.5 0 0 0 13.5 2zM0 12.5h16a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5"/>
</svg>
  );
}
