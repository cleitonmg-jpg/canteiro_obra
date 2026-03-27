import { useState, useEffect } from 'react';
import { Plus, Building2, MapPin, Search, Edit2, Trash2, Calendar, HardHat, X, TrendingDown, TrendingUp } from 'lucide-react';

const API = 'http://localhost:3000';

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

const formatMoeda = (v: number) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
const formatData = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '--';

const statusColor: Record<string, string> = {
    'LICITAÇÃO': 'bg-amber-100 text-amber-700',
    'FUNDAÇÃO': 'bg-orange-100 text-orange-700',
    'EXECUÇÃO': 'bg-blue-100 text-blue-700',
    'ATIVA': 'bg-blue-100 text-blue-700',
    'ACABAMENTO': 'bg-purple-100 text-purple-700',
    'FINALIZADA': 'bg-emerald-100 text-emerald-700',
};

export const ObrasView = () => {
    const [obras, setObras] = useState<Obra[]>([]);
    const [viewForm, setViewForm] = useState(false);
    const [busca, setBusca] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');

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
            setObras(await res.json());
        } catch {
            setErro('Não foi possível conectar ao servidor.');
        }
    };

    useEffect(() => { carregar(); }, []);

    const resetForm = () => {
        setEditId(null); setNome(''); setEndereco(''); setInicio(''); setTermino('');
        setResponsavel(''); setStatus('EXECUÇÃO'); setValorContratado('');
        setViewForm(false);
    };

    const handleSalvar = async (e: React.FormEvent) => {
        e.preventDefault();
        setCarregando(true);
        setErro('');
        try {
            const body = { nome, endereco, responsavel, status, valor_contratado: valorContratado, data_inicio: inicio || null, data_termino: termino || null };
            const res = editId
                ? await fetch(`${API}/api/obras/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                : await fetch(`${API}/api/obras`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error();
            await carregar();
            resetForm();
        } catch {
            setErro('Erro ao salvar. Verifique a conexão.');
        } finally {
            setCarregando(false);
        }
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
            await fetch(`${API}/api/obras/${id}`, { method: 'DELETE' });
            await carregar();
        } catch {
            setErro('Erro ao excluir obra.');
        }
    };

    const filtradas = obras.filter(o => o.nome.toLowerCase().includes(busca.toLowerCase()));

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-3xl font-black text-slate-800">Canteiros de Obra</h2>
                    <p className="text-slate-500 font-bold mt-2">Gerencie todas as suas construções e licitações.</p>
                </div>
                {!viewForm && (
                    <button onClick={() => setViewForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 flex items-center gap-2 transition-all">
                        <Plus size={20} /> NOVA OBRA / LICITAÇÃO
                    </button>
                )}
            </div>

            {erro && <div className="bg-red-50 border border-red-200 text-red-700 font-bold px-6 py-4 rounded-2xl">{erro}</div>}

            {viewForm ? (
                <form onSubmit={handleSalvar} className="bg-white p-10 rounded-[32px] border border-slate-200 shadow-sm space-y-8">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                            <Building2 className="text-blue-500" />
                            {editId ? 'Editando Obra Registrada' : 'Cadastrando Novo Canteiro / Licitação'}
                        </h3>
                        <button type="button" onClick={resetForm} className="text-slate-400 hover:text-red-500 transition-colors p-2 bg-slate-50 rounded-xl">
                            <X size={20} />
                        </button>
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
                        <button type="submit" disabled={carregando} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-10 py-4 rounded-xl font-black text-lg shadow-lg flex items-center gap-2 transform active:scale-95 transition-all">
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filtradas.map(o => {
                                const lucro = (Number(o.valor_contratado) || 0) - (o.gastos || 0);
                                const positivo = lucro >= 0;
                                return (
                                    <div key={o.id} className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm hover:shadow-2xl hover:shadow-slate-200 transition-all group border-b-8 border-b-blue-600 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                <Building2 size={24} />
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${statusColor[o.status] || 'bg-slate-100 text-slate-600'}`}>{o.status}</span>
                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => handleEditar(o)} className="text-blue-600 bg-blue-50 p-2 rounded-lg hover:bg-blue-100"><Edit2 size={16} /></button>
                                                    <button onClick={() => handleExcluir(o.id)} className="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                        </div>

                                        <h3 className="text-2xl font-black text-slate-800 mb-3 truncate leading-tight" title={o.nome}>{o.nome}</h3>

                                        <div className="space-y-3 mb-6 flex-1">
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

                                        <div className="pt-4 border-t border-slate-100 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Orçamento</p>
                                                <p className="text-slate-800 font-black text-base">{formatMoeda(Number(o.valor_contratado))}</p>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-red-400 text-xs font-bold uppercase tracking-widest">Gastos</p>
                                                <p className="text-red-600 font-black text-base">{formatMoeda(o.gastos || 0)}</p>
                                            </div>
                                            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                                <div className="flex items-center gap-1.5">
                                                    {positivo ? <TrendingUp size={14} className="text-emerald-500" /> : <TrendingDown size={14} className="text-red-500" />}
                                                    <p className={`text-xs font-black uppercase tracking-widest ${positivo ? 'text-emerald-500' : 'text-red-500'}`}>Lucro Previsto</p>
                                                </div>
                                                <p className={`font-black text-lg ${positivo ? 'text-emerald-600' : 'text-red-600'}`}>{formatMoeda(lucro)}</p>
                                            </div>
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
