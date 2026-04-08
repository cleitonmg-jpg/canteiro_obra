export type ObraFiltroStatus =
  | 'EXECUÇÃO'
  | 'ATIVAS'
  | 'LICITAÇÃO'
  | 'FUNDAÇÃO'
  | 'ACABAMENTO'
  | 'FINALIZADA'
  | 'TODAS';

export const DEFAULT_OBRA_FILTRO_STATUS: ObraFiltroStatus = 'EXECUÇÃO';

export const OBRA_FILTRO_STATUS_OPTIONS: Array<{ value: ObraFiltroStatus; label: string }> = [
  { value: 'EXECUÇÃO', label: 'Em execução (padrão)' },
  { value: 'ATIVAS', label: 'Ativas (exceto finalizadas)' },
  { value: 'LICITAÇÃO', label: 'Licitação' },
  { value: 'FUNDAÇÃO', label: 'Fundação / início' },
  { value: 'ACABAMENTO', label: 'Acabamento' },
  { value: 'FINALIZADA', label: 'Finalizadas' },
  { value: 'TODAS', label: 'Todas' },
];

export const normalizeObraStatus = (status?: string) =>
  String(status || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const matchesObraFiltroStatus = (status: string | undefined, filtro: ObraFiltroStatus) => {
  if (filtro === 'TODAS') return true;

  const st = normalizeObraStatus(status);
  if (!st) return false;

  if (filtro === 'ATIVAS') return st !== 'FINALIZADA';
  if (filtro === 'FINALIZADA') return st === 'FINALIZADA';

  if (filtro === 'EXECUÇÃO') return st === 'EXECUCAO' || st === 'ATIVA';

  const ft = normalizeObraStatus(filtro);
  return st === ft;
};

export const obraFiltroLabel = (filtro: ObraFiltroStatus) => {
  const opt = OBRA_FILTRO_STATUS_OPTIONS.find(o => o.value === filtro);
  return opt?.label || filtro;
};

