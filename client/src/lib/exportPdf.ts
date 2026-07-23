import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  downloadBlob,
  formatHoras,
  reportFileBase,
  type BuiltReport,
} from './reportData';

const BLUE = '#3b82f6';
const MUTED = '#71717a';
const TEXT = '#18181b';

function drawHeader(doc: jsPDF, report: BuiltReport) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(17, 17, 20);
  doc.rect(0, 0, pageW, 28, 'F');
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 28, pageW, 1.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Gerenciador de Demandas', 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(161, 161, 170);
  doc.text(`Relatório · ${report.summary.modeloTitulo}`, 14, 20);
}

function drawSummaryBlock(doc: jsPDF, report: BuiltReport, startY: number): number {
  const { summary } = report;
  let y = startY;

  doc.setTextColor(TEXT);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Resumo executivo', 14, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(MUTED);

  const cards = [
    `Demandas: ${summary.totalDemandas}`,
    `Horas totais: ${formatHoras(summary.totalHoras)}`,
    `Média: ${formatHoras(summary.mediaHoras)}`,
    `Escopo: ${summary.escopo === 'filtradas' ? 'Filtros atuais' : 'Todas'}`,
  ];

  let x = 14;
  for (const card of cards) {
    doc.setDrawColor(226, 226, 230);
    doc.setFillColor(250, 250, 250);
    const w = doc.getTextWidth(card) + 10;
    doc.roundedRect(x, y - 4, w, 8, 1.5, 1.5, 'FD');
    doc.setTextColor(TEXT);
    doc.text(card, x + 5, y + 1.2);
    x += w + 4;
    if (x > 180) {
      x = 14;
      y += 10;
    }
  }
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(TEXT);
  doc.text('Filtros / escopo', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(MUTED);
  for (const line of summary.filtrosTexto) {
    doc.text(`• ${line}`, 14, y);
    y += 4.5;
  }
  y += 2;

  doc.setTextColor(MUTED);
  doc.setFontSize(8);
  doc.text(`Gerado em ${summary.geradoEm}`, 14, y);
  return y + 6;
}

export function exportPdf(report: BuiltReport) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  drawHeader(doc, report);
  let startY = drawSummaryBlock(doc, report, 38);

  // Mini tabela de status no topo (quando o modelo principal não é "status")
  if (report.summary.modelo !== 'status') {
    autoTable(doc, {
      startY,
      head: [['Status', 'Qtd.', 'Horas']],
      body: report.summary.porStatus
        .filter((s) => s.count > 0)
        .map((s) => [s.label, s.count, Number(s.horas.toFixed(1))]),
      theme: 'grid',
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: TEXT as unknown as [number, number, number],
      },
      headStyles: {
        fillColor: [17, 17, 20],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: { fillColor: [248, 248, 250] },
      margin: { left: 14, right: 14 },
      tableWidth: 90,
    });
    const last = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    startY = (last?.finalY ?? startY) + 8;
  }

  autoTable(doc, {
    startY,
    head: [report.tableHeaders],
    body: report.tableBody.map((row) => row.map((cell) => String(cell))),
    theme: 'striped',
    styles: {
      fontSize: 7.5,
      cellPadding: 2.2,
      overflow: 'linebreak',
      valign: 'top',
      textColor: [24, 24, 27],
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14, top: 34, bottom: 16 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        drawHeader(doc, report);
      }
      const pageCount = doc.getNumberOfPages();
      doc.setFontSize(7.5);
      doc.setTextColor(MUTED);
      doc.text(
        `Total: ${report.summary.totalDemandas} demandas · ${formatHoras(report.summary.totalHoras)}`,
        14,
        pageH - 8
      );
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        pageW - 14,
        pageH - 8,
        { align: 'right' }
      );
      doc.setDrawColor(BLUE);
      doc.setLineWidth(0.3);
      doc.line(14, pageH - 12, pageW - 14, pageH - 12);
    },
  });

  const filename = `${reportFileBase(report.summary.modelo)}.pdf`;
  const blob = doc.output('blob');
  downloadBlob(blob, filename);

  return {
    filename,
    totalDemandas: report.summary.totalDemandas,
    totalHorasLabel: formatHoras(report.summary.totalHoras),
  };
}
