import { useState } from 'react';
import { Search, Printer, ExternalLink } from 'lucide-react';
import { API } from '../config';
import { formatBRL } from '../utils/format';

const STATUS_OPTIONS = ['', 'pendente', 'em andamento', 'concluída', 'cancelada'];

const fmtData = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const statusColor: Record<string, string> = {
  'concluída':    'bg-emerald-100 text-emerald-700',
  'em andamento': 'bg-blue-100 text-blue-700',
  'pendente':     'bg-amber-100 text-amber-700',
  'cancelada':    'bg-slate-100 text-slate-500',
};

const hoje = () => new Date().toISOString().slice(0, 10);
const mesInicio = () => {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
};

export const ConsultaEtapasView = () => {
  const [dataInicio, setDataInicio] = useState(mesInicio());
  const [dataFim, setDataFim]       = useState(hoje());
  const [statusFiltro, setStatusFiltro] = useState('');
  const [resultados, setResultados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [buscado, setBuscado]       = useState(false);
  const [erro, setErro]             = useState('');

  const buscar = async () => {
    setErro('');
    setCarregando(true);
    setBuscado(false);
    try {
      const params = new URLSearchParams();
      if (dataInicio) params.append('data_inicio', dataInicio);
      if (dataFim)    params.append('data_fim', dataFim);
      if (statusFiltro) params.append('status', statusFiltro);
      const res = await fetch(`${API}/api/etapas-obra?${params}`);
      if (!res.ok) throw new Error('Erro ao buscar etapas');
      setResultados(await res.json());
      setBuscado(true);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };

  const totalValor = resultados.reduce((acc, e) => acc + parseFloat(e.valor_a_receber || 0), 0);

  const imprimir = () => {
    const params = new URLSearchParams();
    if (dataInicio) params.append('data_inicio', dataInicio);
    if (dataFim)    params.append('data_fim', dataFim);
    if (statusFiltro) params.append('status', statusFiltro);
    window.open(`/relatorio-etapas?${params}`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Consulta de Etapas</h2>
        <p className="text-slate-400 text-sm font-medium mt-1">Busque etapas lançadas por período — independente da obra ou canteiro</p>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200 rounded-[24px] p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Data Início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Data Fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-400" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Status</label>
            <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-400">
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : '— Todos os status —'}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={buscar} disabled={carregando}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black px-4 py-2.5 rounded-2xl text-sm transition-all shadow-lg shadow-blue-100">
              <Search size={16} />
              {carregando ? 'Buscando...' : 'BUSCAR'}
            </button>
          </div>
        </div>
        {erro && <p className="text-red-500 text-xs font-bold mt-3">{erro}</p>}
      </div>

      {/* Resultados */}
      {buscado && (
        <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-800">
                {resultados.length === 0 ? 'Nenhuma etapa encontrada' : `${resultados.length} etapa${resultados.length !== 1 ? 's' : ''} encontrada${resultados.length !== 1 ? 's' : ''}`}
              </h3>
              {resultados.length > 0 && (
                <p className="text-xs font-bold text-slate-400 mt-0.5">
                  Total: <span className="text-emerald-700">{formatBRL(totalValor)}</span>
                </p>
              )}
            </div>
            {resultados.length > 0 && (
              <button onClick={imprimir}
                className="flex items-center gap-2 text-xs font-black text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all">
                <Printer size={14} /> Imprimir / PDF
              </button>
            )}
          </div>

          {resultados.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-bold">
              Nenhuma etapa no período informado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead className="bg-slate-50/80 text-slate-400 uppercase text-[10px] font-black tracking-[2px]">
                  <tr>
                    <th className="px-4 py-4">Data Lanç.</th>
                    <th className="px-4 py-4">Serviço Executado</th>
                    <th className="px-4 py-4">Obra</th>
                    <th className="px-4 py-4 hidden md:table-cell">Canteiro</th>
                    <th className="px-4 py-4">Status</th>
                    <th className="px-4 py-4 hidden sm:table-cell">Dt. Baixa</th>
                    <th className="px-4 py-4 text-right">Valor</th>
                    <th className="px-4 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resultados.map(e => {
                    const val = parseFloat(e.valor_a_receber || 0);
                    const orc = parseFloat(e.tb_obra?.valor_contratado || 0);
                    const pct = orc > 0 ? ((val / orc) * 100).toFixed(1) : null;
                    return (
                      <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-4 text-sm font-bold text-slate-500 whitespace-nowrap">
                          {fmtData(e.data_lancamento)}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-black text-slate-800 text-sm">{e.servico_executado}</p>
                          {e.descricao && <p className="text-[11px] text-slate-400 font-bold">{e.descricao}</p>}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-700 text-sm">{e.tb_obra?.nome || '—'}</p>
                          {e.tb_obra?.responsavel && (
                            <p className="text-[11px] text-slate-400 font-bold">{e.tb_obra.responsavel}</p>
                          )}
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <span className="text-sm font-bold text-slate-500">
                            {e.tb_obra?.tb_canteiro?.nome || <span className="text-slate-300">—</span>}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl whitespace-nowrap ${statusColor[e.status_etapa] || 'bg-slate-100 text-slate-500'}`}>
                            {e.status_etapa}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm font-bold whitespace-nowrap hidden sm:table-cell">
                          {e.data_baixa
                            ? <span className="text-emerald-700">{fmtData(e.data_baixa)}</span>
                            : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <p className="font-black text-emerald-700 text-sm">{formatBRL(val)}</p>
                          {pct && <p className="text-[11px] text-slate-400 font-bold">{pct}% do orç.</p>}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {e.tb_obra?.id && (
                            <button
                              onClick={() => window.open(`/relatorio-executor/${e.tb_obra.id}`, '_blank')}
                              className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                              title={`Relatório executor — ${e.tb_obra.nome}`}
                            >
                              <ExternalLink size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 border-t-2 border-slate-200">
                    <td colSpan={6} className="px-4 py-4 text-right text-xs font-black uppercase tracking-widest text-slate-400">
                      Total {resultados.length} etapa{resultados.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-4 text-right font-black text-emerald-700">{formatBRL(totalValor)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
