import { useState, useEffect } from 'react';
import { Plus, Building2, MapPin, Search, Edit2, Trash2, Calendar, HardHat, X, TrendingDown, TrendingUp, List, ChevronLeft, Save } from 'lucide-react';

import { API } from '../config';
import { formatBRL } from '../utils/format';

interface Obra {
    id: number;
    nome: string;
    endereco?: string;
    data_inicio?: string;
    data_termino?: string;
    responsavel?: string;
    status: string;
    valor_contratado: number;
    gastos: number;
}

interface Lancamento {
    id: number;
    quantidade: number;
    preco_custo_aplicado: number;
    total_calculado: number;
    data_movimentacao: string;
    tb_produto_servico?: { id: number; codigo_interno: string; descricao: string; unidade_medida?: string };
}

const fmt = (v: number) => formatBRL(v);
const formatData = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '--';

interface GrupoGasto {
    id: number;
    codigo?: string;
    descricao: string;
    total: number;
}

const piePalette = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f97316'];

const buildPie = (grupos: GrupoGasto[]) => {
    const items = (grupos || []).filter(g => (Number(g.total) || 0) > 0).sort((a, b) => (b.total || 0) - (a.total || 0));
    const total = items.reduce((acc, g) => acc + (Number(g.total) || 0), 0);
    if (total <= 0) return { gradient: 'conic-gradient(#e2e8f0 0 100%)', title: 'Sem gastos', legend: [] as any[] };

    const top = items.slice(0, 5);
    const otherTotal = items.slice(5).reduce((acc, g) => acc + (Number(g.total) || 0), 0);
    const parts: GrupoGasto[] = otherTotal > 0 ? [...top, { id: -1, descricao: 'Outros', total: otherTotal }] : top;

    let cur = 0;
    const stops: string[] = [];
    const legend = parts.slice(0, 3).map((p, idx) => ({ color: piePalette[idx % piePalette.length], label: p.descricao, value: fmt(Number(p.total) || 0) }));

    parts.forEach((p, idx) => {
        const start = cur;
        cur += ((Number(p.total) || 0) / total) * 100;
        const end = Math.min(100, cur);
        const color = piePalette[idx % piePalette.length];
        stops.push(`${color} ${start}% ${end}%`);
    });
    if (cur < 100) stops.push(`#e2e8f0 ${cur}% 100%`);

    const title = parts.map(p => `${p.descricao}: ${fmt(Number(p.total) || 0)}`).join('\n');
    return { gradient: `conic-gradient(${stops.join(', ')})`, title, legend };
};

const statusColor: Record<string, string> = {
    'LICITAÇÃO': 'bg-amber-100 text-amber-700',
    'FUNDAÇÃO': 'bg-orange-100 text-orange-700',
    'EXECUÇÃO': 'bg-blue-100 text-blue-700',
    'ATIVA': 'bg-blue-100 text-blue-700',
    'ACABAMENTO': 'bg-purple-100 text-purple-700',
    'FINALIZADA': 'bg-emerald-100 text-emerald-700',
};

