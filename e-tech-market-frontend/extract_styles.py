import re

with open("src/features/pages/admin/dashboard/DashboardPage.tsx", "r", encoding="utf-8") as f:
    content = f.read()

styles = []
counter = 1

def parse_style(style_str):
    props = []
    # Split by comma but ignore commas inside parentheses
    lines = re.split(r',\s*(?![^()]*\))', style_str)
    for line in lines:
        if ':' in line:
            parts = line.split(':', 1)
            key = parts[0].strip().strip("'").strip('"').strip()
            val = parts[1].strip().strip("'").strip('"').strip()
            
            if '`' in val or '$' in val:
                return None # Skip dynamic styles
            
            # camelCase to kebab-case
            kebab_key = re.sub(r'([a-z0-9])([A-Z])', r'\1-\2', key).lower()
            
            # fix camelCase issues for specific ones like WebkitLineClamp
            if kebab_key.startswith('webkit-'):
                kebab_key = '-' + kebab_key
                
            props.append(f"  {kebab_key}: {val};")
    return props

def process_match(m):
    global counter
    tag_content = m.group(0)
    
    style_match = re.search(r'style=\{\{([^}]+)\}\}', tag_content)
    if not style_match:
        return tag_content
        
    style_content = style_match.group(1)
    props = parse_style(style_content)
    if not props:
        return tag_content
        
    class_name = f"adm-dash-style-{counter}"
    counter += 1
    styles.append(f".{class_name} {{\n" + "\n".join(props) + "\n}")
    
    tag_content = tag_content.replace(style_match.group(0), "")
    
    class_match = re.search(r'className="([^"]+)"', tag_content)
    if class_match:
        old_class = class_match.group(1)
        tag_content = tag_content.replace(class_match.group(0), f'className="{old_class} {class_name}"')
    else:
        if tag_content.endswith('/>'):
            tag_content = tag_content[:-2] + f' className="{class_name}" />'
        else:
            tag_content = tag_content[:-1] + f' className="{class_name}">'
            
    return tag_content

new_content = re.sub(r'<[a-zA-Z0-9]+\s+[^>]*?style=\{\{.*?\}\}[^>]*?>', process_match, content, flags=re.DOTALL)

with open("src/features/pages/admin/dashboard/DashboardPage.css", "w", encoding="utf-8") as f:
    f.write("\n\n".join(styles))

if "import './DashboardPage.css'" not in new_content:
    lines = new_content.split('\n')
    last_import = 0
    for i, line in enumerate(lines):
        if line.startswith('import '):
            last_import = i
    lines.insert(last_import + 1, "import './DashboardPage.css'")
    new_content = '\n'.join(lines)

with open("src/features/pages/admin/dashboard/DashboardPage.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)

print(f"Extracted {len(styles)} inline styles.")
