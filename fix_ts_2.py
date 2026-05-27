import re

pdp_path = r'd:\E-Tech-Market\e-tech-market-frontend\src\features\pages\client\products\ProductDetailPage.tsx'
shared_path = r'd:\E-Tech-Market\e-tech-market-frontend\src\features\pages\client\products\components\PdpShared.tsx'
qna_path = r'd:\E-Tech-Market\e-tech-market-frontend\src\features\pages\client\products\components\ProductQnASection.tsx'

# 1. Extract icons to PdpShared
with open(pdp_path, 'r', encoding='utf-8') as f:
    pdp_content = f.read()

icon_plane = re.search(r'function IconPaperPlane.*?\n\)', pdp_content)
if not icon_plane:
    icon_plane = re.search(r'function IconPaperPlane.*?\n?.*?\}', pdp_content)

icon_chat = re.search(r'function IconQnaChatBubble.*?\n\)', pdp_content)
if not icon_chat:
    icon_chat = re.search(r'function IconQnaChatBubble.*?\n?.*?\}', pdp_content)

if icon_plane and icon_chat:
    with open(shared_path, 'a', encoding='utf-8') as f:
        f.write("\nexport " + icon_plane.group(0) + "\n")
        f.write("export " + icon_chat.group(0) + "\n")
    pdp_content = pdp_content.replace(icon_plane.group(0), "")
    pdp_content = pdp_content.replace(icon_chat.group(0), "")

# 2. Fix unused imports in ProductDetailPage.tsx
# Unused: scrollToPdpShopQnaForm, qnaAvatarInitial, avatarInitial, SHOP_REPLY_AVATAR_SRC, Stars, timeAgoVi, IconPaperPlane, IconQnaChatBubble
unused = ['scrollToPdpShopQnaForm,', 'qnaAvatarInitial,', 'avatarInitial,', 'SHOP_REPLY_AVATAR_SRC,', 'Stars,', 'timeAgoVi,', 'SHOP_REPLY_AVATAR_SRC']
for u in unused:
    pdp_content = pdp_content.replace(u, "")
pdp_content = pdp_content.replace("import {  } from './components/PdpShared'\n", "")

with open(pdp_path, 'w', encoding='utf-8') as f:
    f.write(pdp_content)

# 3. Add missing imports to ProductQnASection.tsx
with open(qna_path, 'r', encoding='utf-8') as f:
    qna_content = f.read()

qna_content = qna_content.replace(
    "import { qnaAvatarInitial, timeAgoVi, scrollToPdpShopQnaForm, SHOP_REPLY_AVATAR_SRC } from './PdpShared'",
    "import { qnaAvatarInitial, timeAgoVi, scrollToPdpShopQnaForm, SHOP_REPLY_AVATAR_SRC, resolveImageUrl, IconPaperPlane, IconQnaChatBubble } from './PdpShared'"
)

with open(qna_path, 'w', encoding='utf-8') as f:
    f.write(qna_content)

print("Fixed imports and extracted icons.")
