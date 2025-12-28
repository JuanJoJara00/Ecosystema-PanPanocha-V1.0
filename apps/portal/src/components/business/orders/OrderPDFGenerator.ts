import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export const generateOrderPDF = (order: any, items: any[]) => {
    if (!order) return
    const doc = new jsPDF()

    // Header
    doc.setFontSize(20)
    doc.text('Orden de Compra', 14, 22)

    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`#${order.id.toUpperCase()}`, 14, 28)

    // Info Table
    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text(`Proveedor: ${order.supplier?.name}`, 14, 40)
    doc.text(`Sede: ${order.branch?.name}`, 14, 46)
    doc.text(`Fecha: ${new Date(order.created_at).toLocaleDateString()}`, 14, 52)
    doc.text(`Solicitado por: ${order.requester?.full_name || 'N/A'}`, 14, 58)
    doc.text(`Estado Pago: ${order.payment_status === 'paid' ? 'PAGADO' : 'PENDIENTE'}`, 14, 64)

    // Items Table
    const tableData = items.map(item => [
        item.item?.sku || '-',
        item.item?.name || 'Item desconocido',
        item.quantity,
        item.item?.unit || '-'
    ])

    autoTable(doc, {
        startY: 70,
        head: [['SKU', 'Producto', 'Cantidad', 'Unidad']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [74, 55, 40] } // Brand Brown
    })

    if (order.last_modified_at) {
        doc.setFontSize(8)
        doc.setTextColor(150)
        doc.text(`Modificado por última vez: ${new Date(order.last_modified_at).toLocaleString()} por ${order.modifier?.full_name || 'Desconocido'}`, 14, doc.internal.pageSize.getHeight() - 10)
    }

    doc.save(`orden_${order.id.slice(0, 8)}.pdf`)
}
