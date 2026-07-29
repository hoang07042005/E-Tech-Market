const fs = require('fs');
const file = 'd:/E-Tech-Market/e-tech-market-frontend/src/features/pages/client/profile/ProfilePage.tsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = '                    {/* Thẻ Thành Viên */}';
const endStr = '                    {/* Thông tin cá nhân */}';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex === -1 || endIndex === -1) {
  console.log('Could not find block', startIndex, endIndex);
  process.exit(1);
}

const blockToMove = content.substring(startIndex, endIndex);
content = content.substring(0, startIndex) + content.substring(endIndex);

const insertionPointStr = '            {/* ── Dashboard 2 cột (chỉ hiện khi tab profile) ── */}';
const insertionIndex = content.indexOf(insertionPointStr);

if (insertionIndex === -1) {
  console.log('Could not find insertion point');
  process.exit(1);
}

const newBlock = `            {/* ── Thẻ hội viên (chỉ hiện khi tab loyalty) ── */}
            {tab === "loyalty" &&
              !ordersRoute &&
              !notifsRoute &&
              !securityRoute &&
              !couponsRoute && (
                <section className="pfCard" aria-label="Thẻ hội viên">
                  <div className="pfCardHead">
                    <h2 className="pfCardTitle">Thẻ Hội Viên / Điểm Thưởng</h2>
                  </div>
                  <div className="pfCardBody" style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
` + blockToMove + `                  </div>
                </section>
              )}

`;

content = content.substring(0, insertionIndex) + newBlock + content.substring(insertionIndex);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully moved the loyalty card block to loyalty tab!');
