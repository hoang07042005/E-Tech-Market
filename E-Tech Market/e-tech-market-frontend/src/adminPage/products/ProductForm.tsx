import { useState, useEffect } from 'react'
import { apiFetch, API_BASE_URL } from '../../lib/api'
import '../css_admin/ProductPage.css'

const MAX_PRODUCT_IMAGES = 12

interface Category {
  id: number
  name: string
}

interface Spec {
  id?: number
  product_variant_id?: number | null
  spec_group: string
  spec_key: string
  spec_value: string
  spec_unit: string
  /** Chung: `common` | theo bản ghi: `variant:{id}` | bản mới theo dòng form: `idx:{index}` */
  scope: string
}

interface Variant {
  id?: number
  variant_name: string
  color: string
  configuration: string
  sku: string
  price: string
  stock_quantity: number
  image_url?: string
  imageFile?: File // Local only
  imagePreview?: string // Local only
}

interface ProductFaqForm {
  id?: number
  question: string
  answer: string
  sort_order: number
  is_active: boolean
}

interface ExistingProductImage {
  id?: number
  image_url: string
}

interface AdminProductFaqRow {
  id?: number
  question?: string | null
  answer?: string | null
  sort_order?: number | null
  is_active?: boolean
}

/** Phản hồi GET /api/admin/products/{id} dùng trong form */
interface InventoryMainRow {
  id: number
  product_id?: number
  location_code: string
  quantity_on_hand: number
  reorder_level: number
}

interface AdminProductDetail {
  name: string
  category_id: number
  brand: string | null
  price: string | number
  description: string | null
  rich_html?: string | null
  is_active: boolean
  specs?: Spec[]
  variants?: Variant[]
  images?: ExistingProductImage[]
  faqs?: AdminProductFaqRow[]
  inventory_items?: InventoryMainRow[]
}

interface ProductFormProps {
  productId?: number | null
  onSave: () => void
  onCancel: () => void
}

const resolveImageUrl = (url: string | null) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

function specScopeFromApi(s: { product_variant_id?: number | null }): string {
  const vid = s.product_variant_id
  if (vid != null && vid > 0) return `variant:${vid}`
  return 'common'
}

