const fs = require('fs');

const tempFile = 'd:/E-Tech-Market/temp_profile.tsx';
const targetFile = 'd:/E-Tech-Market/e-tech-market-frontend/src/features/pages/client/profile/ProfilePage.tsx';

let tempContent = fs.readFileSync(tempFile, 'utf8');
let targetContent = fs.readFileSync(targetFile, 'utf8');

const startStr = '                    {/* Thẻ Thành Viên */}';
const endStr = '                    {/* Thông tin cá nhân */}';

const startIndex = tempContent.indexOf(startStr);
const endIndex = tempContent.indexOf(endStr);
let block = tempContent.substring(startIndex, endIndex);

const targetInsertPoint = targetContent.indexOf('<div className="pfCardBody" style={{ padding: \'20px\', display: \'flex\', flexDirection: \'column\', gap: \'32px\', alignItems: \'center\' }}>');

const chucDangKyIndex = targetContent.indexOf('Chưa đăng ký thẻ hội viên');
const endOfBadReplace = targetContent.lastIndexOf('<div style={{ textAlign: \'center\'', chucDangKyIndex);

// 1. Add cancel button to the block
block = block.replace('                      </section>', `                      </section>
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

// 2. Wrap section in div
block = block.replace('loyaltyData && (', `loyaltyData && (
                        <div style={{ width: '100%', maxWidth: '580px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>`);

const beforeInsert = targetContent.substring(0, targetContent.indexOf('>', targetInsertPoint) + 1) + '\n';
const afterInsert = targetContent.substring(endOfBadReplace);

fs.writeFileSync(targetFile, beforeInsert + block + afterInsert, 'utf8');
console.log('Fixed ProfilePage!');
