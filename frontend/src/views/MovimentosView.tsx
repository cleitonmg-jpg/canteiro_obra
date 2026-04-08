import { useState, useEffect } from 'react';
import { Plus, Trash2, Search, Calculator, CheckCircle2, List, X, FolderOpen } from 'lucide-react';

import { API } from '../config';
import { formatBRL } from '../utils/format';
import { DEFAULT_OBRA_FILTRO_STATUS, matchesObraFiltroStatus, OBRA_FILTRO_STATUS_OPTIONS, obraFiltroLabel, type ObraFiltroStatus } from '../utils/obraStatus';

interface Obra {
    id: number;
    nome: string;
    status?: string;
    valor_contratado?: number;
    gastos?: number;
    id_canteiro?: number | null;
    tb_canteiro?: { id: number; nome: string } | null;
}
interface Canteiro { id: number; nome: string; responsavel?: string; }
interface Produto { id: number; codigo_interno: string; descricao: string; preco_custo: number; unidade_medida?: string; }
interface Grupo { id: number; codigo?: string; descricao: string; }
interface ItemCesta {
    _key: number;
    produto: Produto;
    quantidade: number;
    precoUnit: number;
    total: number;
}

export const MovimentosView = () => {
    const [obras, setObras] = useState<Obra[]>([]);
    const [canteiros, setCanteiros] = useState<Canteiro[]>([]);
    const [grupos, setGrupos] = useState<Grupo[]>([]);
    const [filtroStatusObra, setFiltroStatusObra] = useState<ObraFiltroStatus>(DEFAULT_OBRA_FILTRO_STATUS);
    // Filtro de canteiro no painel "Dados Principais" (seleciona canteiro ? filtra obras)
    const [canteiroSel, setCanteiroSel] = useState('');
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [obraId, setObraId] = useState('');
    const [data, setData] = useState(new Date().toISOString().split('T')[0]);
    const [itens, setItens] = useState<ItemCesta[]>([]);
    const [buscaProduto, setBuscaProduto] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [catalogOpen, setCatalogOpen] = useState(false);
    const [catalogBusca, setCatalogBusca] = useState('');
    const [cadastroItemOpen, setCadastroItemOpen] = useState(false);
    const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
    const [quantidade, setQuantidade] = useState('1');
    const [precoUnit, setPrecoUnit] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [erro, setErro] = useState('');
    const [aviso, setAviso] = useState('');
    const [novoTipo, setNovoTipo] = useState<'PRODUTO' | 'SERVICO'>('PRODUTO');
    const [novoDescricao, setNovoDescricao] = useState('');
    const [novoUnidade, setNovoUnidade] = useState('UN');
    const [novoPreco, setNovoPreco] = useState('');
    const [novoGrupoId, setNovoGrupoId] = useState('');
    const [salvandoNovoItem, setSalvandoNovoItem] = useState(false);
    const [historico, setHistorico] = useState<any[]>([]);
    const [loadingHistorico, setLoadingHistorico] = useState(false);

    const carregarProdutos = async () => {
        const res = await fetch(`${API}/api/produtos`);
        const data = await res.json();
        setProdutos(Array.isArray(data) ? data : []);
        return Array.isArray(data) ? data : [];
    };

    useEffect(() => {
        Promise.all([
            fetch(`${API}/api/obras`).then(r => r.json()),
            carregarProdutos(),
            fetch(`${API}/api/canteiros/lista`).then(r => r.ok ? r.json() : []),
            fetch(`${API}/api/grupos`).then(r => r.ok ? r.json() : []),
        ]).then(([obrasData, produtosData, canteirosData, gruposData]) => {
            const obrasLista: Obra[] = Array.isArray(obrasData) ? obrasData : [];
            setObras(obrasLista);
            setProdutos(Array.isArray(produtosData) ? produtosData : []);
            setCanteiros(Array.isArray(canteirosData) ? canteirosData : []);
            setGrupos(Array.isArray(gruposData) ? gruposData : []);
            const selecionaveis = obrasLista.filter(o => matchesObraFiltroStatus(o.status, DEFAULT_OBRA_FILTRO_STATUS));
            if (selecionaveis.length) setObraId(String(selecionaveis[0].id));
            else if (obrasLista.length) setObraId(String(obrasLista[0].id));
        }).catch(() => setErro('Não foi possível conectar ao servidor.'));
    }, []);

    const carregarHistorico = (idObra: string) => {
        if (!idObra) return;
        setLoadingHistorico(true);
        fetch(`${API}/api/lancamentos?id_obra=${idObra}`)
            .then(r => r.json())
            .then(d => setHistorico(Array.isArray(d) ? d : []))
            .catch(() => {})
            .finally(() => setLoadingHistorico(false));
    };

    useEffect(() => { carregarHistorico(obraId); }, [obraId]);

    const obrasPorStatus = obras.filter(o => matchesObraFiltroStatus(o.status, filtroStatusObra));

    // Obras filtradas pelo canteiro selecionado (se nenhum, mostra todas)
    const obrasFiltradas = canteiroSel
        ? obrasPorStatus.filter(o => String(o.id_canteiro) === canteiroSel)
        : obrasPorStatus;

    useEffect(() => {
        if (!obrasFiltradas.length) {
            if (obraId) setObraId('');
            return;
        }
        const existe = obrasFiltradas.some(o => String(o.id) === obraId);
        if (!existe) setObraId(String(obrasFiltradas[0].id));
    }, [canteiroSel, filtroStatusObra, obras]);

    const produtosFiltrados = produtos.filter(p =>
        p.descricao.toLowerCase().includes(buscaProduto.toLowerCase()) ||
        (p.codigo_interno || '').toLowerCase().includes(buscaProduto.toLowerCase())
    );

    const produtosCatalogoFiltrados = produtos.filter(p =>
        p.descricao.toLowerCase().includes(catalogBusca.toLowerCase()) ||
        (p.codigo_interno || '').toLowerCase().includes(catalogBusca.toLowerCase())
    );

    const handleSelectProduto = (p: Produto) => {
        setProdutoSelecionado(p);
        setBuscaProduto('');
        setShowResults(false);
        setQuantidade('1');
        setPrecoUnit(String(p.preco_custo));
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!produtoSelecionado) return;
        const q = parseFloat(quantidade.replace(',', '.'));
        const p = parseFloat(precoUnit.replace(',', '.'));
        if (!Number.isFinite(q) || q <= 0) {
            setErro('Quantidade inválida.');
            return;
        }
        if (!Number.isFinite(p) || p < 0) {
            setErro('Preço inválido.');
            return;
        }
        setItens([...itens, { _key: Date.now(), produto: produtoSelecionado, quantidade: q, precoUnit: p, total: q * p }]);
        setProdutoSelecionado(null);
        setQuantidade('1');
        setPrecoUnit('');
    };

    const handleCadastrarNovoItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!novoDescricao.trim()) {
            setErro('Descrição do item — obrigatória.');
            return;
        }

        setSalvandoNovoItem(true);
        setErro('');

        try {
            const res = await fetch(`${API}/api/produtos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tipo: novoTipo,
                    descricao: novoDescricao.trim(),
                    unidade_medida: novoUnidade.trim() || null,
                    preco_custo: parseFloat(String(novoPreco || '0').replace(',', '.')) || 0,
                    id_grupo: novoGrupoId ? parseInt(novoGrupoId, 10) : null,
                }),
            });

            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.erro || 'Não foi possível cadastrar o item.');

            const listaAtualizada = await carregarProdutos();
            const criado = listaAtualizada.find((p) => p.id === body.id) || body;

            if (criado?.id) {
                handleSelectProduto(criado);
                setCatalogOpen(false);
            }

            resetCadastroNovoItem();
        } catch (err: any) {
            setErro(err?.message || 'Não foi possível cadastrar o item.');
        } finally {
            setSalvandoNovoItem(false);
        }
    };

    const resetCadastroNovoItem = () => {
        setCadastroItemOpen(false);
        setNovoTipo('PRODUTO');
        setNovoDescricao('');
        setNovoUnidade('UN');
        setNovoPreco('');
        setNovoGrupoId('');
    };

    const fecharCatalogo = () => {
        setCatalogOpen(false);
        resetCadastroNovoItem();
    };

    const handleFinalizar = async () => {
        if (!itens.length || !obraId) return;
        setAviso('');
        const obraAtual = obras.find((o) => String(o.id) === obraId);
        if (obraAtual) {
            const orcamento = parseFloat(String(obraAtual.valor_contratado || 0)) || 0;
            const gastosAtuais = historico.length > 0
                ? historico.reduce((acc, h) => acc + (parseFloat(String(h?.total_calculado ?? 0)) || 0), 0)
                : (parseFloat(String(obraAtual.gastos || 0)) || 0);
            const lucroAposLancamento = orcamento - (gastosAtuais + totalGeral);
            if (lucroAposLancamento < 0) {
                const msg = `Atenção: este lançamento deixa a obra com prejuízo de ${formatBRL(Math.abs(lucroAposLancamento))}.`;
                setAviso(msg);
            }
        }

        setCarregando(true);
        setErro('');
        try {
            const res = await fetch(`${API}/api/lancamentos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id_obra: parseInt(obraId),
                    data_movimentacao: data,
                    itens: itens.map(i => ({ id_produto_servico: i.produto.id, quantidade: i.quantidade, preco_unit: i.precoUnit })),
                }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body?.erro || 'Falha ao salvar lançamento.');
            setItens([]);
            setSucesso(true);
            setTimeout(() => setSucesso(false), 3000);
            carregarHistorico(obraId);
            fetch(`${API}/api/obras`).then(r => r.json()).then((d) => setObras(Array.isArray(d) ? d : [])).catch(() => { });
        } catch (err: any) {
            setErro(err?.message || 'Erro ao finalizar lançamento. Verifique a conexão.');
        } finally {
            setCarregando(false);
        }
    };

    const totalGeral = itens.reduce((acc, i) => acc + i.total, 0);

    // Nome da obra selecionada para exibir no hist—rico
    const obraNomeSel = obras.find(o => String(o.id) === obraId)?.nome || '';

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800">Lançamento na Obra</h2>
                    <p className="text-slate-500 font-bold mt-2">Registro de materiais e serviços aplicados na obra.</p>
                </div>
                <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl"><Calculator size={28} /></div>
            </div>

            {erro && <div className="bg-red-50 border border-red-200 text-red-700 font-bold px-6 py-4 rounded-2xl">{erro}</div>}
            {aviso && <div className="bg-amber-50 border border-amber-200 text-amber-800 font-bold px-6 py-4 rounded-2xl">{aviso}</div>}
            {sucesso && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-6 py-4 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 size={20} /> Lançamento finalizado e salvo com sucesso!
                </div>
            )}

            {catalogOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
                    <button type="button" aria-label="Fechar" onClick={fecharCatalogo} className="absolute inset-0 bg-slate-900/40" />
                    <div className="relative bg-white w-full md:w-[900px] max-h-[85vh] overflow-hidden rounded-t-3xl md:rounded-3xl border border-slate-200 shadow-2xl">
                        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
                            <h3 className="text-lg font-black text-slate-800">Catálogo de Itens e Serviços</h3>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCadastroItemOpen((v) => !v);
                                        if (!cadastroItemOpen) setNovoDescricao(catalogBusca || '');
                                    }}
                                    className="flex items-center gap-2 text-xs font-black text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-500 px-3 py-1.5 rounded-xl transition-all"
                                >
                                    <Plus size={14} /> {cadastroItemOpen ? 'FECHAR CADASTRO' : 'CADASTRAR ITEM'}
                                </button>
                                <button type="button" onClick={fecharCatalogo} className="p-2 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-900">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="p-6 space-y-4 overflow-auto max-h-[calc(85vh-64px)]">
                            <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl flex items-center gap-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                                <Search size={18} className="text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por código ou descrição..."
                                    className="bg-transparent border-none outline-none w-full font-bold text-sm text-slate-700"
                                    value={catalogBusca}
                                    onChange={(e) => setCatalogBusca(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            {cadastroItemOpen && (
                                <form onSubmit={handleCadastrarNovoItem} className="border border-blue-200 bg-blue-50/40 rounded-2xl p-4 space-y-4">
                                    <p className="text-sm font-black text-blue-700">Cadastrar novo item no catálogo</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo</label>
                                            <select
                                                value={novoTipo}
                                                onChange={(e) => setNovoTipo(e.target.value as 'PRODUTO' | 'SERVICO')}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-sm text-slate-700 outline-none focus:border-blue-500"
                                            >
                                                <option value="PRODUTO">Produto</option>
                                                <option value="SERVICO">Serviço</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Unidade</label>
                                            <input
                                                type="text"
                                                value={novoUnidade}
                                                onChange={(e) => setNovoUnidade(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-sm text-slate-700 outline-none focus:border-blue-500"
                                                placeholder="UN"
                                            />
                                        </div>
                                        <div className="md:col-span-2 space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Descrição *</label>
                                            <input
                                                required
                                                type="text"
                                                value={novoDescricao}
                                                onChange={(e) => setNovoDescricao(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-sm text-slate-700 outline-none focus:border-blue-500"
                                                placeholder="Ex.: Cimento CP-II 50kg"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Preço de custo</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={novoPreco}
                                                onChange={(e) => setNovoPreco(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-sm text-slate-700 outline-none focus:border-blue-500"
                                                placeholder="0,00"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Grupo (opcional)</label>
                                            <select
                                                value={novoGrupoId}
                                                onChange={(e) => setNovoGrupoId(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 font-bold text-sm text-slate-700 outline-none focus:border-blue-500"
                                            >
                                                <option value="">Sem grupo</option>
                                                {grupos.map((g) => (
                                                    <option key={g.id} value={g.id}>
                                                        {g.codigo ? `${g.codigo} - ` : ''}{g.descricao}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end">
                                        <button
                                            type="submit"
                                            disabled={salvandoNovoItem}
                                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2"
                                        >
                                            <Plus size={14} /> {salvandoNovoItem ? 'SALVANDO...' : 'SALVAR E USAR NO LANÇAMENTO'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            <div className="space-y-2">
                                {produtosCatalogoFiltrados.slice(0, 80).map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => { handleSelectProduto(p); setCatalogOpen(false); }}
                                        className="w-full text-left p-4 border border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-slate-50 transition-all"
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="font-black text-slate-800">{p.descricao}</p>
                                                <p className="text-xs font-bold text-slate-500 mt-1">
                                                    {p.codigo_interno} {p.unidade_medida ? `• ${p.unidade_medida}` : ''}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Custo</p>
                                                <p className="text-sm font-black text-blue-600">{formatBRL(p.preco_custo || 0)}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                                {produtosCatalogoFiltrados.length > 80 && (
                                    <p className="text-xs font-bold text-slate-400 text-center pt-2">
                                        Refine a busca para ver mais resultados.
                                    </p>
                                )}
                                {produtosCatalogoFiltrados.length === 0 && (
                                    <p className="text-xs font-bold text-slate-500 text-center pt-2">
                                        Nenhum item encontrado. Use o botão <span className="text-blue-600">Cadastrar item</span> para incluir um novo.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Esquerda */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm space-y-6">
                        <h3 className="text-xl font-black text-slate-800 border-b border-slate-100 pb-4">Dados Principais</h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                    <List size={13} className="text-blue-400" /> Status da Obra
                                </label>
                                <select
                                    value={filtroStatusObra}
                                    onChange={(e) => setFiltroStatusObra(e.target.value as ObraFiltroStatus)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                                    title={`Filtro de obras: ${obraFiltroLabel(filtroStatusObra)}`}
                                >
                                    {OBRA_FILTRO_STATUS_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Seleção em 2 passos: Canteiro ? Obra */}
                            {canteiros.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1.5">
                                        <FolderOpen size={13} className="text-blue-400" /> Canteiro
                                    </label>
                                    <select value={canteiroSel}
                                        onChange={e => {
                                            const v = e.target.value;
                                            setCanteiroSel(v);
                                            const lista = v
                                                ? obrasPorStatus.filter(o => String(o.id_canteiro) === v)
                                                : obrasPorStatus;
                                            setObraId(lista.length ? String(lista[0].id) : '');
                                        }}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 transition-all text-sm">
                                        <option value="">— Todos os canteiros —</option>
                                        {canteiros.map(c => (
                                            <option key={c.id} value={c.id}>{c.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Selecionar Obra *</label>
                                <select value={obraId} onChange={e => setObraId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 font-bold text-slate-700 outline-none focus:border-blue-500 transition-all">
                                    {obrasFiltradas.length === 0
                                        ? <option value="">Nenhuma obra {canteiroSel ? 'neste canteiro' : 'cadastrada'}</option>
                                        : obrasFiltradas.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)
                                    }
                                </select>
                                {canteiroSel && obrasFiltradas.length === 0 && (
                                    <p className="text-[10px] font-bold text-amber-600 ml-1">
                                        Nenhuma obra vinculada a este canteiro. Cadastre a obra no menu "Obras".
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Data do Lançamento</label>
                                <input type="date" value={data} onChange={e => setData(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 font-bold text-slate-700 outline-none focus:border-blue-500 transition-all" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm space-y-6 overflow-visible relative">
                        <h3 className="text-xl font-black text-slate-800 border-b border-slate-100 pb-4">Adicionar Item</h3>
                        {!produtoSelecionado ? (
                            <div className="relative">
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 block">Buscar Produto/Serviço</label>
                                    <button
                                        type="button"
                                        onClick={() => { setCatalogBusca(''); setCatalogOpen(true); }}
                                        className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-500 px-3 py-1.5 rounded-xl transition-all"
                                    >
                                        <List size={14} /> CATÁLOGO
                                    </button>
                                </div>
                                <div className="bg-slate-50 border border-slate-200 px-4 py-3.5 rounded-xl flex items-center gap-3 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                                    <Search size={20} className="text-slate-400" />
                                    <input type="text" placeholder="Código ou descrição..." className="bg-transparent border-none outline-none w-full font-bold text-sm text-slate-700"
                                        value={buscaProduto} onChange={e => { setBuscaProduto(e.target.value); setShowResults(true); }} onFocus={() => setShowResults(true)} />
                                </div>
                                {showResults && buscaProduto.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-20">
                                        {produtosFiltrados.length > 0 ? produtosFiltrados.map(p => (
                                            <div key={p.id} onClick={() => handleSelectProduto(p)} className="p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 transition-colors">
                                                <p className="font-bold text-slate-800">{p.descricao}</p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{p.codigo_interno}</span>
                                                    <span className="text-xs font-black text-slate-600">{formatBRL(p.preco_custo)}</span>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="p-4 text-center text-sm font-bold text-slate-400">Nenhum item encontrado.</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <form onSubmit={handleAddItem} className="space-y-4">
                                <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl flex justify-between items-start">
                                    <div>
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{produtoSelecionado.codigo_interno}</p>
                                        <p className="font-bold text-slate-800 leading-tight mt-1">{produtoSelecionado.descricao}</p>
                                    </div>
                                    <button type="button" onClick={() => setProdutoSelecionado(null)} className="text-slate-400 hover:text-red-500 bg-white rounded-full p-1.5 shadow-sm">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantidade</label>
                                        <input required type="number" step="0.001" value={quantidade} onChange={e => setQuantidade(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Preço (R$)</label>
                                        <input required type="number" step="0.01" value={precoUnit} onChange={e => setPrecoUnit(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-black text-blue-600 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
                                    </div>
                                </div>
                                <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg">
                                    <Plus size={18} /> INSERIR ITEM
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Direita - Cesta */}
                <div className="lg:col-span-2 flex flex-col h-[520px] md:h-[640px] lg:h-[700px] bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden relative">
                    <div className="bg-slate-50/80 p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="text-xl font-black text-slate-800">Cesta de Itens Lançados</h3>
                            {obraNomeSel && (
                                <p className="text-xs font-bold text-blue-600 mt-0.5 flex items-center gap-1">
                                    <FolderOpen size={11} /> {obraNomeSel}
                                </p>
                            )}
                        </div>
                        <span className="bg-white px-3 py-1 rounded-full text-xs font-black text-blue-600 shadow-sm border border-slate-100">{itens.length} iten(s)</span>
                    </div>

                    <div className="flex-1 overflow-y-auto w-full">
                        {itens.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10">
                                <div className="bg-slate-50 p-6 rounded-full mb-4 inline-flex shadow-inner"><Search size={48} className="text-slate-200" /></div>
                                <p className="font-bold text-lg text-slate-500">Nenhum item lançado ainda.</p>
                                <p className="text-sm font-medium mt-1">Busque por materiais ou serviços para inserir.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest sticky top-0 bg-white/95 backdrop-blur z-10">
                                    <tr>
                                        <th className="px-6 py-5 border-b border-slate-100">Produto/Serviço</th>
                                        <th className="px-6 py-5 border-b border-slate-100 text-center">Qtd x Preço</th>
                                        <th className="px-6 py-5 border-b border-slate-100 text-right">Total</th>
                                        <th className="px-6 py-5 border-b border-slate-100 w-16"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itens.map((i, idx) => (
                                        <tr key={i._key} className="hover:bg-slate-50/50 group transition-colors">
                                            <td className="px-6 py-5 border-b border-slate-50">
                                                <div className="flex items-center gap-4">
                                                    <span className="text-slate-300 font-bold text-xs">{String(idx + 1).padStart(2, '0')}</span>
                                                    <div>
                                                        <p className="font-bold text-slate-700">{i.produto.descricao}</p>
                                                        <p className="text-[10px] font-black text-blue-500 mt-0.5">{i.produto.codigo_interno}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 border-b border-slate-50 text-center text-sm font-medium text-slate-500">
                                                {i.quantidade} <span className="text-slate-300 mx-1">x</span> {formatBRL(i.precoUnit)}
                                            </td>
                                            <td className="px-6 py-5 border-b border-slate-50 text-right font-black text-slate-800 text-lg">
                                                {formatBRL(i.total)}
                                            </td>
                                            <td className="px-6 py-5 border-b border-slate-50 text-right">
                                                <button onClick={() => setItens(itens.filter(x => x._key !== i._key))} className="text-slate-300 hover:text-red-500 p-2.5 opacity-0 group-hover:opacity-100 transition-all bg-white rounded-xl shadow-sm border border-slate-100">
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="bg-slate-900 px-5 py-4 text-white shrink-0 rounded-2xl shadow-lg shadow-slate-900/20">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Total do Lançamento</span>
                            <span className="text-2xl md:text-3xl font-black tracking-tighter text-emerald-400">{formatBRL(totalGeral)}</span>
                        </div>
                        <button
                            onClick={handleFinalizar}
                            disabled={itens.length === 0 || carregando || !obraId}
                            title={!obraId ? 'Selecione uma obra para finalizar.' : itens.length === 0 ? 'Adicione itens para finalizar.' : undefined}
                            className={`w-full ${itens.length > 0 && obraId ? 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/30' : 'bg-slate-800 text-slate-500 cursor-not-allowed'} text-white py-3 rounded-2xl font-black text-sm md:text-base flex items-center justify-center gap-3 active:scale-95 transition-all`}>
                            <CheckCircle2 size={18} />
                            {carregando
                                ? 'SALVANDO...'
                                : !obraId
                                    ? 'SELECIONE UMA OBRA'
                                    : itens.length === 0
                                        ? 'ADICIONE ITENS'
                                        : 'FINALIZAR LANÇAMENTO'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Histórico da obra selecionada */}
            {obraId && (
                <div className="bg-white border border-slate-200 rounded-[28px] overflow-hidden shadow-sm">
                    <div className="px-6 md:px-8 py-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-black text-slate-800">Histórico da Obra</h3>
                            {obraNomeSel && <p className="text-xs text-blue-600 font-bold">{obraNomeSel}</p>}
                        </div>
                        <span className="text-xs font-black text-slate-400">{historico.length} lançamento(s)</span>
                    </div>
                    {loadingHistorico ? (
                        <div className="py-8 text-center text-slate-400 font-bold">Carregando...</div>
                    ) : historico.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 font-bold">Nenhum lançamento nesta obra.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Data</th>
                                        <th className="px-6 py-4">Produto / Serviço</th>
                                        <th className="px-6 py-4 text-center">Qtd</th>
                                        <th className="px-6 py-4 text-right">Unit.</th>
                                        <th className="px-6 py-4 text-right">Total</th>
                                        <th className="px-6 py-4 w-14"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {[...historico].sort((a, b) => new Date(b.data_movimentacao).getTime() - new Date(a.data_movimentacao).getTime()).map((l: any) => (
                                        <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-xs font-bold text-slate-400">
                                                {new Date(l.data_movimentacao).toLocaleDateString('pt-BR')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-700 text-sm">{l?.tb_produto_servico?.descricao || '—'}</p>
                                                <p className="text-[10px] font-black text-blue-500">{l?.tb_produto_servico?.codigo_interno}</p>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold text-slate-600 text-sm">
                                                {Number(l.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}
                                                {l?.tb_produto_servico?.unidade_medida && <span className="text-slate-400 ml-1 text-xs">{l.tb_produto_servico.unidade_medida}</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-500 text-sm">{formatBRL(Number(l.preco_custo_aplicado || 0))}</td>
                                            <td className="px-6 py-4 text-right font-black text-slate-800">{formatBRL(Number(l.total_calculado || 0))}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={async () => {
                                                        if (!window.confirm('Excluir este lançamento?')) return;
                                                        await fetch(`${API}/api/lancamentos/${l.id}`, { method: 'DELETE' });
                                                        carregarHistorico(obraId);
                                                    }}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                    <tr>
                                        <td colSpan={4} className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">{historico.length} item(ns)</td>
                                        <td className="px-6 py-4 text-right font-black text-slate-700">
                                            {formatBRL(historico.reduce((acc: number, l: any) => acc + Number(l.total_calculado || 0), 0))}
                                        </td>
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
