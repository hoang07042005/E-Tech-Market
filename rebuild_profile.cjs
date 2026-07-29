const fs = require('fs');

const file = 'd:/E-Tech-Market/e-tech-market-frontend/src/features/pages/client/profile/ProfilePage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Loyalty Tab Button
const voucherTabBtnEndStr = `              Kho Voucher
            </button>`;
const loyaltyBtnStr = `
            <button
              type="button"
              className={
                activeTab === "loyalty" ? "pfNavBtn pfNavBtnActive" : "pfNavBtn"
              }
              onClick={() => {
                setTab("loyalty");
                navigate("/profile");
              }}
            >
              <SideIconWrap>
                <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style={{ color: '#f59e0b' }}>
                  <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
                </svg>
              </SideIconWrap>
              Thẻ hội viên
            </button>`;
content = content.replace(voucherTabBtnEndStr, voucherTabBtnEndStr + loyaltyBtnStr);

// 2. Extract Loyalty Block
const startBlock = '                    {/* Thẻ Thành Viên */}';
const endBlock = '                    {/* Thông tin cá nhân */}';
const startIndex = content.indexOf(startBlock);
const endIndex = content.indexOf(endBlock);

if (startIndex === -1 || endIndex === -1) {
  console.log('Error: Could not find original loyalty block');
  process.exit(1);
}

let loyaltyBlock = content.substring(startIndex, endIndex);

// Remove the block from its original place
content = content.substring(0, startIndex) + content.substring(endIndex);

// 3. Modify Loyalty Block
// Wrap the <section> inside the if true branch in a div and add the cancel button
loyaltyBlock = loyaltyBlock.replace('loyaltyData && (', `loyaltyData && (
                        <div style={{ width: '100%', maxWidth: '580px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>`);

loyaltyBlock = loyaltyBlock.replace('                      </section>', `                      </section>
                      <button
                        onClick={async () => {
                          if (window.confirm('Bạn có chắc chắn muốn hủy thẻ hội viên? Toàn bộ điểm tích lũy và đặc quyền có thể sẽ bị ảnh hưởng.')) {
                            try {
                              const { cancelLoyaltyCard } = await import('@/features/services/auth.service');
                              await cancelLoyaltyCard();
                              window.location.reload();
                            } catch (error: any) {
                              alert('Lỗi: ' + error.message);
                            }
                          }
                        }}
                        style={{
                          marginTop: '20px',
                          background: 'transparent',
                          color: '#ef4444',
                          border: '1px solid #ef4444',
                          padding: '8px 24px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          alignSelf: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fee2e2';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        Hủy thẻ hội viên
                      </button>
                      </div>`);

// Replace the closing of the loyaltyBlock to add Point History
const closingStr = `                      </div>
                    )}`;
const pointHistoryStr = `                      </div>
                    )}

                    {me?.is_loyalty_member && loyaltyData?.point_history && loyaltyData.point_history.length > 0 && (
                      <div style={{ width: '100%', maxWidth: '800px', marginTop: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '16px', paddingLeft: '8px', borderLeft: '4px solid #f59e0b' }}>Lịch sử điểm thưởng</h3>
                        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '15px' }}>
                            <thead style={{ background: '#f8fafc' }}>
                              <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Thời gian</th>
                                <th style={{ padding: '12px 16px', fontWeight: '600' }}>Nội dung</th>
                                <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right' }}>Thay đổi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {loyaltyData.point_history.map((history: any) => (
                                <tr key={history.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '16px', color: '#475569', whiteSpace: 'nowrap' }}>
                                    {new Date(history.created_at).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                  <td style={{ padding: '16px', color: '#1e293b' }}>
                                    {history.description || (history.action_type === 'earn' ? 'Tích lũy điểm' : 'Tiêu điểm')}
                                  </td>
                                  <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', color: history.points_changed > 0 ? '#10b981' : '#ef4444' }}>
                                    {history.points_changed > 0 ? '+' : ''}{history.points_changed}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}`;
loyaltyBlock = loyaltyBlock.replace(closingStr, pointHistoryStr);

// 4. Inject the new loyalty tab branch
const insertPoint = `            {/* ── Dashboard 2 cột (chỉ hiện khi tab profile) ── */}`;
const newTabStr = `            {/* ── Thẻ hội viên (chỉ hiện khi tab loyalty) ── */}
            {tab === "loyalty" &&
              !ordersRoute &&
              !notifsRoute &&
              !securityRoute &&
              !couponsRoute && (
                <section className="pfCard" aria-label="Thẻ hội viên">
                  <div className="pfCardHead">
                    <h2 className="pfCardTitle">Thẻ Hội Viên / Điểm Thưởng</h2>
                  </div>
                  <div className="pfCardBody" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '32px', alignItems: 'center' }}>
` + loyaltyBlock + `                  </div>
                </section>
              )}

`;
content = content.replace(insertPoint, newTabStr + insertPoint);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully completely rebuilt ProfilePage!');
