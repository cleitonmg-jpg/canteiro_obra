import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Package, Search, X } from 'lucide-react';

import { API } from '../config';
import { formatBRL } from '../utils/format';

interface Grupo {
    id: number;
    codigo: string;
    descricao: string;
}

interface Produto {
    id: number;
    codigo_interno: string;
    tipo: 'PRODUTO' | 'SERVICO';
    descricao: string;
    unidade_medida: string;
    preco_custo: number;
    id_grupo: number | null;
    tb_grupo?: Grupo | null;
}

type ProdutosViewProps = {
    buscaExterna?: string;
    cadastroDescricaoExterna?: string;
    onCadastroDescricaoConsumida?: () => void;
};

export const ProdutosView = ({ buscaExterna, cadastroDescricaoExterna, onCadastroDescricaoConsumida }: ProdutosViewProps) => {
    const [viewForm, setViewForm] = useState(false);
    const [produtos, setProdutos] = useState<Produto[]>([]);
    const [grupos, setGrupos] = useState<Grupo[]>([]);
    const [busca, setBusca] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');

    // Form fields
    const [editId, setEditId] = useState<number | null>(null);
    const [tipo, setTipo] = useState<'PRODUTO' | 'SERVICO'>('PRODUTO');
    const [descricao, setDescricao] = useState('');
    const [unidade, setUnidade] = useState('');
    const [preco, setPreco] = useState('');
    const [idGrupo, setIdGrupo] = useState('');

    const carregar = async () => {
        try {
            const [resProd, resGrupos] = await Promise.all([
                fetch(`${API}/api/produtos`),
                fetch(`${API}/api/grupos`),
            ]);
            setProdutos(await resProd.json());
            setGrupos(await resGrupos.json());
        } catch {
            setErro('Não foi possível conectar ao servidor.');
        }
    };

    useEffect(() => { carregar(); }, []);

    useEffect(() => {
        if (typeof buscaExterna === 'string') setBusca(buscaExterna);
    }, [buscaExterna]);

    useEffect(() => {
        if (typeof cadastroDescricaoExterna !== 'string' || !cadastroDescricaoExterna.trim()) return;
        setEditId(null);
        setTipo('PRODUTO');
        setDescricao(cadastroDescricaoExterna.trim());
        setUnidade('UN');
        setPreco('0');
        setIdGrupo('');
        setViewForm(true);
        onCadastroDescricaoConsumida?.();
    }, [cadastroDescricaoExterna, onCadastroDescricaoConsumida]);

    const resetForm = () => {
        setEditId(null);
        setTipo('PRODUTO');
        setDescricao('');
        setUnidade('');
        setPreco('');
        setIdGrupo('');
        setViewForm(false);
    };

    const handleSalvar = async (e: React.FormEvent) => {
        e.preventDefault();
        setCarregando(true);
        setErro('');
        try {
            const body = {
                tipo,
                descricao,
                unidade_medida: unidade,
                preco_custo: parseFloat(preco.replace(',', '.')) || 0,
                id_grupo: idGrupo ? parseInt(idGrupo, 10) : null,
            };

            if (editId !== null) {
                const res = await fetch(`${API}/api/produtos/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error();
            } else {
                const res = await fetch(`${API}/api/produtos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                if (!res.ok) throw new Error();
            }
            await carregar();
            resetForm();
        } catch {
            setErro('Erro ao salvar. Verifique a conexão com o servidor.');
        } finally {
            setCarregando(false);
        }
    };

    const handleEditar = (p: Produto) => {
        setEditId(p.id);
        setTipo(p.tipo);
        setDescricao(p.descricao);
        setUnidade(p.unidade_medida || '');
        setPreco(String(p.preco_custo));
        setIdGrupo(p.id_grupo ? String(p.id_grupo) : '');
        setViewForm(true);
    };

    const handleExcluir = async (id: number) => {
        if (!window.confirm('Excluir este item?')) return;
        try {
            const res = await fetch(`${API}/api/produtos/${id}`, { method: 'DELETE' });
            const body = await res.json().catch(() => ({} as any));
            if (!res.ok) throw new Error(body.erro || 'Erro ao excluir item.');
            await carregar();
        } catch (e: any) {
            setErro(e?.message || 'Erro ao excluir item.');
        }
    };

    const filtrados = produtos.filter(p =>
        p.descricao.toLowerCase().includes(busca.toLowerCase()) ||
        (p.codigo_interno || '').toLowerCase().includes(busca.toLowerCase())
    );

    const badgeTipo = (t: 'PRODUTO' | 'SERVICO') =>
        t === 'PRODUTO'
            ? <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-black">PRODUTO</span>
            : <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-black">SERVIÇO</span>;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800">Produtos e Serviços</h2>
                    <p className="text-slate-500 font-bold mt-2">Catálogo mestre. Busque pela descrição ou código.</p>
                </div>
                {!viewForm && (
                    <button onClick={() => setViewForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 shadow-xl shadow-blue-100 transition-all">
                        <Plus size={20} /> NOVO ITEM
                    </button>
                )}
            </div>

            {erro && (
                <div className="bg-red-50 border border-red-200 text-red-700 font-bold px-6 py-4 rounded-2xl">
                    {erro}
                </div>
            )}

            {viewForm ? (
                <form onSubmit={handleSalvar} className="bg-white p-8 rounded-[28px] border border-slate-200 shadow-sm space-y-8">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                            <Package className="text-blue-500" />
                            {editId !== null ? 'Editando Item' : 'Cadastrando Novo Item'}
                        </h3>
                        <button type="button" onClick={resetForm} className="text-slate-400 hover:text-red-500 transition-colors p-2 bg-slate-50 rounded-xl">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Tipo */}
                        <div className="md:col-span-3 space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Tipo de Item</label>
                            <div className="flex gap-4">
                                <label className={`flex items-center gap-3 px-6 py-3.5 rounded-xl border-2 cursor-pointer font-black transition-all ${tipo === 'PRODUTO' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}>
                                    <input type="radio" name="tipo" value="PRODUTO" checked={tipo === 'PRODUTO'} onChange={() => setTipo('PRODUTO')} className="hidden" />
                                    <Package size={18} /> PRODUTO
                                    <span className="text-xs font-medium text-slate-400">(PR-XXXX)</span>
                                </label>
                                <label className={`flex items-center gap-3 px-6 py-3.5 rounded-xl border-2 cursor-pointer font-black transition-all ${tipo === 'SERVICO' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}>
                                    <input type="radio" name="tipo" value="SERVICO" checked={tipo === 'SERVICO'} onChange={() => setTipo('SERVICO')} className="hidden" />
                                    ⚙️ SERVIÇO
                                    <span className="text-xs font-medium text-slate-400">(SV-XXXX)</span>
                                </label>
                            </div>
                        </div>

                        {/* Descrição */}
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Descrição</label>
                            <input required type="text" placeholder="Nome do produto ou serviço" value={descricao} onChange={e => setDescricao(e.target.value)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium" />
                        </div>

                        {/* Grupo */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Grupo</label>
                            <select required value={idGrupo} onChange={e => setIdGrupo(e.target.value)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold">
                                <option value="">Selecionar...</option>
                                {grupos.map(g => (
                                    <option key={g.id} value={g.id}>{g.codigo} — {g.descricao}</option>
                                ))}
                            </select>
                        </div>

                        {/* Unidade */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Unid. Medida</label>
                            <input required type="text" placeholder="Ex: Saco, Hora, Metro" value={unidade} onChange={e => setUnidade(e.target.value)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium" />
                        </div>

                        {/* Preço */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Preço Custo (R$)</label>
                            <input required type="number" step="0.01" placeholder="0.00" value={preco} onChange={e => setPreco(e.target.value)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-black text-blue-600" />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button type="submit" disabled={carregando} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-10 py-4 rounded-xl font-black text-lg shadow-lg flex items-center gap-2 transform active:scale-95 transition-all">
                            SALVAR DADOS
                        </button>
                    </div>
                </form>
            ) : (
                <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                        <div className="flex-1 bg-white border border-slate-200 px-5 py-3.5 rounded-xl flex items-center gap-3 shadow-sm focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                            <Search size={20} className="text-slate-400" />
                            <input type="text" placeholder="Pesquisar por descrição ou código..." value={busca} onChange={e => setBusca(e.target.value)} className="bg-transparent border-none outline-none w-full font-bold text-sm text-slate-700" />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-8 py-5">Código</th>
                                    <th className="px-8 py-5">Tipo</th>
                                    <th className="px-8 py-5">Descrição</th>
                                    <th className="px-8 py-5">Grupo</th>
                                    <th className="px-8 py-5">Unidade</th>
                                    <th className="px-8 py-5">Preço</th>
                                    <th className="px-8 py-5 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                                {filtrados.length > 0 ? filtrados.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-5 text-blue-600 font-black">{p.codigo_interno}</td>
                                        <td className="px-8 py-5">{badgeTipo(p.tipo)}</td>
                                        <td className="px-8 py-5 text-slate-800 font-bold">{p.descricao}</td>
                                        <td className="px-8 py-5">
                                            {p.tb_grupo
                                                ? <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-500">{p.tb_grupo.descricao}</span>
                                                : <span className="text-slate-300">—</span>
                                            }
                                        </td>
                                        <td className="px-8 py-5">{p.unidade_medida}</td>
                                        <td className="px-8 py-5 font-black text-slate-800">{formatBRL(p.preco_custo)}</td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEditar(p)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 size={18} /></button>
                                                <button onClick={() => handleExcluir(p.id)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={7} className="px-8 py-12 text-center text-slate-400 font-bold">Nenhum registro encontrado.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
