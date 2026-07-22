import type { Demanda, DemandaInput, Filters } from './types';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    let message = 'Erro na requisição';
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function buildQuery(filters?: Filters): string {
  if (!filters) return '';
  const params = new URLSearchParams();
  if (filters.q.trim()) params.set('q', filters.q.trim());
  if (filters.status.length) params.set('status', filters.status.join(','));
  if (filters.dataDe) params.set('dataDe', filters.dataDe);
  if (filters.dataAte) params.set('dataAte', filters.dataAte);
  if (filters.horasMin !== '') params.set('horasMin', filters.horasMin);
  if (filters.horasMax !== '') params.set('horasMax', filters.horasMax);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  list(filters?: Filters) {
    return request<Demanda[]>(`/api/demandas${buildQuery(filters)}`);
  },
  create(data: DemandaInput) {
    return request<Demanda>('/api/demandas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  update(id: string, data: DemandaInput) {
    return request<Demanda>(`/api/demandas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  move(id: string, status: string, ordem: number) {
    return request<Demanda>(`/api/demandas/${id}/move`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ordem }),
    });
  },
  remove(id: string) {
    return request<void>(`/api/demandas/${id}`, { method: 'DELETE' });
  },
};