export const ObrasView = ({ buscaExterna }: any) => {
    const [obras, setObras] = useState<Obra[]>([]);
    const [gastosPorGrupo, setGastosPorGrupo] = useState<Record<number, GrupoGasto[]>>({});
    const [viewForm, setViewForm] = useState(false);
    const [busca, setBusca] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');

    // Painel de lançamentos
    const [obraDetalhe, setObraDetalhe] = useState<Obra | null>(null);
    const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
    const [editandoItem, setEditandoItem] = useState<Lancamento | null>(null);
    const [editQtd, setEditQtd] = useState('');
    const [editPreco, setEditPreco] = useState('');
    const [salvandoItem, setSalvandoItem] = useState(false);

    // Form obra
    const [editId, setEditId] = useState<number | null>(null);
    const [nome, setNome] = useState('');
    const [endereco, setEndereco] = useState('');
    const [inicio, setInicio] = useState('');
    const [termino, setTermino] = useState('');
    const [responsavel, setResponsavel] = useState('');
    const [status, setStatus] = useState('EXECUÇÃO');
    const [valorContratado, setValorContratado] = useState('');

    const carregar = async () => {
        try {
            const res = await fetch(`${API}/api/obras`);
            const dados = await res.json();
            setObras(dados);
        } catch {
            setErro('Não foi possível conectar ao servidor.');
            return;
        }

        // Dados agregados (pizza) - falha aqui não impede a tela
        try {
            const res = await fetch(`${API}/api/obras/gastos-por-grupo?ativas=0`);
            if (!res.ok) return;
            const data = await res.json();
            const map: Record<number, GrupoGasto[]> = {};
            for (const item of data || []) map[item.id_obra] = item.grupos || [];
            setGastosPorGrupo(map);
        } catch { /* noop */ }
    };

    useEffect(() => { carregar(); }, []);

    useEffect(() => {
        if (typeof buscaExterna === 'string') setBusca(buscaExterna);
    }, [buscaExterna]);

    const abrirLancamentos = async (obra: Obra) => {
        setObraDetalhe(obra);
        const res = await fetch(`${API}/api/lancamentos?id_obra=${obra.id}`);
        setLancamentos(await res.json());
    };

    const fecharDetalhe = () => { setObraDetalhe(null); setLancamentos([]); setEditandoItem(null); };

    const iniciarEdicaoItem = (l: Lancamento) => {
        setEditandoItem(l);
        setEditQtd(String(l.quantidade));
        setEditPreco(String(l.preco_custo_aplicado));
    };

    const salvarEdicaoItem = async () => {
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
            setLancamentos(lancamentos.map(l => l.id === editandoItem.id ? { ...l, ...atualizado } : l));
            setEditandoItem(null);
            await carregar(); // atualiza gastos no card
        } catch { setErro('Erro ao salvar lançamento.'); }
        finally { setSalvandoItem(false); }
    };

    const excluirItem = async (id: number) => {
        if (!window.confirm('Excluir este lançamento?')) return;
        try {
            await fetch(`${API}/api/lancamentos/${id}`, { method: 'DELETE' });
            setLancamentos(lancamentos.filter(l => l.id !== id));
            await carregar();
        } catch { setErro('Erro ao excluir lançamento.'); }
    };

    const resetForm = () => {
        setEditId(null); setNome(''); setEndereco(''); setInicio(''); setTermino('');
        setResponsavel(''); setStatus('EXECUÇÃO'); setValorContratado('');
        setViewForm(false);
    };

    const handleSalvar = async (e: React.FormEvent) => {
        e.preventDefault();
        setCarregando(true); setErro('');
        try {
            const body = { nome, endereco, responsavel, status, valor_contratado: valorContratado, data_inicio: inicio || null, data_termino: termino || null };
            const res = editId
                ? await fetch(`${API}/api/obras/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                : await fetch(`${API}/api/obras`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error();
            await carregar(); resetForm();
        } catch { setErro('Erro ao salvar. Verifique a conexão.'); }
        finally { setCarregando(false); }
    };

    const handleEditar = (o: Obra) => {
        setEditId(o.id); setNome(o.nome); setEndereco(o.endereco || '');
        setInicio(o.data_inicio ? o.data_inicio.substring(0, 10) : '');
        setTermino(o.data_termino ? o.data_termino.substring(0, 10) : '');
        setResponsavel(o.responsavel || ''); setStatus(o.status);
        setValorContratado(String(o.valor_contratado));
        setViewForm(true);
    };

    const handleExcluir = async (id: number) => {
        if (!window.confirm('Certeza que deseja excluir esta obra?')) return;
        try {
            const res = await fetch(`${API}/api/obras/${id}`, { method: 'DELETE' });
            const body = await res.json().catch(() => ({} as any));
            if (!res.ok) throw new Error(body.erro || 'Erro ao excluir obra.');
            await carregar();
        } catch (e: any) {
            setErro(e?.message || 'Erro ao excluir obra.');
        }
    };

    const filtradas = obras.filter(o => o.nome.toLowerCase().includes(busca.toLowerCase()));
    const totalLancamentos = lancamentos.reduce((a, l) => a + parseFloat(String(l.total_calculado || 0)), 0);

    // ── Painel de lançamentos ──────────────────────────────────────────────────
    if (obraDetalhe) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4 bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm">
                    <button onClick={fecharDetalhe} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-black bg-slate-100 hover:bg-blue-50 px-4 py-2.5 rounded-xl transition-all">
                        <ChevronLeft size={18} /> VOLTAR
                    </button>
                    <div className="flex-1">
                        <h2 className="text-2xl font-black text-slate-800">{obraDetalhe.nome}</h2>
                        <p className="text-slate-400 font-bold text-sm mt-0.5">Lançamentos registrados</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Gasto</p>
                        <p className="text-2xl font-black text-red-600">{fmt(totalLancamentos)}</p>
                    </div>
                </div>

                {erro && <div className="bg-red-50 border border-red-200 text-red-700 font-bold px-6 py-4 rounded-2xl">{erro}</div>}

                <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                    {lancamentos.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 font-bold">Nenhum lançamento registrado nesta obra.</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-5">Data</th>
                                    <th className="px-6 py-5">Código</th>
                                    <th className="px-6 py-5">Produto / Serviço</th>
                                    <th className="px-6 py-5 text-center">Quantidade</th>
                                    <th className="px-6 py-5 text-right">Preço Unit.</th>
                                    <th className="px-6 py-5 text-right">Total</th>
                                    <th className="px-6 py-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lancamentos.map(l => (
                                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                        {editandoItem?.id === l.id ? (
                                            <>
                                                <td className="px-6 py-4 text-xs text-slate-400 font-bold">{new Date(l.data_movimentacao).toLocaleDateString('pt-BR')}</td>
                                                <td className="px-6 py-4 text-blue-600 font-black text-xs">{l.tb_produto_servico?.codigo_interno}</td>
                                                <td className="px-6 py-4 font-bold text-slate-700">{l.tb_produto_servico?.descricao}</td>
                                                <td className="px-6 py-4">
                                                    <input type="number" step="0.001" value={editQtd} onChange={e => setEditQtd(e.target.value)}
                                                        className="w-24 px-3 py-2 bg-blue-50 border border-blue-300 rounded-xl text-slate-800 font-bold text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input type="number" step="0.01" value={editPreco} onChange={e => setEditPreco(e.target.value)}
                                                        className="w-28 px-3 py-2 bg-blue-50 border border-blue-300 rounded-xl text-blue-700 font-black text-right focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                                </td>
                                                <td className="px-6 py-4 text-right font-black text-slate-700">
                                                    {fmt((parseFloat(editQtd) || 0) * (parseFloat(editPreco) || 0))}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={salvarEdicaoItem} disabled={salvandoItem} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs transition-all">
                                                            <Save size={14} /> {salvandoItem ? '...' : 'SALVAR'}
                                                        </button>
                                                        <button onClick={() => setEditandoItem(null)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-all">
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4 text-xs text-slate-400 font-bold">{new Date(l.data_movimentacao).toLocaleDateString('pt-BR')}</td>
                                                <td className="px-6 py-4 text-blue-600 font-black text-xs">{l.tb_produto_servico?.codigo_interno}</td>
                                                <td className="px-6 py-4 font-bold text-slate-700">{l.tb_produto_servico?.descricao}</td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-600">
                                                    {Number(l.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                                                    {l.tb_produto_servico?.unidade_medida && <span className="text-slate-400 ml-1 text-xs">{l.tb_produto_servico.unidade_medida}</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-slate-600">{fmt(parseFloat(String(l.preco_custo_aplicado)))}</td>
                                                <td className="px-6 py-4 text-right font-black text-slate-800">{fmt(parseFloat(String(l.total_calculado)))}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button onClick={() => iniciarEdicaoItem(l)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 size={16} /></button>
                                                        <button onClick={() => excluirItem(l.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                <tr>
                                    <td colSpan={5} className="px-6 py-5 text-xs font-black text-slate-400 uppercase tracking-widest">{lancamentos.length} item(ns)</td>
                                    <td className="px-6 py-5 text-right font-black text-red-600 text-xl">{fmt(totalLancamentos)}</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>
        );
    }

    // ── Lista de obras ─────────────────────────────────────────────────────────
    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-5 rounded-[26px] border border-slate-200 shadow-sm gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800">Canteiros de Obra</h2>
                    <p className="text-slate-500 font-bold mt-2">Gerencie todas as suas construções e licitações.</p>
                </div>
                {!viewForm && (
                    <button onClick={() => setViewForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl text-sm font-black shadow-lg shadow-blue-100 flex items-center gap-2 transition-all">
                        <Plus size={20} /> NOVA OBRA / LICITAÇÃO
                    </button>
                )}
            </div>

            {erro && <div className="bg-red-50 border border-red-200 text-red-700 font-bold px-6 py-4 rounded-2xl">{erro}</div>}

            {viewForm ? (
                <form onSubmit={handleSalvar} className="bg-white p-8 rounded-[28px] border border-slate-200 shadow-sm space-y-8">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                            <Building2 className="text-blue-500" />
                            {editId ? 'Editando Obra Registrada' : 'Cadastrando Novo Canteiro / Licitação'}
                        </h3>
                        <button type="button" onClick={resetForm} className="text-slate-400 hover:text-red-500 p-2 bg-slate-50 rounded-xl"><X size={20} /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Nome / Título da Obra</label>
                            <input required type="text" placeholder="Nome do residencial, prédio..." value={nome} onChange={e => setNome(e.target.value)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none focus:border-blue-500 font-medium" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Status</label>
                            <select value={status} onChange={e => setStatus(e.target.value)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none focus:border-blue-500 font-bold">
                                <option value="LICITAÇÃO">Licitação</option>
                                <option value="FUNDAÇÃO">Fundação / Início</option>
                                <option value="EXECUÇÃO">Em Execução</option>
                                <option value="ACABAMENTO">Acabamento</option>
                                <option value="FINALIZADA">Finalizada / Entregue</option>
                            </select>
                        </div>
                        <div className="lg:col-span-3 space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Endereço Completo</label>
                            <input type="text" placeholder="Localização do canteiro..." value={endereco} onChange={e => setEndereco(e.target.value)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none focus:border-blue-500 font-medium" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Eng. Responsável</label>
                            <input type="text" placeholder="Responsável Técnico" value={responsavel} onChange={e => setResponsavel(e.target.value)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none focus:border-blue-500 font-medium" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Valor do Orçamento (R$)</label>
                            <input required type="number" step="0.01" placeholder="0.00" value={valorContratado} onChange={e => setValorContratado(e.target.value)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-blue-600 font-black focus:ring-2 focus:ring-blue-500/20 focus:outline-none focus:border-blue-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Dat. Início</label>
                                <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none focus:border-blue-500 font-bold" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Previsão Tér.</label>
                                <input type="date" value={termino} onChange={e => setTermino(e.target.value)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none focus:border-blue-500 font-bold" />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button type="submit" disabled={carregando} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-10 py-4 rounded-xl font-black text-lg shadow-lg flex items-center gap-2 active:scale-95 transition-all">
                            SALVAR OBRA
                        </button>
                    </div>
                </form>
            ) : (
                <>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 max-w-sm flex items-center gap-3 focus-within:ring-4 ring-blue-50 transition-all">
                        <Search size={18} className="text-slate-400" />
                        <input type="text" placeholder="Procurar obra..." value={busca} onChange={e => setBusca(e.target.value)} className="bg-transparent border-none outline-none w-full font-bold text-sm text-slate-700" />
                    </div>

                    {filtradas.length === 0 ? (
                        <div className="bg-white rounded-[32px] border border-slate-200 p-16 text-center shadow-sm">
                            <Building2 size={64} className="mx-auto text-slate-200 mb-6" />
                            <h3 className="text-xl font-black text-slate-500 mb-2">Nenhuma obra encontrada</h3>
                            <p className="text-slate-400 font-medium">Cadastre um novo canteiro ou modifique a pesquisa.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtradas.map(o => {
                                const lucro = (Number(o.valor_contratado) || 0) - (o.gastos || 0);
                                const positivo = lucro >= 0;
                                const pie = buildPie(gastosPorGrupo[o.id] || []);
                                return (
                                    <div key={o.id} className="bg-white border border-slate-200 rounded-[26px] p-5 shadow-sm hover:shadow-xl hover:shadow-slate-200 transition-all group border-b-4 border-b-blue-600 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="bg-blue-50 text-blue-600 p-2.5 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <Building2 size={20} />
                                            </div>
                                            <div className="flex items-start gap-3">
                                                <div title={pie.title} className="w-12 h-12 rounded-full flex items-center justify-center border border-slate-200 bg-white" style={{ background: pie.gradient }}>
                                                    <div className="w-7 h-7 bg-white rounded-full border border-slate-100" />
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase ${statusColor[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status}</span>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEditar(o)} className="text-blue-600 bg-blue-50 p-2 rounded-lg hover:bg-blue-100"><Edit2 size={16} /></button>
                                                        <button onClick={() => handleExcluir(o.id)} className="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <h3 className="text-lg md:text-xl font-black text-slate-800 mb-1.5 truncate leading-tight" title={o.nome}>{o.nome}</h3>

                                        <div className="space-y-3 mb-4 flex-1">
                                            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                                                <MapPin size={14} className="text-slate-400 shrink-0" />
                                                <span className="truncate">{o.endereco || 'Endereço não informado'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                                                <HardHat size={14} className="text-slate-400 shrink-0" />
                                                <span className="truncate">{o.responsavel || 'Sem Resp. Técnico'}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                                                <Calendar size={14} className="text-slate-400 shrink-0" />
                                                {formatData(o.data_inicio)} até {formatData(o.data_termino)}
                                            </div>
                                        </div>

                                        {pie.legend.length > 0 && (
                                            <div className="flex flex-wrap gap-3 mb-4">
                                                {pie.legend.slice(0, 2).map((it: any) => (
                                                    <div key={it.label} className="flex items-center gap-2 text-[10px] font-black text-slate-500">
                                                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: it.color }} />
                                                        <span className="max-w-[120px] truncate" title={it.label}>{it.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="pt-4 border-t border-slate-100 space-y-2.5">
                                            <div className="flex justify-between items-center">
                                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Orçamento</p>
                                                <p className="text-slate-800 font-black text-sm">{fmt(Number(o.valor_contratado))}</p>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-red-400 text-xs font-bold uppercase tracking-widest">Gastos</p>
                                                <p className="text-red-600 font-black text-sm">{fmt(o.gastos || 0)}</p>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                                <div className="flex items-center gap-1.5">
                                                    {positivo ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
                                                    <p className={`text-xs font-black uppercase tracking-widest ${positivo ? 'text-emerald-500' : 'text-red-500'}`}>Lucro</p>
                                                </div>
                                                <p className={`font-black text-base ${positivo ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(lucro)}</p>
                                            </div>
                                            {/* Botão ver lançamentos */}
                                            <button
                                                onClick={() => abrirLancamentos(o)}
                                                className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 font-black text-xs rounded-xl transition-all"
                                            >
                                                <List size={14} /> VER LANÇAMENTOS
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
