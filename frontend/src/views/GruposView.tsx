import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag, Search } from 'lucide-react';

import { API } from '../config';

interface Grupo {
    id: number;
    codigo: string;
    descricao: string;
}

export const GruposView = ({ buscaExterna }: any) => {
    const [grupos, setGrupos] = useState<Grupo[]>([]);
    const [descricao, setDescricao] = useState('');
    const [editId, setEditId] = useState<number | null>(null);
    const [busca, setBusca] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');

    const carregar = async () => {
        try {
            const res = await fetch(`${API}/api/grupos`);
            const dados = await res.json();
            setGrupos(dados);
        } catch {
            setErro('Não foi possível conectar ao servidor.');
        }
    };

    useEffect(() => { carregar(); }, []);

    useEffect(() => {
        if (typeof buscaExterna === 'string') setBusca(buscaExterna);
    }, [buscaExterna]);

    const handleSalvar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!descricao.trim()) return;
        setCarregando(true);
        setErro('');
        try {
            if (editId !== null) {
                const res = await fetch(`${API}/api/grupos/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ descricao }),
                });
                if (!res.ok) throw new Error();
            } else {
                const res = await fetch(`${API}/api/grupos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ descricao }),
                });
                if (!res.ok) throw new Error();
            }
            await carregar();
            setDescricao('');
            setEditId(null);
        } catch {
            setErro('Erro ao salvar. Verifique a conexão com o servidor.');
        } finally {
            setCarregando(false);
        }
    };

    const handleEditar = (g: Grupo) => {
        setEditId(g.id);
        setDescricao(g.descricao);
    };

    const handleExcluir = async (id: number) => {
        if (!window.confirm('Excluir este grupo?')) return;
        try {
            const res = await fetch(`${API}/api/grupos/${id}`, { method: 'DELETE' });
            const body = await res.json().catch(() => ({} as any));
            if (!res.ok) throw new Error(body.erro || 'Erro ao excluir grupo.');
            await carregar();
        } catch (e: any) {
            setErro(e?.message || 'Erro ao excluir grupo.');
        }
    };

    const filtrados = grupos.filter(g =>
        g.descricao.toLowerCase().includes(busca.toLowerCase()) ||
        (g.codigo || '').toLowerCase().includes(busca.toLowerCase())
    );

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800">Grupos de Itens</h2>
                    <p className="text-slate-500 font-bold mt-2">Classificações para materiais e serviços.</p>
                </div>
                <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl">
                    <Tag size={28} />
                </div>
            </div>

            {erro && (
                <div className="bg-red-50 border border-red-200 text-red-700 font-bold px-6 py-4 rounded-2xl">
                    {erro}
                </div>
            )}

            {/* Formulário Add/Edit */}
            <form onSubmit={handleSalvar} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full space-y-2">
                    <label className="text-sm font-bold text-slate-700 ml-1">
                        {editId !== null ? 'Editando Grupo' : 'Novo Grupo'}
                    </label>
                    <input
                        type="text"
                        placeholder="Ex: Pintura, Acabamento..."
                        className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        required
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        type="submit"
                        disabled={carregando}
                        className="flex-1 md:flex-none justify-center bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-8 py-3.5 rounded-xl font-black shadow-lg shadow-blue-100 flex items-center gap-2 transform active:scale-95 transition-all md:h-[54px]"
                    >
                        {editId !== null ? <><Edit2 size={18} /> ATUALIZAR</> : <><Plus size={18} /> ADICIONAR</>}
                    </button>
                    {editId !== null && (
                        <button
                            type="button"
                            onClick={() => { setEditId(null); setDescricao(''); }}
                            className="flex-1 md:flex-none justify-center bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-6 py-3.5 rounded-xl md:h-[54px] transition-all"
                        >
                            CANCELAR
                        </button>
                    )}
                </div>
            </form>

            {/* Lista com Pesquisa */}
            <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <div className="bg-white border border-slate-200 px-4 py-3 rounded-xl flex items-center gap-3 w-full max-w-md focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                        <Search size={18} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Pesquisar grupo por código ou descrição..."
                            className="bg-transparent border-none outline-none w-full font-bold text-sm text-slate-700"
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                        />
                    </div>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-4 md:px-6">Código</th>
                            <th className="px-4 py-4 md:px-6">Descrição do Grupo</th>
                            <th className="px-4 py-4 md:px-6 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-600">
                        {filtrados.length > 0 ? filtrados.map(g => (
                            <tr key={g.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-4 md:px-6 text-blue-600 font-black">{g.codigo || '—'}</td>
                                <td className="px-4 py-4 md:px-6 text-slate-800 font-bold">{g.descricao}</td>
                                <td className="px-4 py-4 md:px-6 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEditar(g)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => handleExcluir(g.id)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr><td colSpan={3} className="px-8 py-12 text-center text-slate-400 font-bold">Nenhum grupo encontrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
