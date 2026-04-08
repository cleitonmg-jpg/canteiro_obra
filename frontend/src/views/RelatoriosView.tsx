import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Building2, RefreshCw, ChevronDown, ChevronRight, Edit2, Trash2, Save, X, Printer, FolderOpen } from 'lucide-react';
import { API } from '../config';
import { formatBRL } from '../utils/format';
import { DEFAULT_OBRA_FILTRO_STATUS, matchesObraFiltroStatus, OBRA_FILTRO_STATUS_OPTIONS, obraFiltroLabel, type ObraFiltroStatus } from '../utils/obraStatus';

interface ResumoObra {
    id: number;
    nome: string;
    status: string;
    orcamento: number;
    gastos: number;
    lucro: number;
    qtd_lancamentos: number;
}

interface Lancamento {
    id: number;
    quantidade: number;
    preco_custo_aplicado: number;
    total_calculado: number;
    data_movimentacao: string;
    tb_produto_servico?: { id: number; codigo_interno: string; descricao: string; unidade_medida?: string };
}

interface ResumoCanteiro {
    id: number;
    nome: string;
    responsavel?: string;
    totalOrcamento: number;
    totalGastos: number;
    lucro: number;
    qtd_obras: number;
    obras: ResumoObra[];
}

const fmt = (v: number) => formatBRL(v);

const statusColor: Record<string, string> = {
    'LICITAÇÃO': 'bg-amber-100 text-amber-700',
    'FUNDAÇÃO': 'bg-orange-100 text-orange-700',
    'EXECUÇÃO': 'bg-blue-100 text-blue-700',
    'ATIVA': 'bg-blue-100 text-blue-700',
    'ACABAMENTO': 'bg-purple-100 text-purple-700',
    'FINALIZADA': 'bg-emerald-100 text-emerald-700',
};

