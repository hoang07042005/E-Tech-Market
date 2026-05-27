import os

pdp_path = r"d:\E-Tech-Market\e-tech-market-frontend\src\features\pages\client\products\ProductDetailPage.tsx"
helpers_path = r"d:\E-Tech-Market\e-tech-market-frontend\src\features\pages\client\products\utils\productHelpers.ts"
components_path = r"d:\E-Tech-Market\e-tech-market-frontend\src\features\pages\client\products\components\PdpGalleryComponents.tsx"
facet_path = r"d:\E-Tech-Market\e-tech-market-frontend\src\features\pages\client\products\components\PdpFacetVariantPicker.tsx"

with open(pdp_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The content to extract starts at line 24 (index 23): "const resolveImageUrl = (url: string | null) => {"
# and ends right before "import { useSearchParams } from 'react-router-dom'" which is around line 420.
start_idx = -1
end_idx = -1

for i, line in enumerate(lines):
    if line.startswith("const resolveImageUrl = "):
        start_idx = i
    if line.startswith("import { useSearchParams }"):
        end_idx = i
        break

if start_idx != -1 and end_idx != -1:
    extracted_lines = lines[start_idx:end_idx]
    
    # Let's create a combined components/helpers file or write them to individual files.
    # It's easier to put them in a single file `pdpShared.tsx` for now to avoid circular dependencies and complex imports.
    shared_path = r"d:\E-Tech-Market\e-tech-market-frontend\src\features\pages\client\products\components\PdpShared.tsx"
    
    shared_content = """import React, { useState, useEffect, useMemo } from 'react'
import { API_BASE_URL } from '@/configs/api.config'
import type { Product, ProductVariant, ProductShopQnaPublic, Video } from '@/features/services/products.service'
import { apiFetch } from '@/configs/api.config'

""" + "".join(extracted_lines)

    # Make things exported
    shared_content = shared_content.replace("const resolveImageUrl =", "export const resolveImageUrl =")
    shared_content = shared_content.replace("function renderVideoPlayer", "export function renderVideoPlayer")
    shared_content = shared_content.replace("async function fetchProductShopQnasPublic", "export async function fetchProductShopQnasPublic")
    shared_content = shared_content.replace("function scrollToPdpShopQnaForm", "export function scrollToPdpShopQnaForm")
    shared_content = shared_content.replace("function qnaAvatarInitial", "export function qnaAvatarInitial")
    shared_content = shared_content.replace("function avatarInitial", "export function avatarInitial")
    shared_content = shared_content.replace("function variantColorLabel", "export function variantColorLabel")
    shared_content = shared_content.replace("function variantStorageLabel", "export function variantStorageLabel")
    shared_content = shared_content.replace("function buildVariantFacetModel", "export function buildVariantFacetModel")
    shared_content = shared_content.replace("type VariantFacetModel = {", "export type VariantFacetModel = {")
    shared_content = shared_content.replace("function PdpThumbStrip", "export function PdpThumbStrip")
    shared_content = shared_content.replace("function PdpFacetVariantPicker", "export function PdpFacetVariantPicker")
    shared_content = shared_content.replace("type ProductMediaItem = ", "export type ProductMediaItem = ")

    with open(shared_path, 'w', encoding='utf-8') as f:
        f.write(shared_content)

    # Now we need to update ProductDetailPage.tsx
    # Add imports at the top
    imports_to_add = """import {
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
} from './components/PdpShared'
"""
    
    # Insert before the extracted block
    new_lines = lines[:start_idx] + [imports_to_add] + lines[end_idx:]
    
    with open(pdp_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print("Successfully extracted shared logic to PdpShared.tsx")
else:
    print("Could not find start or end index.")
