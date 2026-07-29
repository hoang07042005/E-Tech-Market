const fs = require('fs');

const file = 'd:/E-Tech-Market/e-tech-market-frontend/src/features/pages/client/profile/ProfilePage.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetPointStr = 'Kho Voucher\\n            </button>';
const targetIndex = content.indexOf(targetPointStr);

if (targetIndex !== -1) {
    const insertIndex = targetIndex + targetPointStr.length;
    
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
            
    content = content.substring(0, insertIndex) + loyaltyBtnStr + content.substring(insertIndex);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Button added successfully.');
} else {
    console.log('Could not find target point.');
}
