import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '@/configs/api.config'
import { fetchRoles, fetchUsers } from '@/features/services/admin/api.admin.service'
import '@/styles/admin/ProductPage.css'
import '@/styles/admin/UsersAdminPage.css'

type Role = {
  id: number
  name: string
  slug: string
  description?: string | null
}

type AdminUserRow = {
  id: number
  name: string
  email: string
  phone: string | null
  is_active: boolean
  created_at: string
  roles?: Role[]
}

type PaginatedUsers = {
  data: AdminUserRow[]
  current_page: number
  last_page: number
  per_page: number
  total: number
}

const ROLE_FALLBACK_VI: Record<string, string> = {
  admin: 'Quản trị viên',
  staff: 'Nhân viên',
  customer: 'Khách hàng',
}

function roleDisplayLabel(role: Role): string {
  const desc = role.description?.trim()
  if (desc) return desc
  return ROLE_FALLBACK_VI[role.slug] ?? role.name
}

function formatRoles(roles: Role[] | undefined): string {
  if (!roles?.length) return '—'
  return roles.map(roleDisplayLabel).join(', ')
}

function userHasAdminRole(row: AdminUserRow): boolean {
  return (row.roles ?? []).some(r => r.slug === 'admin')
}

function readCurrentUserId(): number | null {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    const u = JSON.parse(raw) as { id?: number }
    return typeof u.id === 'number' ? u.id : null
  } catch {
    return null
  }
}

type BusyKind = 'lock' | 'delete' | 'roles'

