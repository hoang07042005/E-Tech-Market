import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/configs/api.config";
import "@/styles/pages/SecurityPage.css";
import { useAuthStore } from "@/features/store/useAuthStore";
import ConfirmModal from "@/components/ConfirmModal";
import { toast } from '@/utils/toast';

type SessionRow = {
  id: string;
  name?: string | null;
  created_at?: string | null;
  last_used_at?: string | null;
  is_current?: boolean;
};

function fmtDateTimeVi(iso?: string | null) {
  if (!iso) return "—";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "—";
  return new Date(t).toLocaleString("vi-VN");
}

// Helper to parse User Agent into friendly device names
function formatDeviceName(ua: string) {
  if (!ua || ua === 'auth') return 'Website E-Tech';
  if (ua.startsWith('E-Tech App')) return 'Ứng dụng E-Tech';

  let browser = 'Trình duyệt';
  if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Chrome') || ua.includes('CriOS')) browser = 'Chrome';
  else if (ua.includes('Firefox') || ua.includes('FxiOS')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';

  let os = 'Thiết bị';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS') || ua.includes('Macintosh')) os = 'macOS';
  else if (ua.includes('iPhone')) os = 'iPhone';
  else if (ua.includes('iPad')) os = 'iPad';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Linux')) os = 'Linux';

  if (os === 'Thiết bị' && browser === 'Trình duyệt') {
    return ua.length > 25 ? ua.substring(0, 25) + '...' : ua;
  }
  return `${os} • ${browser}`;
}

export default function SecurityPage() {
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showNotAvailable, setShowNotAvailable] = useState(false);
  const userStr = useAuthStore((state) => state.userStr);
  const hasAuth = !!userStr;

  const [pwCur, setPwCur] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");

  const [backupCodes] = useState<string[]>(() => [
    "ABCD-1234-EFGH",
    "IJKL-5678-MNOP",
    "QRST-9012-UVWX",
    "YZAB-3456-CDEF",
    "GHIJ-7890-KLMN",
  ]);

  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [showAllSessions, setShowAllSessions] = useState(false);

  const currentSessionCount = useMemo(() => sessions.length, [sessions]);

  useEffect(() => {
    if (!hasAuth) return;
    let cancelled = false;
    apiFetch<{ data: SessionRow[] }>("/me/sessions")
      .then((res) => {
        if (cancelled) return;
        setSessions(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [hasAuth]);

  const onChangePassword = async () => {
    setError(null);
    setSuccess(null);
    if (!hasAuth) {
      setError("Vui lòng đăng nhập lại để đổi mật khẩu.");
      return;
    }
    if (!pwCur.trim() || !pwNew.trim() || !pwConfirm.trim()) {
      setError("Vui lòng điền đủ các trường mật khẩu.");
      return;
    }
    if (pwNew.length < 8) {
      setError("Mật khẩu mới cần tối thiểu 8 ký tự.");
      return;
    }
    if (pwNew !== pwConfirm) {
      setError("Xác nhận mật khẩu mới không khớp.");
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/me/password", {
        method: "PATCH",
        body: JSON.stringify({
          current_password: pwCur,
          new_password: pwNew,
        }),
      });
      setPwCur("");
      setPwNew("");
      setPwConfirm("");
      setSuccess("Đổi mật khẩu thành công.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Không thể đổi mật khẩu.");
    } finally {
      setBusy(false);
    }
  };

  const revokeSession = async (id: string) => {
    try {
      await apiFetch(`/me/sessions/${id}`, { method: "DELETE" });
      setSessions((p) => p.filter((s) => s.id !== id));
    } catch (e) {
      console.error("Failed to revoke session", e);
    }
  };

  const logoutAll = async () => {
    try {
      await apiFetch("/me/sessions", { method: "DELETE" });
      setSessions([]);
    } catch (e) {
      console.error("Failed to revoke all sessions", e);
    }
  };

  return (
    <div className="secRoot">
      {/* HEADER & OVERVIEW */}
      <section className="secHeader">
        <h1 className="secMainTitle">Tổng quan bảo mật</h1>
        <div className="secMainDesc">Đảm bảo tài khoản của bạn luôn được bảo vệ</div>
      </section>

      <section className="secOverviewGrid">
        <div className="secOverviewCard">
          <div className="secOverviewIconWrap green"><CheckCircleIcon /></div>
          <div className="secOverviewText">
            <span className="secOverviewTextTitle">Mức độ bảo mật</span>
            <span className="secOverviewTextMain green">Cao</span>
            <span className="secOverviewTextSub">Tài khoản của bạn được bảo vệ tốt</span>
          </div>
        </div>
        <div className="secOverviewCard">
          <div className="secOverviewIconWrap blue"><LockIcon /></div>
          <div className="secOverviewText">
            <span className="secOverviewTextTitle">Mật khẩu</span>
            <span className="secOverviewTextMain blue">Mạnh</span>
            <span className="secOverviewTextSub">Cập nhật 2 ngày trước</span>
          </div>
        </div>
        <div className="secOverviewCard">
          <div className="secOverviewIconWrap orange"><LaptopIcon /></div>
          <div className="secOverviewText">
            <span className="secOverviewTextTitle">Thiết bị đăng nhập</span>
            <span className="secOverviewTextMain orange">{currentSessionCount} thiết bị</span>
            <span className="secOverviewTextSub">Đang hoạt động</span>
          </div>
        </div>
        <div className="secOverviewCard">
          <div className="secOverviewIconWrap purple"><ShieldCheckIcon /></div>
          <div className="secOverviewText">
            <span className="secOverviewTextTitle">2FA</span>
            <span className="secOverviewTextMain purple">{twoFaEnabled ? 'Đã bật' : 'Chưa bật'}</span>
            <span className="secOverviewTextSub">{twoFaEnabled ? 'Tài khoản được bảo vệ' : 'Tài khoản chưa có 2FA'}</span>
          </div>
        </div>
      </section>

      {/* TWO COLUMN BLOCK (PASSWORD & 2FA) */}
      <section className="secTwoCol">
        {/* PASSWORD */}
        <div className="secSectionCard">
          <div className="secSectionHead">
            <div className="secIconOrange"><LockIcon /></div>
            <div>
              <div className="secSectionTitle">Đổi mật khẩu</div>
              <div className="secSectionSub">Cập nhật mật khẩu để bảo vệ tài khoản</div>
            </div>
          </div>
          <div className="secFormCol">
            <div className="secInputWrap">
              <span className="input-icon"><LockIcon /></span>
              <span className="input-label-left">Mật khẩu hiện tại</span>
              <input type="password" value={pwCur} onChange={(e) => setPwCur(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="secInputWrap">
              <span className="input-icon"><LockIcon /></span>
              <span className="input-label-left">Mật khẩu mới</span>
              <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} placeholder="Tối thiểu 8 ký tự" />
            </div>
            <div className="secInputWrap">
              <span className="input-icon"><LockIcon /></span>
              <span className="input-label-left">Xác nhận mật khẩu mới</span>
              <input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} placeholder="Nhập lại mật khẩu mới" />
            </div>
          </div>
          {success && <div className="secInlineSuccess">{success}</div>}
          {error && <div className="secInlineError">{error}</div>}
          <div className="secBtnRow">
            <button type="button" className="secPrimaryBtn" onClick={onChangePassword} disabled={busy}>
              {busy ? "Đang xử lý…" : "Cập nhật mật khẩu"}
            </button>
          </div>
        </div>

        {/* 2FA */}
        <div className="secSectionCard">
          <div className="secSectionHead">
            <div className="secIconOrange"><ShieldCheckIcon /></div>
            <div>
              <div className="secSectionTitle">Xác thực 2 lớp (2FA)</div>
              <div className="secSectionSub">Tăng cường bảo mật cho tài khoản của bạn</div>
            </div>
          </div>

          <div className={`sec2faStatusBox ${twoFaEnabled ? '' : 'off'}`}>
            <div className="sec2faStatusLeft">
              <div className="sec2faStatusIcon">
                {twoFaEnabled ? <ShieldCheckIcon /> : <WarningIcon />}
              </div>
              <div>
                <div className="sec2faStatusTextTitle">{twoFaEnabled ? "Đang bật" : "Đang tắt"}</div>
                <div className="sec2faStatusTextSub">{twoFaEnabled ? "Tài khoản của bạn được bảo vệ với xác thực 2 lớp" : "Bạn nên bật xác thực 2 lớp"}</div>
              </div>
            </div>
            <button
              type="button"
              className={twoFaEnabled ? "pfSwitch pfSwitchOn" : "pfSwitch"}
              onClick={() => setShowNotAvailable(true)}
              aria-label="Bật tắt 2FA"
            >
              <span className="pfSwitchKnob" />
            </button>
          </div>

          <div className="secMethodTitle">Phương thức xác thực</div>
          <div className="secMethodBox">
            <FingerprintIcon /> Ứng dụng xác thực (Google Authenticator)
          </div>

          <div className="sec2faBottomRow">
            <span className="sec2faFooterText">Bật 2FA để thêm một lớp bảo mật cho tài khoản của bạn.</span>
            <button type="button" className="secOutlineOrangeBtn" onClick={() => setShowNotAvailable(true)}>Quản lý 2FA</button>
          </div>
        </div>
      </section>

      {/* SESSIONS */}
      <section className="secSectionCard">
        <div className="secSectionHeadRight">
          <div className="secSectionHead">
            <div className="secIconOrange"><LaptopIcon /></div>
            <div>
              <div className="secSectionTitle">Quản lý phiên đăng nhập</div>
              <div className="secSectionSub">Xem và quản lý các phiên đăng nhập trên thiết bị của bạn</div>
            </div>
          </div>
          <button type="button" className="secSessionTopBtn" onClick={logoutAll} disabled={sessions.length === 0}>
            Đăng xuất khỏi tất cả thiết bị
          </button>
        </div>

        <div className="secSessionsList">
          {sessions.length === 0 ? (
            <div className="secEmpty">Không có phiên đăng nhập nào.</div>
          ) : (
            (showAllSessions ? sessions : sessions.slice(0, 8)).map((s) => {
              const isCurrent = s.is_current;
              
              // Simple check for desktop/mobile based on name
              const nameLower = (s.name || "").toLowerCase();
              const isMobile = nameLower.includes("iphone") || nameLower.includes("android") || nameLower.includes("mobile") || nameLower.includes("ipad") || nameLower.includes("e-tech app");
              const Icon = isMobile ? SmartphoneIcon : LaptopIcon;
              
              // Expiration check (24 hours from creation)
              let expired = false;
              if (s.created_at) {
                const diff = Date.now() - Date.parse(s.created_at);
                if (diff > 24 * 60 * 60 * 1000) expired = true;
              }

              return (
                <div key={s.id} className={`secSessionRow ${isCurrent ? "current" : ""}`}>
                  <div className="secSessionRowLeft">
                    <div className="secSessionDeviceIcon">
                      <Icon />
                    </div>
                    <div>
                      <div className="secSessionDeviceName">
                        {formatDeviceName(s.name || "")} {isCurrent && <span className="secSessionCurrentTag">Hiện tại</span>}
                      </div>
                      <div className="secSessionLoc">Không xác định • 192.168.1.1</div>
                    </div>
                  </div>

                  
                  <div className="secSessionTagCol">
                    {!isCurrent && (
                      expired ? (
                        <span className="secSessionStatusTag" style={{ background: '#f1f5f9', color: '#64748b' }}>Đã hết hạn</span>
                      ) : (
                        <span className="secSessionStatusTag">Hoạt động</span>
                      )
                    )}
                  </div>

                  <div className="secSessionTimeCol">
                    <span>Đăng nhập lúc</span>
                    <span>{fmtDateTimeVi(s.created_at)}</span>
                  </div>
                  
                  <div className="secSessionActionCol">
                    {isCurrent ? (
                      <button type="button" className="secSessionMenuBtn"><MenuIcon /></button>
                    ) : (
                      <button type="button" className="secSessionLogoutBtn" onClick={() => revokeSession(s.id)}>Đăng xuất</button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {sessions.length > 8 && (
          <div className="secSessionsMore">
            <button 
              type="button"
              className="secSessionsMoreBtn" 
              onClick={() => setShowAllSessions(!showAllSessions)}
            >
              {showAllSessions ? 'Thu gọn' : `Xem thêm ${sessions.length - 8} phiên đăng nhập khác`} 
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showAllSessions ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"/></svg>
            </button>
          </div>
        )}
      </section>

      {/* DANGER ZONE */}
      <section className="secSectionCard secDangerZone">
        <div className="secSectionHeadRight" style={{ marginBottom: 0 }}>
          <div className="secSectionHead" style={{ marginBottom: 0 }}>
            <div className="secDangerIcon"><WarningIcon /></div>
            <div>
              <div className="secDangerTitle">Khu vực nguy hiểm</div>
              <div className="secSectionSub">Các hành động dưới đây có thể ảnh hưởng đến tài khoản của bạn</div>
            </div>
          </div>
          <button type="button" className="secDangerTopBtn" onClick={() => toast.error("Chức năng sẽ được hoàn thiện ở bản sau.")}>
            Xóa khỏi tài khoản
          </button>
        </div>

        <div className="secDangerList" style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div className="secDangerRow">
            <div className="secDangerRowIcon" style={{ color: '#ef4444', background: '#fef2f2' }}><ShieldCheckIcon /></div>
            <div>
              <div className="secDangerRowTextTitle">Đăng xuất tất cả phiên</div>
              <div className="secDangerRowTextSub">Đăng xuất khỏi tất cả thiết bị ngoại trừ thiết bị hiện tại.</div>
            </div>
          </div>
          <div className="secDangerRow">
            <div className="secDangerRowIcon" style={{ color: '#ef4444', background: '#fef2f2' }}><TrashIcon /></div>
            <div>
              <div className="secDangerRowTextTitle">Xóa tài khoản vĩnh viễn</div>
              <div className="secDangerRowTextSub">Xóa vĩnh viễn tài khoản và tất cả dữ liệu của bạn.</div>
            </div>
          </div>
        </div>
      </section>

      <ConfirmModal
        open={showNotAvailable}
        title="Tính năng này hiện chưa được phát triển"
        message="Chúng tôi đang trong quá trình triển khai nhằm tăng cường bảo mật cho tài khoản. Vui lòng quay lại trong các bản cập nhật sắp tới."
        confirmLabel="Đã hiểu"
        cancelLabel="Đóng"
        onConfirm={() => setShowNotAvailable(false)}
        onCancel={() => setShowNotAvailable(false)}
      />
    </div>
  );
}

function WarningIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 9v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 17h.01"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M10.3 4.2 2.8 18a2 2 0 0 0 1.8 3h14.8a2 2 0 0 0 1.8-3L13.7 4.2a2 2 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 12.2l1.6 1.6 3.6-3.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M18 6 6 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 6l12 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LaptopIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
  );
}

function TrashIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
  );
}

function FingerprintIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 0 0-10 10v2a2 2 0 0 0 4 0v-2a6 6 0 1 1 12 0v8a2 2 0 0 1-4 0v-2"/><path d="M12 9a3 3 0 0 0-3 3v2a2 2 0 0 0 4 0v-2a3 3 0 0 0-1-3z"/></svg>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
  );
}

function SmartphoneIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
  );
}
