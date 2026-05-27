import re

pdp_path = r'd:\E-Tech-Market\e-tech-market-frontend\src\features\pages\client\products\ProductDetailPage.tsx'
qna_component_path = r'd:\E-Tech-Market\e-tech-market-frontend\src\features\pages\client\products\components\ProductQnASection.tsx'

with open(pdp_path, 'r', encoding='utf-8') as f:
    content = f.read()

start_str = '<section className="pdpQnaPageEnd"'
end_str = '{isReviewModalOpen && ('

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    qna_html = content[start_idx:end_idx]
    
    component_content = f"""import React from 'react'
import {{ qnaAvatarInitial, timeAgoVi, scrollToPdpShopQnaForm, SHOP_REPLY_AVATAR_SRC }} from './PdpShared'
import type {{ ProductShopQnaPublic, Product }} from '@/features/services/products.service'
import {{ apiFetch }} from '@/configs/api.config'

type ProductQnASectionProps = {{
  product: Product;
  shopQnas: ProductShopQnaPublic[];
  qaQuestion: string;
  setQaQuestion: (q: string) => void;
  qaGuestName: string;
  setQaGuestName: (n: string) => void;
  qaSending: boolean;
  setQaSending: (s: boolean) => void;
  qaFlash: string | null;
  setQaFlash: (f: string | null) => void;
  qaError: string | null;
  setQaError: (e: string | null) => void;
  buyerLoggedIn: boolean;
  qnaShopOpenById: Record<number, boolean>;
  setQnaShopOpenById: React.Dispatch<React.SetStateAction<Record<number, boolean>>>;
  refreshShopQnas: () => Promise<void>;
}};

export function ProductQnASection({{
  product,
  shopQnas,
  qaQuestion,
  setQaQuestion,
  qaGuestName,
  setQaGuestName,
  qaSending,
  setQaSending,
  qaFlash,
  setQaFlash,
  qaError,
  setQaError,
  buyerLoggedIn,
  qnaShopOpenById,
  setQnaShopOpenById,
  refreshShopQnas
}}: ProductQnASectionProps) {{
  return (
    {qna_html}
  )
}}
"""
    with open(qna_component_path, 'w', encoding='utf-8') as f:
        f.write(component_content)
        
    replacement = """<ProductQnASection 
            product={product}
            shopQnas={shopQnas}
            qaQuestion={qaQuestion}
            setQaQuestion={setQaQuestion}
            qaGuestName={qaGuestName}
            setQaGuestName={setQaGuestName}
            qaSending={qaSending}
            setQaSending={setQaSending}
            qaFlash={qaFlash}
            setQaFlash={setQaFlash}
            qaError={qaError}
            setQaError={setQaError}
            buyerLoggedIn={buyerLoggedIn}
            qnaShopOpenById={qnaShopOpenById}
            setQnaShopOpenById={setQnaShopOpenById}
            refreshShopQnas={refreshShopQnas}
          />\n          """
    
    new_content = content[:start_idx] + replacement + content[end_idx:]
    
    import_match = re.search(r'import \{[\s\S]*?\} from \'./components/ProductReviewsSection\'', new_content)
    if import_match:
        old_import = import_match.group(0)
        new_import = old_import + "\nimport { ProductQnASection } from './components/ProductQnASection'"
        new_content = new_content.replace(old_import, new_import)
    
    with open(pdp_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print("Successfully extracted ProductQnASection")
else:
    print("Could not find start or end index.")
