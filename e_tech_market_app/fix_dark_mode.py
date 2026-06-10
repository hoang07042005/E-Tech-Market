import re

# Fix order_list_screen.dart
with open(r"d:/E-Tech-Market/e_tech_market_app/lib/screens/orders/order_list_screen.dart", "r", encoding="utf-8", errors="ignore") as f:
    c = f.read()
f.close()

# Fix AppBar
c = c.replace("backgroundColor: Colors.white,", "backgroundColor: Theme.of(context).colorScheme.surface,")
c = c.replace("foregroundColor: Colors.black,", "foregroundColor: Theme.of(context).colorScheme.onSurface,")
c = c.replace("foregroundColor: Colors.grey,", "foregroundColor: Theme.of(context).colorScheme.onSurface,")

# Fix body Container
c = c.replace("color: const Color(0xFFFFFFFF),", "color: Theme.of(context).colorScheme.surface,")
c = c.replace("color: const Color(0xFFF8F9FA),", "color: Theme.of(context).colorScheme.surface,")

# Fix search bar and status chips
c = c.replace("decoration: BoxDecoration(color: Colors.white,", "decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest,")

# Fix text colors
c = c.replace("style: TextStyle(color: Colors.grey.shade600,", "style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),")
c = c.replace("style: TextStyle(color: Colors.grey.shade800,", "style: TextStyle(color: Theme.of(context).colorScheme.onSurface,")
c = c.replace("style: TextStyle(color: Colors.grey.shade500,", "style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),")

# Fix icons
c = c.replace("color: Colors.grey.shade300,", "color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.3),")

# Fix border
c = c.replace("color: Colors.grey.shade200,", "color: Theme.of(context).colorScheme.outlineVariant,")

with open(r"d:/E-Tech-Market/e_tech_market_app/lib/screens/orders/order_list_screen.dart", "w", encoding="utf-8") as f:
    f.write(c)
print("order_list_screen fixed")
