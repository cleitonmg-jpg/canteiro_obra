import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, X } from 'lucide-react';
import { API } from '../config';
import { formatBRL } from '../utils/format';

const fmtData = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtCNPJ = (c: string) => c?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') ?? c;

const statusLabel: Record<string, string> = {
  'pendente': 'Pendente', 'em andamento': 'Em Andamento',
  'concluída': 'Concluída', 'cancelada': 'Cancelada',
};

const RelatorioEtapasPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [empresa, setEmpresa]     = useState<any>(null);
  const [etapas, setEtapas]       = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]           = useState('');

  const dataInicio  = searchParams.get('data_inicio') || '';
  const dataFim     = searchParams.get('data_fim')    || '';
  const statusFiltro = searchParams.get('status')    || '';

  useEffect(() => {
    const carregar = async () => {
      try {
        const params = new URLSearchParams();
        if (dataInicio)   params.append('data_inicio', dataInicio);
        if (dataFim)      params.append('data_fim', dataFim);
        if (statusFiltro) params.append('status', statusFiltro);

        const [resEmp, resEtapas] = await Promise.all([
          fetch(`${API}/api/empresa`),
          fetch(`${API}/api/etapas-obra?${params}`),
        ]);
        setEmpresa(resEmp.ok ? await resEmp.json() : null);
        setEtapas(resEtapas.ok ? await resEtapas.json() : []);
      } catch (e: any) {
        setErro(e.message || 'Erro ao carregar dados');
      } finally {
        setCarregando(false);
      }
    };
    carregar();
  }, [dataInicio, dataFim, statusFiltro]);

  const totalValor = etapas.reduce((acc, e) => acc + parseFloat(e.valor_a_receber || 0), 0);

  const periodoLabel = () => {
    if (dataInicio && dataFim) return `${fmtData(dataInicio)} a ${fmtData(dataFim)}`;
    if (dataInicio) return `A partir de ${fmtData(dataInicio)}`;
    if (dataFim)    return `Até ${fmtData(dataFim)}`;
    return 'Todos os períodos';
  };

  if (carregando) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-slate-400 font-bold text-lg">Carregando relatório...</p>
    </div>
  );
  if (erro) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-red-500 font-bold text-lg">{erro}</p>
    </div>
  );

  // Agrupar por obra
  const porObra = new Map<number, { obra: any; itens: any[] }>();
  etapas.forEach(e => {
    const id = e.tb_obra?.id ?? 0;
    if (!porObra.has(id)) porObra.set(id, { obra: e.tb_obra, itens: [] });
    porObra.get(id)!.itens.push(e);
  });

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          .page { box-shadow: none !important; margin: 0 !important; padding: 16px !important; }
        }
        @page { margin: 12mm 15mm; size: A4 portrait; }
      `}</style>

      <div className="no-print bg-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
        <p className="text-white font-bold text-sm">Relatório de Etapas — {periodoLabel()}</p>
        <div className="flex gap-3">
          <button onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black px-5 py-2 rounded-xl text-sm transition-all">
            <Printer size={16} /> IMPRIMIR / SALVAR PDF
          </button>
          <button onClick={() => window.close()}
            className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-black px-4 py-2 rounded-xl text-sm transition-all">
            <X size={16} /> FECHAR
          </button>
        </div>
      </div>

      <div className="page bg-white max-w-[900px] mx-auto px-10 py-8 shadow-sm" style={{ fontFamily: 'Arial, sans-serif' }}>

        {/* Cabeçalho empresa */}
        <div className="border-b-2 border-slate-800 pb-4 mb-5">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">{empresa?.nome || 'EMPRESA'}</h1>
              {empresa?.cnpj && <p className="text-xs text-slate-500 mt-0.5">CNPJ: {fmtCNPJ(empresa.cnpj)}</p>}
              {empresa?.endereco && <p className="text-xs text-slate-500 mt-0.5">{empresa.endereco}</p>}
              {(empresa?.telefone || empresa?.email) && (
                <p className="text-xs text-slate-500 mt-0.5">
                  {empresa.telefone && `Tel: ${empresa.telefone}`}
                  {empresa.telefone && empresa.email && '  |  '}
                  {empresa.email && `E-mail: ${empresa.email}`}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">RELATÓRIO DE ETAPAS</p>
              <p className="text-[10px] text-slate-400 mt-1">Emitido em: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Filtros aplicados */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-5 py-3 mb-5 flex flex-wrap gap-4 text-xs">
          <div>
            <span className="font-black uppercase tracking-widest text-slate-400">Período: </span>
            <span className="font-bold text-slate-700">{periodoLabel()}</span>
          </div>
          {statusFiltro && (
            <div>
              <span className="font-black uppercase tracking-widest text-slate-400">Status: </span>
              <span className="font-bold text-slate-700">{statusLabel[statusFiltro] ?? statusFiltro}</span>
            </div>
          )}
          <div>
            <span className="font-black uppercase tracking-widest text-slate-400">Total: </span>
            <span className="font-bold text-slate-700">{etapas.length} etapa{etapas.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Resumo geral */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="border border-slate-200 rounded-lg p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Qtd. Etapas</p>
            <p className="text-xl font-black text-slate-800">{etapas.length}</p>
          </div>
          <div className="border border-emerald-100 bg-emerald-50/40 rounded-lg p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Total a Receber</p>
            <p className="text-xl font-black text-emerald-700">{formatBRL(totalValor)}</p>
          </div>
          <div className="border border-blue-100 bg-blue-50/40 rounded-lg p-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">Obras envolvidas</p>
            <p className="text-xl font-black text-blue-700">{porObra.size}</p>
          </div>
        </div>

        {/* Etapas agrupadas por obra */}
        {etapas.length === 0 ? (
          <p className="text-center text-slate-400 font-bold py-8 border border-dashed border-slate-200 rounded-lg">
            Nenhuma etapa no período informado.
          </p>
        ) : (
          Array.from(porObra.entries()).map(([, group]) => {
            const subtotal = group.itens.reduce((acc, e) => acc + parseFloat(e.valor_a_receber || 0), 0);
            const obraOrc  = parseFloat(group.obra?.valor_contratado || 0);
            return (
              <div key={group.obra?.id ?? 0} className="mb-6">
                {/* Cabeçalho da obra */}
                <div className="bg-slate-800 text-white px-4 py-2 rounded-t-md flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black uppercase tracking-wide">{group.obra?.nome || 'Obra não identificada'}</span>
                    {group.obra?.tb_canteiro?.nome && (
                      <span className="ml-3 text-[10px] text-slate-400">Canteiro: {group.obra.tb_canteiro.nome}</span>
                    )}
                  </div>
                  <span className="text-xs font-bold text-slate-300">{formatBRL(subtotal)}</span>
                </div>

                <table className="w-full text-left text-xs border border-t-0 border-slate-200 rounded-b-md overflow-hidden">
                  <thead>
                    <tr className="bg-slate-100 text-slate-500 font-black uppercase tracking-widest">
                      <th className="px-3 py-2">Data</th>
                      <th className="px-3 py-2">Serviço Executado</th>
                      <th className="px-3 py-2">Descrição</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Dt. Baixa</th>
                      <th className="px-3 py-2 text-right">Valor</th>
                      {obraOrc > 0 && <th className="px-3 py-2 text-right">% Orç.</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {group.itens.map((e, idx) => {
                      const val = parseFloat(e.valor_a_receber || 0);
                      const pct = obraOrc > 0 ? ((val / obraOrc) * 100).toFixed(1) : null;
                      return (
                        <tr key={e.id} className={`border-t border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{fmtData(e.data_lancamento)}</td>
                          <td className="px-3 py-2 font-black text-slate-800">{e.servico_executado}</td>
                          <td className="px-3 py-2 text-slate-500">{e.descricao || '—'}</td>
                          <td className="px-3 py-2 font-bold text-slate-600">{statusLabel[e.status_etapa] ?? e.status_etapa}</td>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{e.data_baixa ? fmtData(e.data_baixa) : '—'}</td>
                          <td className="px-3 py-2 text-right font-black text-emerald-700">{formatBRL(val)}</td>
                          {obraOrc > 0 && <td className="px-3 py-2 text-right text-slate-400">{pct}%</td>}
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-slate-200 bg-slate-50">
                      <td colSpan={obraOrc > 0 ? 5 : 5} className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Subtotal
                      </td>
                      <td className="px-3 py-2 text-right font-black text-emerald-700">{formatBRL(subtotal)}</td>
                      {obraOrc > 0 && (
                        <td className="px-3 py-2 text-right font-black text-blue-700">
                          {((subtotal / obraOrc) * 100).toFixed(1)}%
                        </td>
                      )}
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })
        )}

        {/* Total geral */}
        {etapas.length > 0 && (
          <div className="mt-4 border-t-2 border-slate-800 pt-4">
            <table className="w-full text-sm">
              <tbody>
                <tr>
                  <td className="py-1.5 text-slate-500 font-bold text-right pr-4">Total de Etapas:</td>
                  <td className="py-1.5 text-right font-black text-slate-700 w-40">{etapas.length}</td>
                </tr>
                <tr className="border-t border-slate-300">
                  <td className="pt-3 pb-1 font-black text-slate-800 text-right pr-4 text-base uppercase tracking-wide">Total a Receber:</td>
                  <td className="pt-3 pb-1 text-right font-black text-xl text-emerald-700 w-40">{formatBRL(totalValor)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Rodapé */}
        <div className="mt-10 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
          <span>CANTEIRO DE OBRAS — V9 INFORMÁTICA LTDA — (37) 4141-0341</span>
          <span>Página 1</span>
        </div>
      </div>
    </>
  );
};

export default RelatorioEtapasPage;
