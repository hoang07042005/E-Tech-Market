import React from 'react'

export default function ConfirmModal({
  open,
  title = 'Xác nhận',
  message = '',
  onConfirm,
  onCancel,
  confirmLabel = 'Xoá',
  cancelLabel = 'Huỷ',
}: {
  open: boolean
  title?: string
  message?: React.ReactNode
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  confirmLabel?: string
  cancelLabel?: string
}) {
  if (!open) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 8, width: 480, maxWidth: '90%', padding: 20, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>{title}</h3>
        <div style={{ marginBottom: 16, color: '#333' }}>{message}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onCancel} style={{ padding: '8px 12px', background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: 6 }}>{cancelLabel}</button>
          <button onClick={onConfirm} style={{ padding: '8px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
