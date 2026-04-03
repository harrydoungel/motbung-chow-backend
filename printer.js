const escpos = require('escpos');
escpos.USB = require('escpos-usb');

function printOrder(order) {
  try {
    const device = new escpos.USB();
    const printer = new escpos.Printer(device);
    const orderTime = order.createdAt
      ? new Date(order.createdAt).toLocaleString()
      : "";

    device.open(() => {
      printer
        .encode('UTF-8')

        // 🔹 HEADER
        .align('CT')
        .style('B')
        .size(1, 1)
        .text('HyGo')
        .text('Hygiene and fast')
        .text(orderTime)
        .text('------------------------------')

        // 🔹 ORDER INFO
        .align('LT')
        .style('NORMAL')
        .text(`Order ID: ${order.orderId}`)
        .text(`Restaurant: ${order.restaurantName || 'Restaurant'}`)
        .text(`Customer: ${order.customerName || 'Customer'}`)
        .text('')

        // 🔹 TABLE HEADER
        .text('Item    Qty   Price   Amt')
        .text('------------------------------');

      // 🔹 ITEMS
      order.items.forEach(item => {
        const name = item.name.substring(0, 10).padEnd(10);
        const qty = String(item.qty).padEnd(5);
        const price = String(item.price).padEnd(7);
        const amt = String(item.qty * item.price);

        printer.text(`${name} ${qty} ${price} ${amt}`);
      });

      printer
        .text('------------------------------')

        // 🔹 BREAKDOWN
        .text(`Items Total: ₹${order.itemsTotal || 0}`)
        .text(`Platform Fee: ₹${order.platformFee || 0}`)
        .text(`Delivery: ₹${order.deliveryFee || 0}`)
      if (order.tip && order.tip > 0) {
        printer.text(`Tip: ₹${order.tip}`);
      }

      printer
        .text('------------------------------')

        // 🔹 TOTAL
        .style('B')
        .text(`TOTAL: ₹${order.totalAmount}`)

        // 🔹 FOOTER
        .align('CT')
        .text('Thank you!')
        .cut()
        .close();
    });

  } catch (err) {
    console.error("Printer error:", err);
  }
}

module.exports = printOrder;