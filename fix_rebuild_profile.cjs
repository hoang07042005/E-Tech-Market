const fs = require('fs');

const scriptFile = 'd:/E-Tech-Market/rebuild_profile.cjs';
let content = fs.readFileSync(scriptFile, 'utf8');

content = content.replace(
  'const voucherTabBtnEndStr = `              Kho Voucher\\n            </button>`;',
  'const voucherTabBtnEndStr = `              <SideIconWrap>\\n                <IconTicket />\\n              </SideIconWrap>\\n              Kho Voucher\\n            </button>`;'
);

fs.writeFileSync(scriptFile, content, 'utf8');
console.log('Fixed rebuild script!');
