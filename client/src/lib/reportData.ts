import type { Demanda, Filters, Status } from '../types';
import { EMPTY_FILTERS, STATUS_LABELS, STATUS_ORDER } from '../types';

export type ReportModelId =
  | 'completo'
  | 'horas'
  | 'status'
  | 'periodo'
  | 'pendencias';

export interface ReportModelMeta {
  id: ReportModelId;
  title: string;
  description: string;
}

export const REPORT_MODELS: ReportModelMeta[] = [
  {
    id: 'completo',
    title: 'Lista completa',
    description: 'Todas as demandas com status, horas, datas, anexos e descrição.',
  },
  {
    id: 'horas',
    title: 'Horas trabalhadas',
    description: 'Ranking por horas, total geral e média por demanda.',
  },
  {
    id: 'status',
    title: 'Por status',
    description: 'Contagem e soma de horas em cada coluna do Kanban.',
  },
  {
    id: 'periodo',
    title: 'Por período',
    description: 'Agrupamento por data de referência com subtotais diários.',
  },
  {
    id: 'pendencias',
    title: 'Pendências',
    description: 'Demandas abertas (exceto Finalizado) com horas acumuladas.',
  },
];

export interface ReportRow {
  titulo: string;
  status: string;
  statusId: Status;
  horas: number;
  dataReferencia: string;
  dataReferenciaRaw: string;
  anexos: number;
  criadaEm: string;
  atualizadaEm: string;
  descricao: string;
}

export interface StatusSummary {
  status: Status;
  label: string;
  count: number;
  horas: number;
}

export interface PeriodSummary {
  data: string;
  dataRaw: string;
  count: number;
  horas: number;
}

export interface ReportSummary {
  totalDemandas: number;
  totalHoras: number;
  mediaHoras: number;
  porStatus: StatusSummary[];
  porPeriodo: PeriodSummary[];
  geradoEm: string;
  filtrosTexto: string[];
  escopo: 'filtradas' | 'todas';
  modelo: ReportModelId;
  modeloTitulo: string;
}

export interface BuiltReport {
  rows: ReportRow[];
  summary: ReportSummary;
  tableHeaders: string[];
  tableBody: (string | number)[][];
  sheetName: string;
}

