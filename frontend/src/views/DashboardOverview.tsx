import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Calculator, Construction, HardHat, TrendingDown, TrendingUp, X } from 'lucide-react';
import { API } from '../config';

const fmtBRL = (value: number) => {
  const num = Number(value || 0);
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const isObraAtiva = (status?: string) => String(status || '').toUpperCase() !== 'FINALIZADA';

const isSameLocalDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const StatCard = ({ icon: Icon, label, value, color, onClick, hint }: any) => {
  const colorClasses: any = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-slate-50 text-slate-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  const clickable = typeof onClick === 'function';
  const Comp: any = clickable ? 'button' : 'div';

  return (
    <Comp
      onClick={onClick}
      className={`bg-white p-5 md:p-6 rounded-[28px] border border-slate-200 shadow-sm transition-all hover:shadow-xl hover:shadow-slate-100 ${
        clickable ? 'text-left cursor-pointer hover:border-blue-300' : ''
      }`}
    >
      <div className={`p-3 rounded-2xl w-fit mb-4 transition-transform ${colorClasses[color]}`}>
        <Icon size={22} />
      </div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <h4 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter leading-none">{value}</h4>
      {hint && <p className="text-[11px] text-slate-400 font-bold mt-2">{hint}</p>}
    </Comp>
  );
};

const ModalShell = ({ title, open, onClose, children }: any) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <button type="button" aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-slate-900/40" />
      <div className="relative bg-white w-full md:w-[900px] max-h-[85vh] overflow-hidden rounded-t-3xl md:rounded-3xl border border-slate-200 shadow-2xl">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-800">{title}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-900">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-auto max-h-[calc(85vh-64px)]">{children}</div>
      </div>
    </div>
  );
};