export default function UsersAdminPage() {
  const token = localStorage.getItem('token')
  const currentUserId = useMemo(() => readCurrentUserId(), [])
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [rows, setRows] = useState<AdminUserRow[]>([])
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<{ userId: number; kind: BusyKind } | null>(null)
  const [activeTab, setActiveTab] = useState<'customer' | 'admin'>('customer')

  const [roleCatalog, setRoleCatalog] = useState<Role[]>([])
  const [rolesCatalogLoading, setRolesCatalogLoading] = useState(true)
  const [rolesCatalogError, setRolesCatalogError] = useState<string | null>(null)

  const [roleEditor, setRoleEditor] = useState<{ user: AdminUserRow; selectedIds: number[] } | null>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 350)
    return () => window.clearTimeout(t)
  }, [search])

  useEffect(() => {
    let cancelled = false
    async function fetchRolesCatalog() {
      setRolesCatalogLoading(true)
      setRolesCatalogError(null)
      try {
        const list = await fetchRoles<Role[]>(token)
        if (!cancelled) setRoleCatalog(list ?? [])
      } catch (e: unknown) {
        if (!cancelled) {
          setRoleCatalog([])
          setRolesCatalogError(e instanceof Error ? e.message : 'Không tải được danh sách vai trò.')
        }
      } finally {
        if (!cancelled) setRolesCatalogLoading(false)
      }
    }
    void fetchRolesCatalog()
    return () => {
      cancelled = true
    }
  }, [token])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams()
      q.set('page', String(page))
      q.set('role_type', activeTab)
      if (debouncedSearch) q.set('search', debouncedSearch)
      const res = await fetchUsers<PaginatedUsers>(q.toString(), token)
      setRows(res.data ?? [])
      setLastPage(res.last_page ?? 1)
      setTotal(res.total ?? 0)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không tải được danh sách người dùng.')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [token, page, debouncedSearch, activeTab])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, activeTab])

  const setLock = async (u: AdminUserRow, lock: boolean) => {
    if (busy != null) return
    const label = lock ? 'khóa' : 'mở khóa'
    if (!confirm(lock ? `Khóa tài khoản "${u.name}"? Họ sẽ không đăng nhập được.` : `Mở khóa tài khoản "${u.name}"?`)) return
    setBusy({ userId: u.id, kind: 'lock' })
    setError(null)
    try {
      await apiFetch<AdminUserRow>(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ is_active: !lock }),
      })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : `Không ${label} được tài khoản.`)
    } finally {
      setBusy(null)
    }
  }

  const removeUser = async (u: AdminUserRow) => {
    if (busy != null) return
    if (!confirm(`Xóa tài khoản "${u.name}" (${u.email})? Hành động không thể hoàn tác.`)) return
    setBusy({ userId: u.id, kind: 'delete' })
    setError(null)
    try {
      await apiFetch(`/api/admin/users/${u.id}`, { method: 'DELETE', token })
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không xóa được tài khoản.')
    } finally {
      setBusy(null)
    }
  }

  const openRoleEditor = (u: AdminUserRow) => {
    const ids = [...new Set((u.roles ?? []).map(r => r.id))]
    setRoleEditor({ user: u, selectedIds: ids })
  }

  const toggleRoleInEditor = (roleId: number) => {
    setRoleEditor(prev => {
      if (!prev) return prev
      const has = prev.selectedIds.includes(roleId)
      const next = has ? prev.selectedIds.filter(id => id !== roleId) : [...prev.selectedIds, roleId]
      return { ...prev, selectedIds: next }
    })
  }

  const saveRoles = async () => {
    if (!roleEditor || busy != null) return
    const { user, selectedIds } = roleEditor
    if (selectedIds.length < 1) {
      alert('Chọn ít nhất một vai trò.')
      return
    }

    const uniqueSorted = [...new Set(selectedIds)].sort((a, b) => a - b)
    setBusy({ userId: user.id, kind: 'roles' })
    setError(null)
    try {
      await apiFetch<AdminUserRow>(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ role_ids: uniqueSorted }),
      })
      setRoleEditor(null)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Không lưu được vai trò.')
    } finally {
      setBusy(null)
    }
  }

  const closeRoleEditor = () => {
    if (busy?.kind === 'roles') return
    setRoleEditor(null)
  }

  return (
    <div className="prodAdminRoot">
      <div className="prodHeader">
        <div>
          <h2 className="prodTitle">Quản lý người dùng</h2>
          <p className="prodSub">
            Đổi vai trò (nhiều vai trò được phép), khóa / mở khóa đăng nhập hoặc xóa mềm — không áp dụng chính tài khoản bạn.
          </p>
        </div>
        <div className="usersAdminToolbar">
          <input
            type="search"
            className="usersAdminSearch"
            placeholder="Tìm theo tên, email, SĐT…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Tìm người dùng"
          />
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="pDetailFilterBar usersadminpage-style-1" >
        <div className="pVariantFilterTabs usersadminpage-style-2" >
          <button 
            type="button"
            className={`pVariantTabBtn ${activeTab === 'customer' ? 'active' : ''}`}
            onClick={() => setActiveTab('customer')}
          >
            Khách hàng
          </button>
          <button 
            type="button"
            className={`pVariantTabBtn ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            Quản trị & Nhân viên
          </button>
        </div>
      </div>

      {rolesCatalogError && <div className="prodErrorBanner">{rolesCatalogError}</div>}
      {error && <div className="prodErrorBanner">{error}</div>}

      <div className="prodTableWrap">
        {loading ? (
          <table className="prodTable">
            <thead>
              <tr>
                <th>TÊN</th>
                <th>EMAIL</th>
                <th>SỐ ĐIỆN THOẠI</th>
                <th>VAI TRÒ</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="admSkeletonRow">
                  <td colSpan={6}>
                    <div className="admSkeletonCell">
                      <div className="admSkeletonBar" style={{ width: i % 2 === 0 ? '70%' : '90%' }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="prodTable">
            <thead>
              <tr>
                <th>TÊN</th>
                <th>EMAIL</th>
                <th>SỐ ĐIỆN THOẠI</th>
                <th>VAI TRÒ</th>
                <th>TRẠNG THÁI</th>
                <th>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6}  className="usersadminpage-style-3">
                    {debouncedSearch ? 'Không tìm thấy người dùng phù hợp.' : 'Chưa có người dùng.'}
                  </td>
                </tr>
              ) : (
                rows.map(u => {
                  const isSelf = currentUserId != null && u.id === currentUserId
                  const rowBusy = busy?.userId === u.id
                  const lockLoading = rowBusy && busy?.kind === 'lock'
                  const deleteLoading = rowBusy && busy?.kind === 'delete'
                  const rolesSaving = rowBusy && busy?.kind === 'roles'
                  const isAdminAccount = userHasAdminRole(u)
                  const rolesEditDisabled =
                    isSelf ||
                    rowBusy ||
                    rolesCatalogLoading ||
                    roleCatalog.length === 0 ||
                    isAdminAccount

                  const roleEditTitle = isSelf
                    ? 'Không thể đổi vai trò chính bạn'
                    : isAdminAccount
                      ? 'Không thể đổi vai trò tài khoản quản trị viên'
                      : rolesCatalogLoading
                        ? 'Đang tải vai trò…'
                        : 'Đổi vai trò'

                  return (
                    <tr key={u.id}>
                      <td>
                        <span className="pName">{u.name}</span>
                      </td>
                      <td>
                        <span className="pCat">{u.email}</span>
                      </td>
                      <td>
                        <span className="pCat">{u.phone || '—'}</span>
                      </td>
                      <td>
                        <div className="usersAdminRoleCell">
                          <span className="pCat usersAdminRoleText">{formatRoles(u.roles)}</span>
                          <button
                            type="button"
                            className="pEdit usersAdminIconBtn usersAdminRoleEditBtn"
                            disabled={rolesEditDisabled}
                            aria-label={roleEditTitle}
                            title={roleEditTitle}
                            onClick={() => {
                              if (rolesEditDisabled) return
                              openRoleEditor(u)
                            }}
                          >
                            {rolesSaving && !isAdminAccount ? (
                              <IconSpinner />
                            ) : isAdminAccount ? (
                              <PencilOffIcon />
                            ) : (
                              <PencilIcon />
                            )}
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className={`pStatus ${u.is_active ? 'active' : 'inactive'}`}>
                          {u.is_active ? 'HOẠT ĐỘNG' : 'VÔ HIỆU'}
                        </span>
                      </td>
                      <td>
                        <div className="pActions usersAdminActions">
                          {u.is_active ? (
                            <button
                              type="button"
                              className="pEdit usersAdminIconBtn"
                              disabled={isSelf || rowBusy}
                              aria-label={isSelf ? 'Không thể khóa chính bạn' : 'Khóa tài khoản'}
                              title={isSelf ? 'Không thể khóa chính bạn' : 'Khóa tài khoản'}
                              onClick={() => void setLock(u, true)}
                            >
                              {lockLoading ? <IconSpinner /> : <LockIcon />}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="pEdit usersAdminIconBtn"
                              disabled={isSelf || rowBusy}
                              aria-label={isSelf ? 'Không thể thao tác chính bạn' : 'Mở khóa tài khoản'}
                              title={isSelf ? 'Không thể thao tác chính bạn' : 'Mở khóa tài khoản'}
                              onClick={() => void setLock(u, false)}
                            >
                              {lockLoading ? <IconSpinner /> : <UnlockIcon />}
                            </button>
                          )}
                          <button
                            type="button"
                            className="pDelete usersAdminIconBtn"
                            disabled={isSelf || rowBusy}
                            aria-label={isSelf ? 'Không thể xóa chính bạn' : 'Xóa tài khoản'}
                            title={isSelf ? 'Không thể xóa chính bạn' : 'Xóa tài khoản'}
                            onClick={() => void removeUser(u)}
                          >
                            {deleteLoading ? <IconSpinner /> : <TrashIcon />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {!loading && lastPage > 1 && (
        <div className="usersAdminPager">
          <button type="button" className="pEdit" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            Trước
          </button>
          <span className="usersAdminPagerInfo">
            Trang {page} / {lastPage} ({total} người)
          </span>
          <button
            type="button"
            className="pEdit"
            disabled={page >= lastPage}
            onClick={() => setPage(p => Math.min(lastPage, p + 1))}
          >
            Sau
          </button>
        </div>
      )}

      {roleEditor && (
        <div
          className="usersRoleModalOverlay"
          role="presentation"
          onClick={() => {
            closeRoleEditor()
          }}
        >
          <div
            className="usersRoleModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="usersRoleModalTitle"
            onClick={e => e.stopPropagation()}
          >
            <div className="usersRoleModalHead">
              <div>
                <h3 id="usersRoleModalTitle" className="usersRoleModalTitle">
                  Thay đổi vai trò
                </h3>
                <p className="usersRoleModalLead">
                  {roleEditor.user.name} · {roleEditor.user.email}
                </p>
              </div>
              <button
                type="button"
                className="usersRoleModalClose"
                aria-label="Đóng"
                disabled={busy?.kind === 'roles'}
                onClick={() => closeRoleEditor()}
              >
                ×
              </button>
            </div>
            <div className="usersRoleModalBody">
              {roleCatalog.map(r => {
                const checked = roleEditor.selectedIds.includes(r.id)
                return (
                  <label key={r.id} className="usersRoleCheckRow">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={busy?.kind === 'roles'}
                      onChange={() => toggleRoleInEditor(r.id)}
                    />
                    <div className="usersRoleCheckText">
                      <span className="usersRoleCheckLabel">{roleDisplayLabel(r)}</span>
                      <span className="usersRoleCheckDesc">
                        Mã vai trò: <code>{r.slug}</code>
                      </span>
                    </div>
                  </label>
                )
              })}
            </div>
            <div className="usersRoleModalFoot">
              <button
                type="button"
                className="usersRoleModalBtnGhost"
                disabled={busy?.kind === 'roles'}
                onClick={() => closeRoleEditor()}
              >
                Hủy
              </button>
              <button
                type="button"
                className="usersRoleModalBtnSave"
                disabled={busy?.kind === 'roles'}
                onClick={() => void saveRoles()}
              >
                {busy?.kind === 'roles' ? 'Đang lưu…' : 'Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function IconSpinner() {
  return (
    <svg className="usersAdminIconSpinner" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="40"
        strokeDashoffset="12"
        opacity="0.35"
      />
      <path
        d="M12 3a9 9 0 0 1 9 9"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M7 11V8a5 5 0 0 1 10 0v3" />
    </svg>
  )
}

function UnlockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M7 11V8a5 5 0 0 1 9.33-2.5" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      <path d="m15 5 4 4" />
    </svg>
  )
}

/** Bút bị gạch — tài khoản có vai trò admin không chỉnh được. */
function PencilOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <g opacity={0.35} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        <path d="m15 5 4 4" />
      </g>
      <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" />
    </svg>
  )
}