export default function ProductForm({ productId, onSave, onCancel }: ProductFormProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    brand: '',
    price: '',
    description: '',
    rich_html: '',
    is_active: true
  })

  const [specs, setSpecs] = useState<Spec[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<ExistingProductImage[]>([])

  // Quick Paste State
  const [isSpecPasteOpen, setIsSpecPasteOpen] = useState(false)
  const [specPasteText, setSpecPasteText] = useState('')
  const [isVariantPasteOpen, setIsVariantPasteOpen] = useState(false)
  const [variantPasteText, setVariantPasteText] = useState('')

  const [faqs, setFaqs] = useState<ProductFaqForm[]>([])
  const [isFaqPasteOpen, setIsFaqPasteOpen] = useState(false)
  const [faqPasteText, setFaqPasteText] = useState('')
  const [mainInventoryQty, setMainInventoryQty] = useState<number | null>(null)

  const token = localStorage.getItem('token')

  const variantStockSum = variants.reduce((sum, v) => sum + (Number.isFinite(v.stock_quantity) ? v.stock_quantity : 0), 0)

  useEffect(() => {
    const fetchInitData = async () => {
      setIsLoading(true)
      try {
        const cData = await apiFetch<Category[]>('/api/admin/categories', { token })
        setCategories(cData)

        if (productId) {
          const pData = await apiFetch<AdminProductDetail>(`/api/admin/products/${productId}`, { token })
          setFormData({
            name: pData.name,
            category_id: pData.category_id.toString(),
            brand: pData.brand || '',
            price: pData.price.toString(),
            description: pData.description || '',
            rich_html: pData.rich_html || '',
            is_active: pData.is_active
          })
          setSpecs(
            (pData.specs ?? []).map(row => ({
              ...row,
              scope: specScopeFromApi(row),
            })),
          )
          setVariants(pData.variants ?? [])
          const invMain = pData.inventory_items?.find(i => i.location_code === 'main')
          setMainInventoryQty(typeof invMain?.quantity_on_hand === 'number' ? invMain.quantity_on_hand : null)
          setExistingImages(pData.images ?? [])
          const rawFaqs = pData.faqs
          if (Array.isArray(rawFaqs) && rawFaqs.length > 0) {
            setFaqs(
              rawFaqs.map((f, i): ProductFaqForm => ({
                id: f.id,
                question: String(f.question ?? ''),
                answer: String(f.answer ?? ''),
                sort_order: typeof f.sort_order === 'number' ? f.sort_order : i,
                is_active: f.is_active !== false,
              }))
            )
          } else {
            setFaqs([])
          }
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Không tải được dữ liệu.')
      } finally {
        setIsLoading(false)
      }
    }
    fetchInitData()
  }, [productId, token])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      if (files.length + selectedFiles.length > MAX_PRODUCT_IMAGES) {
        alert(`Tối đa ${MAX_PRODUCT_IMAGES} ảnh cho mỗi sản phẩm.`)
        return
      }
      setSelectedFiles([...selectedFiles, ...files])
      const newPreviews = files.map(file => URL.createObjectURL(file))
      setPreviews([...previews, ...newPreviews])
    }
  }

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles]
    newFiles.splice(index, 1)
    setSelectedFiles(newFiles)
    const newPreviews = [...previews]
    URL.revokeObjectURL(newPreviews[index])
    newPreviews.splice(index, 1)
    setPreviews(newPreviews)
  }

  /** Khi đã đủ ảnh đã lưu: chọn bộ mới thay toàn bộ (sau khi Lưu, backend xóa ảnh cũ). */
  const handleReplaceAllProductImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const files = Array.from(e.target.files).slice(0, MAX_PRODUCT_IMAGES)
    previews.forEach(url => {
      try {
        URL.revokeObjectURL(url)
      } catch {
        /* ignore */
      }
    })
    setSelectedFiles(files)
    setPreviews(files.map(file => URL.createObjectURL(file)))
    e.target.value = ''
  }

  const addSpec = () => {
    setSpecs([
      ...specs,
      { spec_group: '', spec_key: '', spec_value: '', spec_unit: '', scope: 'common' },
    ])
  }

  const updateSpec = (index: number, field: keyof Spec, value: string) => {
    const newSpecs = [...specs]
    newSpecs[index] = { ...newSpecs[index], [field]: value }
    setSpecs(newSpecs)
  }

  const removeSpec = (index: number) => {
    setSpecs(specs.filter((_, i) => i !== index))
  }

  const handleSpecQuickPaste = () => {
    const lines = specPasteText.split('\n').filter(line => line.trim() !== '')
    const newSpecs: Spec[] = lines.map(line => {
      const parts = line.split('|').map(p => p.trim())
      return {
        spec_group: parts[0] || '',
        spec_key: parts[1] || '',
        spec_value: parts[2] || '',
        spec_unit: parts[3] || '',
        scope: 'common',
      }
    })
    setSpecs([...specs, ...newSpecs])
    setSpecPasteText('')
    setIsSpecPasteOpen(false)
  }

  const handleVariantQuickPaste = () => {
    const lines = variantPasteText.split('\n').filter(line => line.trim() !== '')
    const newVariants: Variant[] = lines.map(line => {
      const parts = line.split('|').map(p => p.trim())
      return {
        variant_name: parts[0] || '',
        color: parts[1] || '',
        configuration: parts[2] || '',
        sku: '',
        price: parts[3] || formData.price,
        stock_quantity: parseInt(parts[4] || '0')
      }
    })
    setVariants([...variants, ...newVariants])
    setVariantPasteText('')
    setIsVariantPasteOpen(false)
  }

  const addVariant = () => {
    setVariants([...variants, { variant_name: '', color: '', configuration: '', sku: '', price: formData.price, stock_quantity: 0 }])
  }

  const handleVariantImageChange = (index: number, file: File) => {
    const newVariants = [...variants]
    newVariants[index] = { 
      ...newVariants[index], 
      imageFile: file, 
      imagePreview: URL.createObjectURL(file) 
    }
    setVariants(newVariants)
  }

  const updateVariant = <K extends keyof Variant>(index: number, field: K, value: Variant[K]) => {
    const newVariants = [...variants]
    newVariants[index] = { ...newVariants[index], [field]: value }
    setVariants(newVariants)
  }

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index))
  }

  const addFaq = () => {
    setFaqs([...faqs, { question: '', answer: '', sort_order: faqs.length, is_active: true }])
  }

  const updateFaq = (index: number, field: keyof ProductFaqForm, value: string | number | boolean) => {
    const next = [...faqs]
    next[index] = { ...next[index], [field]: value }
    setFaqs(next)
  }

  const removeFaq = (index: number) => {
    setFaqs(faqs.filter((_, i) => i !== index))
  }

  const handleFaqQuickPaste = () => {
    const lines = faqPasteText.split('\n').filter(line => line.trim() !== '')
    const newRows: ProductFaqForm[] = lines.map((line, i) => {
      const pipe = line.indexOf('|')
      if (pipe >= 0) {
        return {
          question: line.slice(0, pipe).trim(),
          answer: line.slice(pipe + 1).trim(),
          sort_order: faqs.length + i,
          is_active: true,
        }
      }
      return { question: line.trim(), answer: '', sort_order: faqs.length + i, is_active: true }
    })
    setFaqs([...faqs, ...newRows])
    setFaqPasteText('')
    setIsFaqPasteOpen(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)

    const data = new FormData()
    Object.entries(formData).forEach(([key, val]) => {
      data.append(key, typeof val === 'boolean' ? (val ? '1' : '0') : val)
    })
    
    const specsPayload = specs.map((s, i) => {
      const row: Record<string, unknown> = {
        spec_group: s.spec_group,
        spec_key: s.spec_key,
        spec_value: s.spec_value,
        spec_unit: s.spec_unit,
        sort_order: i,
      }
      if (s.id != null) row.id = s.id
      if (s.scope === 'common') {
        row.product_variant_id = null
        row.product_variant_index = null
      } else if (s.scope.startsWith('variant:')) {
        const vid = Number(s.scope.slice('variant:'.length))
        row.product_variant_id = Number.isFinite(vid) ? vid : null
        row.product_variant_index = null
      } else if (s.scope.startsWith('idx:')) {
        const idx = Number(s.scope.slice('idx:'.length))
        row.product_variant_id = null
        row.product_variant_index = Number.isFinite(idx) ? idx : null
      } else {
        row.product_variant_id = null
        row.product_variant_index = null
      }
      return row
    })
    data.append('specs', JSON.stringify(specsPayload))
    const faqsPayload = faqs
      .map((f, i) => ({
        id: f.id,
        question: f.question.trim(),
        answer: f.answer.trim(),
        sort_order: f.sort_order ?? i,
        is_active: f.is_active !== false,
      }))
      .filter(f => f.question.length > 0 && f.answer.length > 0)
    data.append('faqs', JSON.stringify(faqsPayload))
    data.append('variants', JSON.stringify(variants.map(v => ({
      ...v,
      imageFile: undefined,
      imagePreview: undefined
    }))))
    
    selectedFiles.forEach(file => data.append('images[]', file))
    
    // Add Variant Images
    variants.forEach((v, idx) => {
      if (v.imageFile) {
        data.append(`variant_image_${idx}`, v.imageFile)
      }
    })
    
    if (productId) {
      if (selectedFiles.length > 0) {
        data.append('keep_existing_images', 'false')
      } else {
        data.append('keep_existing_images', 'true')
      }
    }

    try {
      const url = productId ? `/api/admin/products/${productId}` : '/api/admin/products'
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        body: data
      })
      const resData = (await response.json()) as { message?: string; inventory_items?: InventoryMainRow[] }
      if (!response.ok) throw new Error(resData.message || 'Lỗi khi lưu sản phẩm')
      if (resData.inventory_items) {
        const invMain = resData.inventory_items.find(i => i.location_code === 'main')
        setMainInventoryQty(typeof invMain?.quantity_on_hand === 'number' ? invMain.quantity_on_hand : null)
      }
      onSave()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu sản phẩm')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="pFormLoading">Đang tải thông tin sản phẩm...</div>

  return (
    <div className="pFormRoot">
      <div className="pFormHeader">
        <button className="pBackBtn" onClick={onCancel}>← Quay lại danh sách</button>
        <h2 className="pFormTitle">{productId ? 'CHỈNH SỬA SẢN PHẨM' : 'THÊM SẢN PHẨM MỚI'}</h2>
      </div>

      {error && <div className="prodErrorBanner">{error}</div>}

      <form onSubmit={handleSubmit} className="pFormContainer">
        <div className="pOneTabGrid">
          <div className="pOneTabMain">
            <div className="pTabContent">
              {/* SECTION: GENERAL */}
              <div className="pTabPane active">
                <div className="pFormSection" id="pf-general">
                  <div className="pSectionHeader">
                    <h3 className="pSectionTitle">Thông tin cơ bản</h3>
                  </div>

                  <div className="pGeneralGrid">
                    <div className="pGeneralMain">
                      <div className="pField">
                        <label>TÊN SẢN PHẨM</label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={e => setFormData({ ...formData, name: e.target.value })}
                          placeholder="VD: iPhone 15 Pro Max"
                          required
                        />
                      </div>

                      <div className="pField">
                        <label>MÔ TẢ NGẮN GỌN</label>
                        <textarea
                          value={formData.description}
                          onChange={e => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                          placeholder="Mô tả tóm tắt..."
                        />
                      </div>

                      <div className="pField">
                        <label>NỘI DUNG CHI TIẾT (HTML)</label>
                        <textarea
                          value={formData.rich_html}
                          onChange={e => setFormData({ ...formData, rich_html: e.target.value })}
                          rows={10}
                          placeholder="Dán mã HTML bài viết chi tiết vào đây..."
                        />
                        <p className="pHint" style={{ marginTop: 8, fontSize: 12 }}>
                          Lưu ý: hệ thống sẽ tự lọc các thẻ nguy hiểm.
                        </p>
                      </div>
                    </div>

                    <div className="pGeneralSide">
                      <div className="pField">
                        <label>DANH MỤC</label>
                        <div className="pSelectWrap">
                          <select
                            value={formData.category_id}
                            onChange={e => setFormData({ ...formData, category_id: e.target.value })}
                            required
                            className="pPremiumSelect"
                          >
                            <option value="">Chọn danh mục</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          <div className="pSelectArrow">▾</div>
                        </div>
                      </div>

                      <div className="pField">
                        <label>THƯƠNG HIỆU</label>
                        <input
                          type="text"
                          value={formData.brand}
                          onChange={e => setFormData({ ...formData, brand: e.target.value })}
                          placeholder="VD: Apple"
                        />
                      </div>

                      <div className="pField">
                        <label>GIÁ BÁN CƠ BẢN (đ)</label>
                        <input
                          type="number"
                          value={formData.price}
                          onChange={e => setFormData({ ...formData, price: e.target.value })}
                          placeholder="VD: 34990000"
                          required
                        />
                      </div>

                      <div className="pField">
                        <label>TRẠNG THÁI</label>
                        <div className="pToggleField" style={{ marginTop: 8 }}>
                          <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.is_active}
                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                          />
                          <label htmlFor="isActive">Hiển thị tại cửa hàng</label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

          {/* SECTION: IMAGES */}
          <div className="pTabPane active">
            <div className="pFormSection" id="pf-images">
              <h3 className="pSectionTitle">Hình ảnh sản phẩm</h3>
              <p className="pHint" style={{ marginBottom: '20px' }}>
                Tải lên tối đa {MAX_PRODUCT_IMAGES} hình ảnh. Hình ảnh đầu tiên sẽ là ảnh đại diện.
                {productId && (
                  <span> Nếu đã đủ {MAX_PRODUCT_IMAGES} ảnh, dùng nút <strong>Thay toàn bộ ảnh</strong> bên dưới để chọn bộ ảnh mới rồi Lưu.</span>
                )}
              </p>
              <div className="pUploadGrid">
                {productId && existingImages.length > 0 && selectedFiles.length === 0 && (
                   existingImages.map((img, i) => (
                     <div key={i} className="pPreviewBox existing">
                       <img src={resolveImageUrl(img.image_url)} alt="" />
                       <span className="pExistingLabel">Đã lưu</span>
                     </div>
                   ))
                )}
                {previews.map((src, i) => (
                  <div key={i} className="pPreviewBox">
                    <img src={src} alt="" />
                    <button type="button" onClick={() => removeFile(i)}>×</button>
                  </div>
                ))}
                {(previews.length + (selectedFiles.length > 0 ? 0 : existingImages.length)) < MAX_PRODUCT_IMAGES && (
                  <label className="pUploadTrigger">
                    <input type="file" multiple accept="image/*" onChange={handleFileChange} hidden />
                    <span>+ Thêm ảnh</span>
                  </label>
                )}
              </div>
              {productId &&
                selectedFiles.length === 0 &&
                existingImages.length >= MAX_PRODUCT_IMAGES && (
                  <div className="pReplaceAllImages">
                    <p className="pHint pReplaceAllImages__text">
                      Bạn đang có đủ {MAX_PRODUCT_IMAGES} ảnh — nút &quot;Thêm ảnh&quot; tạm ẩn. Bấm bên dưới để chọn tối đa {MAX_PRODUCT_IMAGES} ảnh mới; khi Lưu, toàn bộ ảnh cũ sẽ được thay bằng bộ này.
                    </p>
                    <label className="pUploadTrigger pUploadTrigger--replace">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleReplaceAllProductImages}
                        hidden
                      />
                      <span>Thay toàn bộ ảnh sản phẩm</span>
                    </label>
                  </div>
                )}
              {productId && selectedFiles.length > 0 && (
                <p className="pWarningHint">Lưu ý: Tải ảnh mới sẽ thay thế toàn bộ ảnh cũ của sản phẩm này.</p>
              )}
            </div>
          </div>

          {/* SECTION: VARIANTS */}
          <div className="pTabPane active">
            <div className="pFormSection" id="pf-variants">
              <div className="pInventorySyncNote">
                <span>Tổng tồn theo phiên bản: </span>
                <strong>{variantStockSum}</strong>
                {productId && mainInventoryQty !== null && (
                  <>
                    <span className="pInventorySep"> · </span>
                    <span>Tồn kho (bảng inventory · kho main): </span>
                    <strong>{mainInventoryQty}</strong>
                    <span className="pInventoryHint"> — đồng bộ khi Lưu sản phẩm.</span>
                  </>
                )}
              </div>
              <div className="pSectionHeader">
                <h3 className="pSectionTitle">Phiên bản & Màu sắc</h3>
                <div className="pSpecActions">
                  <button type="button" className="pQuickPasteBtn" onClick={() => setIsVariantPasteOpen(true)}>
                    <PasteIcon /> Dán nhanh
                  </button>
                  <button type="button" className="pAddVariantBtn" onClick={addVariant}>+ Thêm phiên bản</button>
                </div>
              </div>
              
              <div className="pVariantsWrapper">
                <div className="pVariantsGrid">
                  {variants.length === 0 && <p className="pEmptySpecs">Sản phẩm này chưa có phiên bản khác.</p>}
                  
                  {variants.length > 0 && (
                    <div className="pVariantRow pVariantHeaderRow">
                      <div>Ảnh</div>
                      <div>Tên phiên bản</div>
                      <div>Màu sắc</div>
                      <div>Cấu hình</div>
                      <div>Giá (đ)</div>
                      <div>Kho</div>
                      <div></div>
                    </div>
                  )}

                  {variants.map((v, index) => (
                    <div key={index} className="pVariantRow">
                      <div className="vImgField">
                         <label className="vImgUpload">
                            <input type="file" hidden onChange={e => e.target.files && handleVariantImageChange(index, e.target.files[0])} />
                            {v.imagePreview || v.image_url ? (
                              <img src={v.imagePreview || resolveImageUrl(v.image_url || null)} alt="" />
                            ) : (
                              <div className="vImgPlaceholder">+ Ảnh</div>
                            )}
                         </label>
                      </div>
                      <div className="vField">
                        <input placeholder="Tên phiên bản" value={v.variant_name} onChange={e => updateVariant(index, 'variant_name', e.target.value)} />
                      </div>
                      <div className="vField">
                        <input placeholder="Màu sắc" value={v.color} onChange={e => updateVariant(index, 'color', e.target.value)} />
                      </div>
                      <div className="vField">
                        <input placeholder="Cấu hình" value={v.configuration} onChange={e => updateVariant(index, 'configuration', e.target.value)} />
                      </div>
                      <div className="vField priceField">
                        <input type="number" placeholder="Giá (đ)" value={v.price} onChange={e => updateVariant(index, 'price', e.target.value)} />
                      </div>
                      <div className="vField stockField">
                        <input type="number" placeholder="Kho" value={v.stock_quantity} onChange={e => updateVariant(index, 'stock_quantity', parseInt(e.target.value))} />
                      </div>
                      <button type="button" onClick={() => removeVariant(index)} className="pRemoveSpec" title="Xóa phiên bản">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION: SPECS */}
          <div className="pTabPane active">
            <div className="pFormSection" id="pf-specs">
              <div className="pSectionHeader">
                <h3 className="pSectionTitle">Thông số kỹ thuật</h3>
                <div className="pSpecActions">
                  <button type="button" className="pQuickPasteBtn" onClick={() => setIsSpecPasteOpen(true)}>
                    <PasteIcon /> Dán nhanh
                  </button>
                  <button type="button" className="pAddSpecBtn" onClick={addSpec}>+ Thêm thông số</button>
                </div>
              </div>
              <div className="pSpecsGrid">
                {specs.length === 0 && <p className="pEmptySpecs">Chưa có thông số nào.</p>}
                
                {specs.length > 0 && (
                  <div className="pSpecRow pSpecHeaderRow">
                    <div>Áp dụng</div>
                    <div>Nhóm</div>
                    <div>Tên thông số</div>
                    <div>Giá trị</div>
                    <div>Đơn vị</div>
                    <div></div>
                  </div>
                )}

                {specs.map((spec, index) => (
                  <div key={index} className="pSpecRow">
                    <select
                      className="pSpecScopeSelect"
                      value={spec.scope}
                      onChange={e => updateSpec(index, 'scope', e.target.value)}
                      title="Chung = mọi phiên bản; chọn phiên bản = chỉ khi chọn bản đó ở trang sản phẩm"
                    >
                      <option value="common">Chung (mọi phiên bản)</option>
                      {variants.map((v, vi) => (
                        <option key={vi} value={v.id ? `variant:${v.id}` : `idx:${vi}`}>
                          Chỉ: {v.variant_name?.trim() || `Phiên bản ${vi + 1}`}
                        </option>
                      ))}
                    </select>
                    <input placeholder="Nhóm" value={spec.spec_group} onChange={e => updateSpec(index, 'spec_group', e.target.value)} />
                    <input placeholder="Tên" value={spec.spec_key} onChange={e => updateSpec(index, 'spec_key', e.target.value)} />
                    <input placeholder="Giá trị" value={spec.spec_value} onChange={e => updateSpec(index, 'spec_value', e.target.value)} />
                    <input placeholder="Đơn vị" value={spec.spec_unit} onChange={e => updateSpec(index, 'spec_unit', e.target.value)} className="uInput" />
                    <button type="button" onClick={() => removeSpec(index)} className="pRemoveSpec" title="Xóa thông số">×</button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION: FAQS */}
          <div className="pTabPane active">
            <div className="pFormSection" id="pf-faqs">
              <div className="pSectionHeader">
                <h3 className="pSectionTitle">Câu hỏi thường gặp</h3>
                <div className="pSpecActions">
                  <button type="button" className="pQuickPasteBtn" onClick={() => setIsFaqPasteOpen(true)}>
                    <PasteIcon /> Dán nhanh
                  </button>
                  <button type="button" className="pAddSpecBtn" onClick={addFaq}>+ Thêm câu hỏi</button>
                </div>
              </div>
              <div className="pFaqGrid">
                {faqs.length === 0 && (
                  <p className="pEmptySpecs">Thêm các câu hỏi thường gặp giúp khách tin tưởng hơn khi xem sản phẩm.</p>
                )}
                
                {faqs.map((f, index) => (
                  <div key={index} className="pFaqCard">
                    <div className="pFaqCardHead">
                      <input
                        className="pFaqQInput"
                        placeholder={index === faqs.length - 1 && !f.question && !f.answer ? 'Nhập câu hỏi mới...' : 'Câu hỏi'}
                        value={f.question}
                        onChange={e => updateFaq(index, 'question', e.target.value)}
                      />
                      <div className="pFaqMeta">
                        <label className="pFaqOrder">
                          <span>STT</span>
                          <input
                            type="number"
                            min={0}
                            title="Số thứ tự hiển thị"
                            value={f.sort_order}
                            onChange={e => updateFaq(index, 'sort_order', parseInt(e.target.value, 10) || 0)}
                          />
                        </label>
                        <label className="pFaqShow">
                          <input
                            type="checkbox"
                            checked={f.is_active}
                            onChange={e => updateFaq(index, 'is_active', e.target.checked)}
                          />
                          Hiển thị
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFaq(index)}
                        className="pFaqTrashBtn"
                        title="Xóa câu hỏi"
                        aria-label="Xóa câu hỏi"
                        >
                          ×
                      </button>
                    </div>
                    <textarea
                      className="pFaqAInput"
                      placeholder={index === faqs.length - 1 && !f.question && !f.answer ? 'Nhập câu trả lời...' : 'Trả lời chi tiết'}
                      value={f.answer}
                      onChange={e => updateFaq(index, 'answer', e.target.value)}
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
            </div>
          </div>

          <aside className="pOneTabSide">
            <div className="pSideCard">
              <div className="pSideTitle">Tóm tắt</div>
              <div className="pSideRow">
                <span>Ảnh sản phẩm</span>
                <b>{selectedFiles.length > 0 ? selectedFiles.length : existingImages.length}</b>
              </div>
              <div className="pSideRow">
                <span>Phiên bản</span>
                <b>{variants.length}</b>
              </div>
              <div className="pSideRow">
                <span>Thông số</span>
                <b>{specs.length}</b>
              </div>
              <div className="pSideRow">
                <span>FAQ</span>
                <b>{faqs.length}</b>
              </div>
              <div className="pSideDivider" />
              <div className="pSideRow">
                <span>Tổng tồn (theo phiên bản)</span>
                <b>{variantStockSum}</b>
              </div>
              {productId && mainInventoryQty != null && (
                <div className="pSideRow">
                  <span>Tồn kho (inventory main)</span>
                  <b>{mainInventoryQty}</b>
                </div>
              )}
              <div className="pSideHint">
                Mẹo: cuộn xuống theo từng khối; thanh lưu/hủy luôn nằm ở cuối (sticky).
              </div>
            </div>
          </aside>
        </div>

        {/* Global Form Actions */}
        <div className="pFormActions pStickyActions">
          <button type="button" className="pCancelBtn" onClick={onCancel} disabled={isSaving}>Hủy bỏ</button>
          <button type="submit" className="pSubmitBtn" disabled={isSaving}>
            {isSaving ? 'Đang lưu...' : (productId ? 'Lưu thay đổi' : 'Tạo sản phẩm')}
          </button>
        </div>
      </form>

      {/* Spec Quick Paste Modal */}
      {isSpecPasteOpen && (
        <div className="pModalOverlay">
          <div className="pModalContent small">
            <div className="pModalHeader">
              <h3>Dán nhanh thông số</h3>
              <button onClick={() => setIsSpecPasteOpen(false)}>×</button>
            </div>
            <div className="pModalBody">
              <p className="pHint">Định dạng: <b>Nhóm | Tên | Giá trị | Đơn vị</b> (Mỗi thông số một dòng)</p>
              <textarea 
                className="pQuickPasteArea" 
                rows={10} 
                value={specPasteText} 
                onChange={e => setSpecPasteText(e.target.value)}
                placeholder="VD: CPU | Số nhân | 6 | core&#10;CPU | Số luồng | 12 | thread"
              />
            </div>
            <div className="pModalFooter">
              <button className="pCancelBtn" onClick={() => setIsSpecPasteOpen(false)}>Hủy</button>
              <button className="pSubmitBtn" onClick={handleSpecQuickPaste}>Phân tích & Thêm</button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ Quick Paste Modal */}
      {isFaqPasteOpen && (
        <div className="pModalOverlay">
          <div className="pModalContent small">
            <div className="pModalHeader">
              <h3>Dán nhanh câu hỏi</h3>
              <button type="button" onClick={() => setIsFaqPasteOpen(false)}>×</button>
            </div>
            <div className="pModalBody">
              <p className="pHint">Định dạng: <b>Câu hỏi | Trả lời</b> (mỗi cặp một dòng)</p>
              <textarea
                className="pQuickPasteArea"
                rows={10}
                value={faqPasteText}
                onChange={e => setFaqPasteText(e.target.value)}
                placeholder="VD: Giao hàng mất bao lâu? | Thường 2–5 ngày làm việc.&#10;Có được đổi trả không? | Được, trong vòng 7 ngày nếu máy nguyên seal."
              />
            </div>
            <div className="pModalFooter">
              <button type="button" className="pCancelBtn" onClick={() => setIsFaqPasteOpen(false)}>Hủy</button>
              <button type="button" className="pSubmitBtn" onClick={handleFaqQuickPaste}>Phân tích & Thêm</button>
            </div>
          </div>
        </div>
      )}

      {/* Variant Quick Paste Modal */}
      {isVariantPasteOpen && (
        <div className="pModalOverlay">
          <div className="pModalContent small">
            <div className="pModalHeader">
              <h3>Dán nhanh phiên bản</h3>
              <button onClick={() => setIsVariantPasteOpen(false)}>×</button>
            </div>
            <div className="pModalBody">
              <p className="pHint">Định dạng: <b>Tên | Màu | Cấu hình | Giá | Kho</b></p>
              <textarea 
                className="pQuickPasteArea" 
                rows={10} 
                value={variantPasteText} 
                onChange={e => setVariantPasteText(e.target.value)}
                placeholder="VD: 15 Pro Max 256GB Silver | Silver | 8GB/256GB | 28990000 | 10"
              />
            </div>
            <div className="pModalFooter">
              <button className="pCancelBtn" onClick={() => setIsVariantPasteOpen(false)}>Hủy</button>
              <button className="pSubmitBtn" onClick={handleVariantQuickPaste}>Phân tích & Thêm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PasteIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg> }
