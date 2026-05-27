import re

pdp_path = r"d:\E-Tech-Market\e-tech-market-frontend\src\features\pages\client\products\ProductDetailPage.tsx"
shared_path = r"d:\E-Tech-Market\e-tech-market-frontend\src\features\pages\client\products\components\PdpShared.tsx"

# Fix PdpShared.tsx
with open(shared_path, 'r', encoding='utf-8') as f:
    shared_content = f.read()

shared_content = shared_content.replace("const SHOP_REPLY_AVATAR_SRC =", "export const SHOP_REPLY_AVATAR_SRC =")
shared_content = shared_content.replace("type ProductSpecRow = ", "export type ProductSpecRow = ")
shared_content = shared_content.replace("export type ProductMediaItem = ", "export type ProductMediaItem = ")

with open(shared_path, 'w', encoding='utf-8') as f:
    f.write(shared_content)

# Fix ProductDetailPage.tsx
with open(pdp_path, 'r', encoding='utf-8') as f:
    pdp_content = f.read()

# Fix Video and API_BASE_URL
pdp_content = re.sub(r',\s*type Video', '', pdp_content)
pdp_content = re.sub(r"import { API_BASE_URL } from '@/configs/api\.config'\n", '', pdp_content)

# Fix imports in PdpShared
import_shared_old = """import {
  resolveImageUrl,
  renderVideoPlayer,
  fetchProductShopQnasPublic,
  scrollToPdpShopQnaForm,
  qnaAvatarInitial,
  avatarInitial,
  variantColorLabel,
  variantStorageLabel,
  buildVariantFacetModel,
  VariantFacetModel,
  ProductMediaItem,
  PdpThumbStrip,
  PdpFacetVariantPicker
} from './components/PdpShared'"""

import_shared_new = """import {
  resolveImageUrl,
  renderVideoPlayer,
  fetchProductShopQnasPublic,
  scrollToPdpShopQnaForm,
  qnaAvatarInitial,
  avatarInitial,
  variantColorLabel,
  variantStorageLabel,
  buildVariantFacetModel,
  PdpThumbStrip,
  PdpFacetVariantPicker,
  SHOP_REPLY_AVATAR_SRC
} from './components/PdpShared'
import type { VariantFacetModel, ProductMediaItem, ProductSpecRow } from './components/PdpShared'"""

pdp_content = pdp_content.replace(import_shared_old, import_shared_new)

with open(pdp_path, 'w', encoding='utf-8') as f:
    f.write(pdp_content)

print("Fixed TS errors.")
