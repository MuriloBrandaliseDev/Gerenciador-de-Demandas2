import * as XLSX from 'xlsx';
import {
  downloadBlob,
  formatHoras,
  reportFileBase,
  type BuiltReport,
} from './reportData';

function summarySheet(report: BuiltReport): XLSX.WorkSheet {
  const { summary } = report;
  const rows: (string | number)[][] = [
    ['Relatório', summary.modeloTitulo],
    ['Gerado em', summary.geradoEm],
    ['Escopo', summary.escopo === 'filtradas' ? 'Filtros atuais' : 'Todas as demandas'],
    [],
    ['Indicadores'],
    ['Total de demandas', summary.totalDemandas],
    ['Total de horas', Number(summary.totalHoras.toFixed(1))],
    ['Média de horas', Number(summary.mediaHoras.toFixed(1))],
    [],
    ['Filtros aplicados'],
    ...summary.filtrosTexto.map((line) => [line]),
    [],
    ['Resumo por status'],
    ['Status', 'Qtd.', 'Horas'],
    ...summary.porStatus.map((s) => [s.label, s.count, Number(s.horas.toFixed(1))]),
  ];

  if (summary.modelo === 'periodo' || summary.porPeriodo.length) {
    rows.push([]);
    rows.push(['Resumo por data de referência']);
    rows.push(['Data', 'Qtd.', 'Horas']);
    for (const p of summary.porPeriodo) {
      rows.push([p.data, p.count, Number(p.horas.toFixed(1))]);
    }
  }

  return XLSX.utils.aoa_to_sheet(rows);
}

export function exportExcel(report: BuiltReport) {
  const wb = XLSX.utils.book_new();

  const mainData = [report.tableHeaders, ...report.tableBody];
  const mainSheet = XLSX.utils.aoa_to_sheet(mainData);

  const colWidths = report.tableHeaders.map((h, col) => {
    let max = h.length;
    for (const row of report.tableBody) {
      const cell = row[col];
      const len = String(cell ?? '').length;
      if (len > max) max = len;
    }
    return { wch: Math.min(Math.max(max + 2, 10), 48) };
  });
  mainSheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, mainSheet, report.sheetName.slice(0, 31));
  XLSX.utils.book_append_sheet(wb, summarySheet(report), 'Resumo');

  if (report.summary.modelo !== 'status' && report.summary.modelo !== 'periodo') {
    const statusRows = [
      ['Status', 'Qtd. demandas', 'Horas', 'Média'],
      ...report.summary.porStatus.map((s) => [
        s.label,
        s.count,
        Number(s.horas.toFixed(1)),
        s.count ? Number((s.horas / s.count).toFixed(1)) : 0,
      ]),
      [],
      ['TOTAL', report.summary.totalDemandas, Number(report.summary.totalHoras.toFixed(1)), ''],
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(statusRows),
      'Por status'
    );
  }

  const filename = `${reportFileBase(report.summary.modelo)}.xlsx`;
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  downloadBlob(
    new Blob([out], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename
  );

  return {
    filename,
    totalDemandas: report.summary.totalDemandas,
    totalHorasLabel: formatHoras(report.summary.totalHoras),
  };
}
