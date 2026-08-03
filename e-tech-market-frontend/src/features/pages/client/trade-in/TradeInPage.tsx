import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobalToast } from '@/components/GlobalToastProvider';
import { API_BASE_URL } from '@/configs/api.config';
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

  useEffect(() => {
    fetchCategories();
  }, []);

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
            'Accept': 'application/json'
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

  return (
    <div className="ti-container">
      <div className="ti-hero">
        <h1 className="ti-title">Thu Cũ <span>Đổi Mới</span> – Lên Đời Trợ Giá</h1>
        <p className="ti-subtitle">Định giá máy cũ nhanh chóng, trợ giá lên tới 2 triệu đồng khi lên đời máy mới tại E-Tech Market.</p>
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
            <div className="ti-column">
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
                                          <label>Dung lượng lưu trữ</label>
                                          <input type="text" placeholder="VD: 256GB..." value={phoneStorage} onChange={e => setPhoneStorage(e.target.value)} />
                                      </div>
                                      <div className="ti-form-group">
                                          <label>Màu sắc</label>
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
                                  <label>Tải ảnh máy lên (khuyến khích) <span style={{fontSize:'0.8rem', color:'#64748b', fontWeight:'normal'}}>* Tối đa 5 ảnh</span></label>
                                  <div className="ti-upload-box">
                                      <input type="file" multiple accept="image/*" onChange={handleImageChange} disabled={images.length >= 5} />
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
                              disabled={!machineName}
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
            <div className={`ti-column ${step < 2 ? 'ti-disabled-column' : ''}`}>
              <div className="ti-col-header">
                <div className="ti-col-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <div>
                  <h3>Tình trạng máy</h3>
                  <p className="ti-col-desc">Vui lòng chọn tình trạng hiện tại của máy</p>
                </div>
              </div>

              <div className="ti-cond-list">
                  {conditions.map(c => (
                      <div 
                          key={c.id} 
                          className={`ti-cond-item ${selectedConditions.includes(c.id) ? 'selected' : ''}`}
                          onClick={() => toggleCondition(c.id)}
                      >
                          <div className="ti-checkbox">
                              {selectedConditions.includes(c.id) && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                          </div>
                          <div className="ti-cond-text">
                              <h4>{c.name}</h4>
                              {c.description && <p>{c.description}</p>}
                          </div>
                      </div>
                  ))}
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
                  disabled={step < 2}
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
            <div className={`ti-column ${step < 3 ? 'ti-disabled-column' : ''}`}>
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
                <button type="submit" className="ti-submit-btn ti-btn-submit-final" disabled={isSubmitting || !selectedCategoryId || !machineName || step < 3}>
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

      <div className="ti-features">
        <div className="ti-feature">
          <div className="ti-feature-icon ti-feature-icon-orange"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg></div>
          <div className="ti-feature-text">
            <h4>Định giá nhanh chóng</h4>
            <p>Hệ thống tự động phân tích và báo giá máy chính xác chỉ trong 30 giây.</p>
          </div>
        </div>
        <div className="ti-feature">
          <div className="ti-feature-icon ti-feature-icon-orange"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg></div>
          <div className="ti-feature-text">
            <h4>Bảo mật thông tin</h4>
            <p>Cam kết xóa sạch hoàn toàn dữ liệu cá nhân, đảm bảo an toàn tuyệt đối</p>
          </div>
        </div>
        <div className="ti-feature">
          <div className="ti-feature-icon ti-feature-icon-orange"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg></div>
          <div className="ti-feature-text">
            <h4>Trợ giá hấp dẫn</h4>
            <p>Nhận ngay mức trợ giá hấp dẫn lên tới 2.000.000đ khi tham gia thu đổi máy.</p>
          </div>
        </div>
        <div className="ti-feature">
          <div className="ti-feature-icon ti-feature-icon-orange"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path></svg></div>
          <div className="ti-feature-text">
            <h4>Thu cũ đổi mới</h4>
            <p>Quy trình thu đổi nhanh gọn, giúp khách hàng lên đời thiết bị mới dễ dàng.</p>
          </div>
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
