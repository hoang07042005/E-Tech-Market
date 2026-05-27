import re

pdp_path = r'd:\E-Tech-Market\e-tech-market-frontend\src\features\pages\client\products\ProductDetailPage.tsx'
reviews_component_path = r'd:\E-Tech-Market\e-tech-market-frontend\src\features\pages\client\products\components\ProductReviewsSection.tsx'

with open(pdp_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Try to find the pdpReviewsSection
# It starts with <section className="pdpReviewsSection" and ends right before <section className="pdpQnaPageEnd"
start_str = '<section className="pdpReviewsSection"'
end_str = '<section className="pdpQnaPageEnd"'

start_idx = content.find(start_str)
end_idx = content.find(end_str)

if start_idx != -1 and end_idx != -1:
    reviews_html = content[start_idx:end_idx]
    
    # We will create the ProductReviewsSection component
    component_content = f"""import {{ Stars, ratingLabel, timeAgoVi, resolveImageUrl, avatarInitial }} from './PdpShared'
import type {{ ProductReview, Product }} from '@/features/services/products.service'

type ProductReviewsSectionProps = {{
  product: Product;
  reviewStats: any;
  filteredReviews: ProductReview[];
  reviewFilter: string;
  setReviewFilter: (filter: 'all' | 'with_images' | 'verified' | 'star_5' | 'star_4' | 'star_3' | 'star_2' | 'star_1') => void;
  setIsReviewModalOpen: (open: boolean) => void;
}};

export function ProductReviewsSection({{
  product,
  reviewStats,
  filteredReviews,
  reviewFilter,
  setReviewFilter,
  setIsReviewModalOpen
}}: ProductReviewsSectionProps) {{
  return (
    {reviews_html}
  )
}}
"""
    with open(reviews_component_path, 'w', encoding='utf-8') as f:
        f.write(component_content)
        
    # Replace in ProductDetailPage.tsx
    replacement = """<ProductReviewsSection 
            product={product}
            reviewStats={reviewStats}
            filteredReviews={filteredReviews}
            reviewFilter={reviewFilter as any}
            setReviewFilter={setReviewFilter as any}
            setIsReviewModalOpen={setIsReviewModalOpen}
          />\n          """
    
    new_content = content[:start_idx] + replacement + content[end_idx:]
    
    # Add import ProductReviewsSection
    import_match = re.search(r'import \{[\s\S]*?\} from \'./components/PdpShared\'', new_content)
    if import_match:
        old_import = import_match.group(0)
        new_import = old_import + "\nimport { ProductReviewsSection } from './components/ProductReviewsSection'"
        new_content = new_content.replace(old_import, new_import)
    
    with open(pdp_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
        
    print("Successfully extracted ProductReviewsSection")
else:
    print("Could not find start or end index.")
