var fs = require("fs");
var c = fs.readFileSync("e-tech-market-backend/app/Services/PaymentService.php", "utf8");

// Add recalculateOrderTotal call in createVnpayPaymentUrl
c = c.replace(
  "$payment = $this->findOrCreatePayment($order, \x27vnpay\x27);", 
  "$order = $this->recalculateOrderTotal($order);\n        $payment = $this->findOrCreatePayment($order, \x27vnpay\x27);"
);

// Add recalculateOrderTotal call in createMomoPaymentUrl  
c = c.replace(
  "$payment = $this->findOrCreatePayment($order, \x27momo\x27);",
  "$order = $this->recalculateOrderTotal($order);\n        $payment = $this->findOrCreatePayment($order, \x27momo\x27);"
);

// Add function recalculateOrderTotal before settlePayment
var insertPoint = "private function settlePayment";
var newFunc = "private function recalculateOrderTotal(Order $order): Order\n    {\n        $order->load([\"items\"]);\n        $subtotal = 0;\n        foreach ($order->items as $item) {\n            $subtotal += (float)$item->unit_price * (int)$item->quantity;\n        }\n        $order->subtotal_amount = $subtotal;\n        $order->total_amount = max(0, $subtotal - ($order->discount_amount ?? 0) + ($order->shipping_fee ?? 0));\n        $order->save();\n        return $order;\n    }\n\n    " + insertPoint;

c = c.replace(insertPoint, newFunc);

fs.writeFileSync("e-tech-market-backend/app/Services/PaymentService.php", c);
console.log("Done");
