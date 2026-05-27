import re

pdp_path = r'd:\E-Tech-Market\e-tech-market-frontend\src\features\pages\client\products\ProductDetailPage.tsx'
shared_path = r'd:\E-Tech-Market\e-tech-market-frontend\src\features\pages\client\products\components\PdpShared.tsx'

with open(pdp_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

content = "".join(lines)

# Find Stars
stars_match = re.search(r'function Stars\s*\(.*?\)[\s\S]*?\n\}', content)
rating_match = re.search(r'function ratingLabel\s*\(.*?\)[\s\S]*?\n\}', content)
time_match = re.search(r'function timeAgoVi\s*\(.*?\)[\s\S]*?\n\}', content)

# Icons
icon_phone = re.search(r'function CommitIconPhoneCheck\s*\(\)[\s\S]*?\n\}', content)
icon_shield = re.search(r'function CommitIconShieldCheck\s*\(\)[\s\S]*?\n\}', content)
icon_price = re.search(r'function CommitIconPriceTag\s*\(\)[\s\S]*?\n\}', content)
icon_cpu = re.search(r'function CommitIconCpu\s*\(\)[\s\S]*?\n\}', content)

functions_to_move = [
    (stars_match, 'Stars'),
    (rating_match, 'ratingLabel'),
    (time_match, 'timeAgoVi'),
    (icon_phone, 'CommitIconPhoneCheck'),
    (icon_shield, 'CommitIconShieldCheck'),
    (icon_price, 'CommitIconPriceTag'),
    (icon_cpu, 'CommitIconCpu')
]

# Write to PdpShared
with open(shared_path, 'a', encoding='utf-8') as f:
    f.write("\n")
    for match, name in functions_to_move:
        if match:
            func_text = match.group(0)
            if func_text.startswith("function"):
                func_text = "export " + func_text
            f.write(func_text + "\n\n")

# Remove from ProductDetailPage
new_content = content
imports_to_add = []
for match, name in functions_to_move:
    if match:
        new_content = new_content.replace(match.group(0), "")
        imports_to_add.append(name)

if imports_to_add:
    # Update import { ... } from './components/PdpShared'
    # We will just append them to the existing import block
    import_shared_match = re.search(r'import \{([\s\S]*?)\} from \'./components/PdpShared\'', new_content)
    if import_shared_match:
        old_import = import_shared_match.group(0)
        inner = import_shared_match.group(1)
        new_inner = inner + ", " + ", ".join(imports_to_add)
        new_import = old_import.replace(inner, new_inner)
        new_content = new_content.replace(old_import, new_import)

with open(pdp_path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Moved functions:", imports_to_add)
