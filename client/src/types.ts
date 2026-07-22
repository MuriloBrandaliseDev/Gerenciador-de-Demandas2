export type Status =
  | 'novo'
  | 'aprovado'
  | 'em_andamento'
  | 'em_testes'
  | 'finalizado';

export interface Demanda {
  id: string;
  titulo: string;
  descricao: string;
  status: Status;
  horasTrabalhadas: number;
  dataReferencia: string;
  ordem: number;
  createdAt: string;
  updatedAt: string;
}

export interface DemandaInput {
  titulo: string;
  descricao: string;
  status: Status;
  horasTrabalhadas: number;
  dataReferencia: string;
}

export interface Filters {
  q: string;
  status: Status[];
  dataDe: string;
  dataAte: string;
  horasMin: string;
  horasMax: string;
}

export const STATUS_ORDER: Status[] = [
  'novo',
  'aprovado',
  'em_andamento',
  'em_testes',
  'finalizado',
];

export const STATUS_LABELS: Record<Status, string> = {
  novo: 'Novo',
  aprovado: 'Aprovado',
  em_andamento: 'Em andamento',
  em_testes: 'Em testes',
  finalizado: 'Finalizado',
};

export const EMPTY_FILTERS: Filters = {
  q: '',
  status: [],
  dataDe: '',
  dataAte: '',
  horasMin: '',
  horasMax: '',
};
