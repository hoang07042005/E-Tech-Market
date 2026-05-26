import re

# Fix CSS
with open('src/features/pages/admin/dashboard/DashboardPage.css', 'r', encoding='utf-8') as f:
    css_content = f.read()

# Add px to naked numbers in CSS for properties like padding, margin, width, height, top, left, bottom, right, gap
def fix_css(m):
    key = m.group(1)
    val = m.group(2)
    if re.match(r'^[0-9]+$', val) and key not in ['font-weight', 'z-index', 'flex-shrink', 'opacity']:
        return f"{key}: {val}px;"
    return m.group(0)

css_content = re.sub(r'([a-z-]+):\s*([^;]+);', fix_css, css_content)

with open('src/features/pages/admin/dashboard/DashboardPage.css', 'w', encoding='utf-8') as f:
    f.write(css_content)

# Fix TSX
with open('src/features/pages/admin/dashboard/DashboardPage.tsx', 'r', encoding='utf-8') as f:
    tsx_content = f.read()

tsx_content = tsx_content.replace(
    'className="admSkeletonBar adm-dash-style-75"  />',
    'className="admSkeletonBar" style={{ width: i % 2 === 0 ? \'70%\' : \'90%\' }} />'
)

with open('src/features/pages/admin/dashboard/DashboardPage.tsx', 'w', encoding='utf-8') as f:
    f.write(tsx_content)

print("Fixed CSS and TSX")
