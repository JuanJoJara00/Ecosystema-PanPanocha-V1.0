import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { Calculator } from '../../../../../../packages/shared-logic/src'

interface ProductToExport {
    name: string;
    category: string;
    price: number;
}

export const CatalogExportService = {
    generatePDF: (channelName: string, products: ProductToExport[]) => {
        const doc = new jsPDF()

        // Brand Header (Mockup of branding)
        doc.setFillColor(212, 163, 115) // Pan Panocha Gold
        doc.rect(0, 0, 210, 40, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(24)
        doc.setFont('helvetica', 'bold')
        doc.text('PAN PANOCHA', 105, 18, { align: 'center' })

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        doc.text(`CATÁLOGO DE PRECIOS - CANAL: ${channelName.toUpperCase()}`, 105, 28, { align: 'center' })

        // Date 
        doc.setTextColor(150, 150, 150)
        doc.setFontSize(8)
        doc.text(`Generado el: ${new Date().toLocaleDateString('es-CO')}`, 105, 35, { align: 'center' })

        // Table
        const tableData = products.map(p => [
            p.category.toUpperCase(),
            p.name,
            Calculator.formatCurrency(p.price)
        ])

            ; (doc as any).autoTable({
                startY: 50,
                head: [['CATEGORÍA', 'PRODUCTO', 'PRECIO']],
                body: tableData,
                theme: 'striped',
                headStyles: {
                    fillColor: [60, 60, 60],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: {
                    0: { cellWidth: 40 },
                    2: { halign: 'right', fontStyle: 'bold' }
                },
                styles: {
                    fontSize: 9,
                    cellPadding: 4
                },
                margin: { top: 50 }
            })

        // Footer
        const pageCount = (doc as any).internal.getNumberOfPages()
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i)
            doc.setFontSize(8)
            doc.setTextColor(180, 180, 180)
            doc.text(`Página ${i} de ${pageCount}`, 200, 285, { align: 'right' })
        }

        doc.save(`Catalogo_PanPanocha_${channelName.replace(/\s+/g, '_')}.pdf`)
    },

    exportToCSV: (products: any[], channelName: string) => {
        const headers = ['Nombre', 'Categoría', 'Precio Base', 'Precio Venta', 'Estado']
        const rows = products.map(p => [
            p.name,
            p.category,
            p.base_price,
            p.current_price,
            p.is_active_in_channel ? 'Activo' : 'Inactivo'
        ])

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `Catalogo_${channelName.replace(/\s+/g, '_')}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }
}