function stripHtml(html: string): string {
  if (!html) return '';
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n');
  const tmp = document.createElement('div');
  tmp.innerHTML = withBreaks;
  return (tmp.textContent || tmp.innerText || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function formatDateBr(isoOrYmd: string): string {
  if (!isoOrYmd) return '—';
  const ymd = isoOrYmd.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  try {
    return new Date(isoOrYmd).toLocaleString('pt-BR');
  } catch {
    return isoOrYmd;
  }
}

export function formatDateTimeBr(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export function formatHoras(n: number): string {
  return `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;
}

export function describeFilters(filters: Filters): string[] {
  const lines: string[] = [];
  if (filters.q.trim()) lines.push(`Busca: "${filters.q.trim()}"`);
  if (filters.status.length) {
    lines.push(`Status: ${filters.status.map((s) => STATUS_LABELS[s]).join(', ')}`);
  }
  if (filters.dataDe) lines.push(`Data de: ${formatDateBr(filters.dataDe)}`);
  if (filters.dataAte) lines.push(`Data até: ${formatDateBr(filters.dataAte)}`);
  if (filters.horasMin !== '') lines.push(`Horas mín.: ${filters.horasMin}`);
  if (filters.horasMax !== '') lines.push(`Horas máx.: ${filters.horasMax}`);
  if (!lines.length) lines.push('Nenhum filtro aplicado');
  return lines;
}

export function toReportRows(demandas: Demanda[]): ReportRow[] {
  return demandas.map((d) => ({
    titulo: d.titulo,
    status: STATUS_LABELS[d.status] ?? d.status,
    statusId: d.status,
    horas: Number(d.horasTrabalhadas) || 0,
    dataReferencia: formatDateBr(d.dataReferencia),
    dataReferenciaRaw: d.dataReferencia?.slice(0, 10) || '',
    anexos: d.anexosCount ?? 0,
    criadaEm: formatDateTimeBr(d.createdAt),
    atualizadaEm: formatDateTimeBr(d.updatedAt),
    descricao: stripHtml(d.descricao || ''),
  }));
}

function buildStatusSummary(rows: ReportRow[]): StatusSummary[] {
  const map = new Map<Status, StatusSummary>();
  for (const status of STATUS_ORDER) {
    map.set(status, {
      status,
      label: STATUS_LABELS[status],
      count: 0,
      horas: 0,
    });
  }
  for (const row of rows) {
    const item = map.get(row.statusId);
    if (!item) continue;
    item.count += 1;
    item.horas += row.horas;
  }
  return STATUS_ORDER.map((s) => map.get(s)!);
}

function buildPeriodSummary(rows: ReportRow[]): PeriodSummary[] {
  const map = new Map<string, PeriodSummary>();
  for (const row of rows) {
    const key = row.dataReferenciaRaw || 'sem-data';
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
      existing.horas += row.horas;
    } else {
      map.set(key, {
        dataRaw: key,
        data: key === 'sem-data' ? 'Sem data' : formatDateBr(key),
        count: 1,
        horas: row.horas,
      });
    }
  }
  return [...map.values()].sort((a, b) => a.dataRaw.localeCompare(b.dataRaw));
}

function applyPeriodFilter(demandas: Demanda[], dataDe: string, dataAte: string): Demanda[] {
  return demandas.filter((d) => {
    const ref = d.dataReferencia?.slice(0, 10) || '';
    if (dataDe && ref < dataDe) return false;
    if (dataAte && ref > dataAte) return false;
    return true;
  });
}

function applyModelFilter(demandas: Demanda[], model: ReportModelId): Demanda[] {
  if (model === 'pendencias') {
    return demandas.filter((d) => d.status !== 'finalizado');
  }
  return demandas;
}

export function buildReport(options: {
  demandas: Demanda[];
  model: ReportModelId;
  filters: Filters;
  escopo: 'filtradas' | 'todas';
  periodoDe?: string;
  periodoAte?: string;
}): BuiltReport {
  const { model, filters, escopo } = options;
  const meta = REPORT_MODELS.find((m) => m.id === model)!;

  let source = [...options.demandas];
  source = applyPeriodFilter(source, options.periodoDe || '', options.periodoAte || '');
  source = applyModelFilter(source, model);

  let rows = toReportRows(source);

  if (model === 'horas') {
    rows = [...rows].sort((a, b) => b.horas - a.horas || a.titulo.localeCompare(b.titulo));
  } else if (model === 'periodo') {
    rows = [...rows].sort(
      (a, b) =>
        a.dataReferenciaRaw.localeCompare(b.dataReferenciaRaw) ||
        a.titulo.localeCompare(b.titulo)
    );
  } else if (model === 'status') {
    rows = [...rows].sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.statusId) - STATUS_ORDER.indexOf(b.statusId) ||
        a.titulo.localeCompare(b.titulo)
    );
  } else {
    rows = [...rows].sort((a, b) => a.titulo.localeCompare(b.titulo));
  }

  const totalHoras = rows.reduce((sum, r) => sum + r.horas, 0);
  const porStatus = buildStatusSummary(rows);
  const porPeriodo = buildPeriodSummary(rows);

  const filtrosTexto = [
    ...describeFilters(escopo === 'filtradas' ? filters : EMPTY_FILTERS),
  ];
  if (options.periodoDe || options.periodoAte) {
    filtrosTexto.push(
      `Período do relatório: ${
        options.periodoDe ? formatDateBr(options.periodoDe) : '…'
      } — ${options.periodoAte ? formatDateBr(options.periodoAte) : '…'}`
    );
  }

  const summary: ReportSummary = {
    totalDemandas: rows.length,
    totalHoras,
    mediaHoras: rows.length ? totalHoras / rows.length : 0,
    porStatus,
    porPeriodo,
    geradoEm: new Date().toLocaleString('pt-BR'),
    filtrosTexto,
    escopo,
    modelo: model,
    modeloTitulo: meta.title,
  };

  if (model === 'status') {
    return {
      rows,
      summary,
      sheetName: 'Por status',
      tableHeaders: ['Status', 'Qtd. demandas', 'Horas', '% do total (hrs)'],
      tableBody: porStatus.map((s) => [
        s.label,
        s.count,
        Number(s.horas.toFixed(1)),
        totalHoras
          ? `${((s.horas / totalHoras) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
          : '0%',
      ]),
    };
  }

  if (model === 'periodo') {
    return {
      rows,
      summary,
      sheetName: 'Por período',
      tableHeaders: ['Data', 'Qtd. demandas', 'Horas', 'Média/dia'],
      tableBody: porPeriodo.map((p) => [
        p.data,
        p.count,
        Number(p.horas.toFixed(1)),
        Number((p.horas / p.count).toFixed(1)),
      ]),
    };
  }

  if (model === 'horas') {
    return {
      rows,
      summary,
      sheetName: 'Horas',
      tableHeaders: ['#', 'Título', 'Status', 'Horas', 'Data ref.', '% do total'],
      tableBody: rows.map((r, i) => [
        i + 1,
        r.titulo,
        r.status,
        Number(r.horas.toFixed(1)),
        r.dataReferencia,
        totalHoras
          ? `${((r.horas / totalHoras) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
          : '0%',
      ]),
    };
  }

  if (model === 'pendencias') {
    return {
      rows,
      summary,
      sheetName: 'Pendências',
      tableHeaders: ['Título', 'Status', 'Horas', 'Data ref.', 'Atualizada em', 'Anexos'],
      tableBody: rows.map((r) => [
        r.titulo,
        r.status,
        Number(r.horas.toFixed(1)),
        r.dataReferencia,
        r.atualizadaEm,
        r.anexos,
      ]),
    };
  }

  return {
    rows,
    summary,
    sheetName: 'Demandas',
    tableHeaders: [
      'Título',
      'Status',
      'Horas',
      'Data ref.',
      'Anexos',
      'Criada em',
      'Atualizada em',
      'Descrição',
    ],
    tableBody: rows.map((r) => [
      r.titulo,
      r.status,
      Number(r.horas.toFixed(1)),
      r.dataReferencia,
      r.anexos,
      r.criadaEm,
      r.atualizadaEm,
      r.descricao,
    ]),
  };
}

export function reportFileBase(model: ReportModelId): string {
  const day = new Date().toISOString().slice(0, 10);
  return `relatorio-${model}-${day}`;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