export const RelatoriosView = () => {
    const [dados, setDados] = useState<ResumoObra[]>([]);
    const [canteiros, setCanteiros] = useState<ResumoCanteiro[]>([]);
    const [abaAtiva, setAbaAtiva] = useState<'canteiros' | 'obras'>('canteiros');
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');
    const [expandidoCanteiro, setExpandidoCanteiro] = useState<number | null>(null);
    const [filtroStatusObra, setFiltroStatusObra] = useState<ObraFiltroStatus>(DEFAULT_OBRA_FILTRO_STATUS);

    // Linha expandida e seus lançamentos
    const [expandida, setExpandida] = useState<number | null>(null);
    const [lancamentosMap, setLancamentosMap] = useState<Record<number, Lancamento[]>>({});
    const [carregandoItens, setCarregandoItens] = useState(false);

    // Edição inline
    const [editandoItem, setEditandoItem] = useState<Lancamento | null>(null);
    const [editQtd, setEditQtd] = useState('');
    const [editPreco, setEditPreco] = useState('');
    const [salvandoItem, setSalvandoItem] = useState(false);

    const carregar = async () => {
        setCarregando(true); setErro('');
        try {
            const [obrasRes, cantRes] = await Promise.all([
                fetch(`${API}/api/relatorios/custos-por-obra`),
                fetch(`${API}/api/relatorios/custos-por-canteiro`),
            ]);
            setDados(await obrasRes.json());
            if (cantRes.ok) setCanteiros(await cantRes.json());
        } catch { setErro('Não foi possível conectar ao servidor.'); }
        finally { setCarregando(false); }
    };

    useEffect(() => { carregar(); }, []);

    const toggleObra = async (id: number) => {
        if (expandida === id) { setExpandida(null); return; }
        setExpandida(id);
        if (lancamentosMap[id]) return;
        setCarregandoItens(true);
        try {
            const res = await fetch(`${API}/api/lancamentos?id_obra=${id}`);
            const itens: Lancamento[] = await res.json();
            setLancamentosMap(prev => ({ ...prev, [id]: itens }));
        } catch { setErro('Erro ao carregar lançamentos.'); }
        finally { setCarregandoItens(false); }
    };

    const iniciarEdicao = (l: Lancamento) => {
        setEditandoItem(l);
        setEditQtd(String(l.quantidade));
        setEditPreco(String(l.preco_custo_aplicado));
    };

    const salvarEdicao = async (idObra: number) => {
        if (!editandoItem) return;
        setSalvandoItem(true);
        try {
            const res = await fetch(`${API}/api/lancamentos/${editandoItem.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantidade: parseFloat(editQtd), preco_custo_aplicado: parseFloat(editPreco) }),
            });
            if (!res.ok) throw new Error();
            const atualizado = await res.json();
            setLancamentosMap(prev => ({
                ...prev,
                [idObra]: prev[idObra].map(l => l.id === editandoItem.id ? { ...l, ...atualizado } : l),
            }));
            setEditandoItem(null);
            await carregar();
        } catch { setErro('Erro ao salvar lançamento.'); }
        finally { setSalvandoItem(false); }
    };

    const excluirItem = async (id: number, idObra: number) => {
        if (!window.confirm('Excluir este lançamento?')) return;
        try {
            await fetch(`${API}/api/lancamentos/${id}`, { method: 'DELETE' });
            setLancamentosMap(prev => ({ ...prev, [idObra]: prev[idObra].filter(l => l.id !== id) }));
            await carregar();
        } catch { setErro('Erro ao excluir lançamento.'); }
    };

    const dadosFiltrados = dados.filter((d) => matchesObraFiltroStatus(d.status, filtroStatusObra));
    const canteirosFiltrados = canteiros.map((c) => {
        const obrasFiltradas = (c.obras || []).filter((o) => matchesObraFiltroStatus(o.status, filtroStatusObra));
        const totalOrcamento = obrasFiltradas.reduce((acc, o) => acc + (Number(o.orcamento) || 0), 0);
        const totalGastos = obrasFiltradas.reduce((acc, o) => acc + (Number(o.gastos) || 0), 0);
        const lucro = totalOrcamento - totalGastos;
        return {
            ...c,
            obras: obrasFiltradas,
            qtd_obras: obrasFiltradas.length,
            totalOrcamento,
            totalGastos,
            lucro,
        };
    });

    const totalOrcamento = dadosFiltrados.reduce((a, d) => a + d.orcamento, 0);
    const totalGastos = dadosFiltrados.reduce((a, d) => a + d.gastos, 0);
    const totalLucro = totalOrcamento - totalGastos;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-3xl font-black text-slate-800">Relatório de Obras</h2>
                    <p className="text-slate-500 font-bold mt-2">Clique em uma obra para ver e editar seus lançamentos.</p>
                </div>
                <button onClick={carregar} disabled={carregando} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-6 py-3 rounded-2xl transition-all">
                    <RefreshCw size={18} className={carregando ? 'animate-spin' : ''} /> ATUALIZAR
                </button>
            </div>

            {erro && <div className="bg-red-50 border border-red-200 text-red-700 font-bold px-6 py-4 rounded-2xl">{erro}</div>}

            {/* Abas: Canteiros | Obras + filtro */}
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
                    <button
                        onClick={() => setAbaAtiva('canteiros')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all ${
                            abaAtiva === 'canteiros' ? 'bg-white text-blue-700 shadow-md' : 'text-slate-500 hover:text-slate-800'
                        }`}>
                        <FolderOpen size={16} /> Por Canteiro
                    </button>
                    <button
                        onClick={() => setAbaAtiva('obras')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all ${
                            abaAtiva === 'obras' ? 'bg-white text-blue-700 shadow-md' : 'text-slate-500 hover:text-slate-800'
                        }`}>
                        <Building2 size={16} /> Por Obra
                    </button>
                </div>

                <div className="bg-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-200/60 max-w-md flex items-center gap-3">
                    <Building2 size={16} className="text-blue-500 shrink-0" />
                    <select
                        value={filtroStatusObra}
                        onChange={(e) => setFiltroStatusObra(e.target.value as ObraFiltroStatus)}
                        className="bg-transparent border-none outline-none w-full font-bold text-sm text-slate-700"
                        title={`Filtro de obras: ${obraFiltroLabel(filtroStatusObra)}`}
                    >
                        {OBRA_FILTRO_STATUS_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Painel de Canteiros */}
            {abaAtiva === 'canteiros' && (
                <div className="space-y-4">

                    {/* Cards de totais de canteiros */}
                    {canteirosFiltrados.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Total Orçado (filtro)</p>
                                <p className="text-3xl font-black text-slate-800">{fmt(canteirosFiltrados.reduce((a, c) => a + c.totalOrcamento, 0))}</p>
                                <p className="text-xs text-slate-400 font-bold mt-2">{canteirosFiltrados.reduce((a, c) => a + c.qtd_obras, 0)} obra(s)</p>
                            </div>
                            <div className="bg-white p-8 rounded-[32px] border border-red-100 shadow-sm">
                                <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-2">Total Gasto</p>
                                <p className="text-3xl font-black text-red-600">{fmt(canteirosFiltrados.reduce((a, c) => a + c.totalGastos, 0))}</p>
                            </div>
                            <div className="bg-white p-8 rounded-[32px] border border-emerald-100 shadow-sm">
                                <p className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-2">Lucro Previsto (Total)</p>
                                <p className={`text-3xl font-black ${canteirosFiltrados.reduce((a, c) => a + c.lucro, 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {fmt(canteirosFiltrados.reduce((a, c) => a + c.lucro, 0))}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Canteiros expansíveis */}
                    {canteirosFiltrados.map(c => {
                        const aberto = expandidoCanteiro === c.id;
                        return (
                            <div key={c.id} className={`bg-white border rounded-[24px] shadow-sm overflow-hidden transition-all ${aberto ? 'border-blue-300' : 'border-slate-200'}`}>
                                <button onClick={() => setExpandidoCanteiro(aberto ? null : c.id)}
                                    className="w-full flex items-center gap-5 p-5 text-left hover:bg-slate-50/50 transition-colors">
                                    <div className={`p-2.5 rounded-xl shrink-0 ${aberto ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                                        <FolderOpen size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-black text-lg ${aberto ? 'text-blue-700' : 'text-slate-800'}`}>{c.nome}</p>
                                        <p className="text-xs font-bold text-slate-400">{c.responsavel || '—'} • {c.qtd_obras} obra(s)</p>
                                    </div>
                                    <div className="flex flex-wrap gap-4 shrink-0 mr-4">
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Orçamento</p>
                                            <p className="text-sm font-black text-slate-700">{fmt(c.totalOrcamento)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Gastos</p>
                                            <p className="text-sm font-black text-red-600">{fmt(c.totalGastos)}</p>
                                        </div>
                                        <div className={`text-right px-3 py-1.5 rounded-xl ${c.lucro >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                            <p className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 justify-end ${c.lucro >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                                                {c.lucro >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />} Lucro
                                            </p>
                                            <p className={`text-sm font-black ${c.lucro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(c.lucro)}</p>
                                        </div>
                                    </div>
                                    {aberto ? <ChevronDown size={18} className="text-blue-600 shrink-0" /> : <ChevronRight size={18} className="text-slate-400 shrink-0" />}
                                </button>

                                {aberto && c.obras.length > 0 && (
                                    <div className="border-t border-blue-100 bg-blue-50/30 overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-blue-100/50">
                                                <tr>
                                                    <th className="px-6 py-3">Obra</th>
                                                    <th className="px-6 py-3">Status</th>
                                                    <th className="px-6 py-3 text-right">Orçamento</th>
                                                    <th className="px-6 py-3 text-right">Gastos</th>
                                                    <th className="px-6 py-3 text-right">Lucro</th>
                                                    <th className="px-6 py-3 text-center">Itens</th>
                                                    <th className="px-6 py-3"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-blue-100">
                                                {c.obras.map(o => (
                                                    <tr key={o.id} className="hover:bg-white/60 transition-colors">
                                                        <td className="px-6 py-3.5 font-bold text-slate-800">{o.nome}</td>
                                                        <td className="px-6 py-3.5">
                                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${statusColor[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status}</span>
                                                        </td>
                                                        <td className="px-6 py-3.5 text-right font-bold text-slate-700">{fmt(o.orcamento)}</td>
                                                        <td className="px-6 py-3.5 text-right font-bold text-red-500">{fmt(o.gastos)}</td>
                                                        <td className={`px-6 py-3.5 text-right font-black ${o.lucro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(o.lucro)}</td>
                                                        <td className="px-6 py-3.5 text-center text-xs font-black text-slate-500">{o.qtd_lancamentos}</td>
                                                        <td className="px-6 py-3.5">
                                                            <button onClick={() => window.open(`/relatorio-obra/${o.id}`, '_blank')}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all">
                                                                <Printer size={12} /> Imprimir
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-blue-100 border-t-2 border-blue-200">
                                                <tr>
                                                    <td colSpan={2} className="px-6 py-3 text-xs font-black text-blue-700 uppercase">TOTAL</td>
                                                    <td className="px-6 py-3 text-right font-black text-slate-800">{fmt(c.totalOrcamento)}</td>
                                                    <td className="px-6 py-3 text-right font-black text-red-700">{fmt(c.totalGastos)}</td>
                                                    <td className={`px-6 py-3 text-right font-black ${c.lucro >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(c.lucro)}</td>
                                                    <td colSpan={2}></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                                {aberto && c.obras.length === 0 && (
                                    <div className="px-6 py-8 text-center text-slate-400 font-bold border-t border-blue-100">Nenhuma obra vinculada.</div>
                                )}
                            </div>
                        );
                    })}
                    {canteirosFiltrados.length === 0 && !carregando && (
                        <div className="bg-white rounded-[32px] border border-slate-200 p-12 text-center text-slate-400 font-bold">
                            Nenhum canteiro cadastrado. Acesse o menu "Canteiros de Obras" para criar.
                        </div>
                    )}
                </div>
            )}

            {/* Painel de Obras (visão original) */}
            {abaAtiva === 'obras' && (
            <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Total Orçado</p>
                    <p className="text-3xl font-black text-slate-800">{fmt(totalOrcamento)}</p>
                    <p className="text-xs text-slate-400 font-bold mt-2">{dadosFiltrados.length} obra(s)</p>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-red-100 shadow-sm">
                    <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-2">Total Gasto</p>
                    <p className="text-3xl font-black text-red-600">{fmt(totalGastos)}</p>
                    <p className="text-xs text-slate-400 font-bold mt-2">{dadosFiltrados.reduce((a, d) => a + d.qtd_lancamentos, 0)} lançamento(s)</p>
                </div>
                <div className={`p-8 rounded-[32px] border shadow-sm ${totalLucro >= 0 ? 'bg-white border-emerald-100' : 'bg-white border-red-100'}`}>
                    <p className={`text-xs font-black uppercase tracking-widest mb-2 ${totalLucro >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>Lucro Previsto</p>
                    <p className={`text-3xl font-black ${totalLucro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(totalLucro)}</p>
                    <div className="flex items-center gap-1 mt-2">
                        {totalLucro >= 0 ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
                        <p className="text-xs text-slate-400 font-bold">
                            {totalOrcamento > 0 ? `${((totalLucro / totalOrcamento) * 100).toFixed(1)}% do orçamento` : '—'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabela com expansão */}
            <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-black text-slate-700 flex items-center gap-2">
                        <Building2 size={18} /> Detalhamento por Obra — clique para expandir os itens
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 w-10"></th>
                                <th className="px-8 py-5">Obra</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Orçamento</th>
                                <th className="px-8 py-5 text-right">Gastos</th>
                                <th className="px-8 py-5 text-right">Lucro</th>
                                <th className="px-8 py-5 text-center">Itens</th>
                                <th className="px-8 py-5"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {dadosFiltrados.length === 0 ? (
                                <tr><td colSpan={8} className="px-8 py-12 text-center text-slate-400 font-bold">
                                    {carregando ? 'Carregando...' : 'Nenhuma obra encontrada.'}
                                </td></tr>
                            ) : dadosFiltrados.map(d => (
                                <>
                                    {/* Linha da obra */}
                                    <tr key={d.id}
                                        onClick={() => toggleObra(d.id)}
                                        className={`cursor-pointer transition-colors border-b border-slate-100 ${expandida === d.id ? 'bg-blue-50' : 'hover:bg-slate-50/50'}`}>
                                        <td className="px-8 py-5 text-slate-400">
                                            {expandida === d.id
                                                ? <ChevronDown size={16} className="text-blue-600" />
                                                : <ChevronRight size={16} />
                                            }
                                        </td>
                                        <td className="px-8 py-5 font-bold text-slate-800">{d.nome}</td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${statusColor[d.status] || 'bg-slate-100 text-slate-600'}`}>{d.status}</span>
                                        </td>
                                        <td className="px-8 py-5 text-right font-bold text-slate-700">{fmt(d.orcamento)}</td>
                                        <td className="px-8 py-5 text-right font-bold text-red-500">{fmt(d.gastos)}</td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {d.lucro >= 0 ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
                                                <span className={`font-black text-base ${d.lucro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(d.lucro)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-black">{d.qtd_lancamentos}</span>
                                        </td>
                                        <td className="px-4 py-5">
                                            <button
                                                onClick={e => { e.stopPropagation(); window.open(`/relatorio-obra/${d.id}`, '_blank'); }}
                                                title="Abrir relatório desta obra"
                                                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs transition-all shadow-sm"
                                            >
                                                <Printer size={13} /> Imprimir
                                            </button>
                                        </td>
                                    </tr>

                                    {/* Linha expandida com itens */}
                                    {expandida === d.id && (
                                        <tr key={`detail-${d.id}`}>
                                            <td colSpan={8} className="px-0 py-0 bg-blue-50/50">
                                                <div className="px-8 py-4">
                                                    {carregandoItens && !lancamentosMap[d.id] ? (
                                                        <p className="text-center text-slate-400 font-bold py-6">Carregando itens...</p>
                                                    ) : (lancamentosMap[d.id] || []).length === 0 ? (
                                                        <p className="text-center text-slate-400 font-bold py-6">Nenhum lançamento nesta obra.</p>
                                                    ) : (
                                                        <table className="w-full text-left text-sm">
                                                            <thead>
                                                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-blue-100">
                                                                    <th className="py-3 pr-4">Data</th>
                                                                    <th className="py-3 pr-4">Código</th>
                                                                    <th className="py-3 pr-4">Produto / Serviço</th>
                                                                    <th className="py-3 pr-4 text-center">Qtd</th>
                                                                    <th className="py-3 pr-4 text-right">Preço Unit.</th>
                                                                    <th className="py-3 pr-4 text-right">Total</th>
                                                                    <th className="py-3 text-right">Ações</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(lancamentosMap[d.id] || []).map(l => (
                                                                    <tr key={l.id} className="border-b border-blue-100/50 last:border-0">
                                                                        {editandoItem?.id === l.id ? (
                                                                            <>
                                                                                <td className="py-3 pr-4 text-xs text-slate-400">{new Date(l.data_movimentacao).toLocaleDateString('pt-BR')}</td>
                                                                                <td className="py-3 pr-4 text-blue-600 font-black text-xs">{l.tb_produto_servico?.codigo_interno}</td>
                                                                                <td className="py-3 pr-4 font-bold text-slate-700">{l.tb_produto_servico?.descricao}</td>
                                                                                <td className="py-3 pr-4">
                                                                                    <input type="number" step="0.001" value={editQtd} onChange={e => setEditQtd(e.target.value)}
                                                                                        className="w-20 px-2 py-1.5 bg-white border border-blue-300 rounded-lg text-slate-800 font-bold text-center focus:outline-none" />
                                                                                </td>
                                                                                <td className="py-3 pr-4">
                                                                                    <input type="number" step="0.01" value={editPreco} onChange={e => setEditPreco(e.target.value)}
                                                                                        className="w-24 px-2 py-1.5 bg-white border border-blue-300 rounded-lg text-blue-700 font-black text-right focus:outline-none" />
                                                                                </td>
                                                                                <td className="py-3 pr-4 text-right font-black text-slate-700">
                                                                                    {fmt((parseFloat(editQtd) || 0) * (parseFloat(editPreco) || 0))}
                                                                                </td>
                                                                                <td className="py-3 text-right">
                                                                                    <div className="flex justify-end gap-1.5">
                                                                                        <button onClick={() => salvarEdicao(d.id)} disabled={salvandoItem}
                                                                                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-xs transition-all">
                                                                                            <Save size={12} /> {salvandoItem ? '...' : 'OK'}
                                                                                        </button>
                                                                                        <button onClick={() => setEditandoItem(null)} className="px-2 py-1.5 bg-white border border-slate-200 text-slate-500 rounded-lg hover:bg-slate-50 transition-all">
                                                                                            <X size={12} />
                                                                                        </button>
                                                                                    </div>
                                                                                </td>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <td className="py-3 pr-4 text-xs text-slate-400 font-bold">{new Date(l.data_movimentacao).toLocaleDateString('pt-BR')}</td>
                                                                                <td className="py-3 pr-4 text-blue-600 font-black text-xs">{l.tb_produto_servico?.codigo_interno}</td>
                                                                                <td className="py-3 pr-4 font-bold text-slate-700">{l.tb_produto_servico?.descricao}</td>
                                                                                <td className="py-3 pr-4 text-center font-bold text-slate-600">
                                                                                    {Number(l.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                                                                                    {l.tb_produto_servico?.unidade_medida && <span className="text-slate-400 ml-1 text-xs">{l.tb_produto_servico.unidade_medida}</span>}
                                                                                </td>
                                                                                <td className="py-3 pr-4 text-right font-bold text-slate-600">{fmt(parseFloat(String(l.preco_custo_aplicado)))}</td>
                                                                                <td className="py-3 pr-4 text-right font-black text-slate-800">{fmt(parseFloat(String(l.total_calculado)))}</td>
                                                                                <td className="py-3 text-right">
                                                                                    <div className="flex justify-end gap-1.5">
                                                                                        <button onClick={e => { e.stopPropagation(); iniciarEdicao(l); }} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"><Edit2 size={14} /></button>
                                                                                        <button onClick={e => { e.stopPropagation(); excluirItem(l.id, d.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                                                                    </div>
                                                                                </td>
                                                                            </>
                                                                        )}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                            <tfoot>
                                                                <tr className="border-t border-blue-200">
                                                                    <td colSpan={5} className="py-3 pr-4 text-xs font-black text-slate-400 uppercase tracking-widest">
                                                                        {(lancamentosMap[d.id] || []).length} item(ns)
                                                                    </td>
                                                                    <td className="py-3 pr-4 text-right font-black text-red-600">
                                                                        {fmt((lancamentosMap[d.id] || []).reduce((a, l) => a + parseFloat(String(l.total_calculado || 0)), 0))}
                                                                    </td>
                                                                    <td></td>
                                                                </tr>
                                                            </tfoot>
                                                        </table>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
            )}
        </div>
    );
};