export const DashboardOverview = ({ userName }: any) => {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [obras, setObras] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [modal, setModal] = useState<'obras' | 'demandas' | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErro('');
      try {
        const [obrasRes, lancRes] = await Promise.all([fetch(`${API}/api/obras`), fetch(`${API}/api/lancamentos`)]);
        if (!obrasRes.ok) throw new Error('Falha ao carregar obras');
        if (!lancRes.ok) throw new Error('Falha ao carregar lançamentos');
        setObras(await obrasRes.json());
        setLancamentos(await lancRes.json());
      } catch (e: any) {
        setErro(e?.message || 'Erro ao carregar dados do dashboard.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const obrasAtivas = useMemo(() => obras.filter(o => isObraAtiva(o.status)), [obras]);
  const obrasExecucao = useMemo(() => obrasAtivas.filter(o => String(o.status || '').toUpperCase().includes('EXEC')), [obrasAtivas]);

  const orcamentoAtivo = useMemo(() => obrasAtivas.reduce((acc, o) => acc + Number(o.valor_contratado || 0), 0), [obrasAtivas]);
  const gastosAtivos = useMemo(() => obrasAtivas.reduce((acc, o) => acc + Number(o.gastos || 0), 0), [obrasAtivas]);
  const lucroPrevisto = useMemo(() => orcamentoAtivo - gastosAtivos, [orcamentoAtivo, gastosAtivos]);

  const demandasHoje = useMemo(() => {
    const hoje = new Date();
    const obraAtivaIds = new Set(obrasAtivas.map(o => o.id));
    return lancamentos.filter(l => {
      const d = l?.data_movimentacao ? new Date(l.data_movimentacao) : null;
      if (!d) return false;
      if (!isSameLocalDay(d, hoje)) return false;
      if (l?.id_obra && !obraAtivaIds.has(l.id_obra)) return false;
      return true;
    });
  }, [lancamentos, obrasAtivas]);

  const demandasHojeQtd = useMemo(() => demandasHoje.reduce((acc, l) => acc + Number(l.quantidade || 0), 0), [demandasHoje]);
  const demandasHojeTotal = useMemo(() => demandasHoje.reduce((acc, l) => acc + Number(l.total_calculado || 0), 0), [demandasHoje]);

  const obrasTable = useMemo(() => obrasAtivas.slice(0, 6), [obrasAtivas]);

  return (
    <div className="space-y-8">
      <section className="bg-gradient-to-br from-blue-700 to-blue-500 rounded-3xl p-5 md:p-6 text-white relative overflow-hidden shadow-lg shadow-blue-100 flex items-center justify-between">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">Status: Online</div>
            <h2 className="text-xl md:text-2xl font-black tracking-tighter">Painel de Controle</h2>
          </div>
          <p className="text-blue-50 font-medium opacity-90 max-w-xl text-sm">Olá {userName}, acompanhe obras e custos em tempo real.</p>
        </div>
        <Construction size={72} className="text-white/10 transform rotate-12 absolute right-4 md:right-8" />
      </section>

      {erro && <div className="bg-red-50 border border-red-200 text-red-700 font-bold px-6 py-4 rounded-2xl">{erro}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 md:gap-6">
        <StatCard icon={HardHat} label="Obras em Execução" value={loading ? '...' : String(obrasExecucao.length)} color="blue" onClick={() => setModal('obras')} hint="Toque para listar" />
        <StatCard icon={TrendingUp} label="Lucro Previsto" value={loading ? '...' : fmtBRL(lucroPrevisto)} color="emerald" hint={loading ? '' : `Orç.: ${fmtBRL(orcamentoAtivo)} • Gastos: ${fmtBRL(gastosAtivos)}`} />
        <StatCard icon={BarChart3} label="Aportes Ativos" value={loading ? '...' : fmtBRL(orcamentoAtivo)} color="amber" hint="Soma do orçamento das obras ativas" />
        <StatCard icon={TrendingDown} label="Gastos (Obras Ativas)" value={loading ? '...' : fmtBRL(gastosAtivos)} color="rose" hint="Soma de todos os lançamentos" />
        <StatCard icon={Calculator} label="Demandas Hoje" value={loading ? '...' : String(demandasHoje.length)} color="slate" onClick={() => setModal('demandas')} hint={loading ? '' : `${demandasHojeQtd.toFixed(2).replace('.', ',')} un • ${fmtBRL(demandasHojeTotal)}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[28px] overflow-hidden shadow-sm">
          <div className="px-6 md:px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <h3 className="text-lg font-black text-slate-800">Obras Ativas</h3>
            <button onClick={() => setModal('obras')} className="bg-white text-slate-600 border border-slate-200 hover:border-blue-500 hover:text-blue-600 px-4 py-2 rounded-xl transition-all shadow-sm font-bold text-sm">
              Ver Lista
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 font-bold">Carregando...</div>
          ) : obrasTable.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-bold">Nenhuma obra ativa.</div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50/80 text-slate-400 uppercase text-[10px] font-black tracking-[2px]">
                <tr>
                  <th className="px-6 md:px-8 py-4">Obra</th>
                  <th className="px-6 md:px-8 py-4">Responsável</th>
                  <th className="px-6 md:px-8 py-4">Consumo do Orçamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {obrasTable.map(o => {
                  const orc = Number(o.valor_contratado || 0);
                  const gas = Number(o.gastos || 0);
                  const pct = orc > 0 ? Math.min(100, Math.max(0, (gas / orc) * 100)) : 0;
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 md:px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black text-blue-500 mb-1 leading-none">OB-{String(o.id).padStart(3, '0')}</span>
                          <span className="font-extrabold text-slate-800">{o.nome}</span>
                          <span className="text-[11px] font-bold text-slate-400">{o.status || 'ATIVA'}</span>
                        </div>
                      </td>
                      <td className="px-6 md:px-8 py-5 font-bold text-slate-500 text-sm">{o.responsavel || '--'}</td>
                      <td className="px-6 md:px-8 py-5">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400">{pct.toFixed(0)}%</span>
                            <span className="text-[10px] font-black text-slate-400">
                              {fmtBRL(gas)} / {fmtBRL(orc)}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="bg-blue-600 h-full rounded-full transition-all" style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-[28px] p-6 md:p-8 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-slate-800">Auditoria</h3>
          <p className="text-sm text-slate-500 font-bold">Em breve: listagem de auditoria real (tabela `tb_auditoria`).</p>
        </div>
      </div>

      <ModalShell title="Obras em Execução (Ativas)" open={modal === 'obras'} onClose={() => setModal(null)}>
        {obrasExecucao.length === 0 ? (
          <div className="text-slate-400 font-bold">Nenhuma obra em execução.</div>
        ) : (
          <div className="space-y-3">
            {obrasExecucao.map(o => {
              const orc = Number(o.valor_contratado || 0);
              const gas = Number(o.gastos || 0);
              const lucro = orc - gas;
              return (
                <div key={o.id} className="border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-blue-600">OB-{String(o.id).padStart(3, '0')}</p>
                    <p className="text-slate-800 font-black">{o.nome}</p>
                    <p className="text-[11px] text-slate-500 font-bold">
                      {o.responsavel || '--'} • {o.status}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[11px] font-black">
                    <span className="px-3 py-1 rounded-xl bg-slate-50 text-slate-600">Orç.: {fmtBRL(orc)}</span>
                    <span className="px-3 py-1 rounded-xl bg-rose-50 text-rose-600">Gastos: {fmtBRL(gas)}</span>
                    <span className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700">Lucro: {fmtBRL(lucro)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ModalShell>

      <ModalShell title="Demandas de Hoje" open={modal === 'demandas'} onClose={() => setModal(null)}>
        {demandasHoje.length === 0 ? (
          <div className="text-slate-400 font-bold">Nenhuma demanda registrada hoje.</div>
        ) : (
          <div className="space-y-3">
            {demandasHoje.map((l: any) => (
              <div key={l.id} className="border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-slate-800 font-black">{l?.tb_produto_servico?.descricao || 'Item'}</p>
                  <p className="text-[11px] text-slate-500 font-bold">
                    Obra: <span className="text-slate-800">{l?.tb_obra?.nome || '--'}</span>
                    {l?.tb_produto_servico?.codigo_interno ? ` • ${l.tb_produto_servico.codigo_interno}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] font-black">
                  <span className="px-3 py-1 rounded-xl bg-slate-50 text-slate-600">
                    Qtd: {Number(l.quantidade || 0).toFixed(2).replace('.', ',')} {l?.tb_produto_servico?.unidade_medida || ''}
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-slate-50 text-slate-600">Unit: {fmtBRL(Number(l.preco_custo_aplicado || 0))}</span>
                  <span className="px-3 py-1 rounded-xl bg-blue-50 text-blue-700">Total: {fmtBRL(Number(l.total_calculado || 0))}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ModalShell>
    </div>
  );
};

