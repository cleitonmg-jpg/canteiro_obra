import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Building2, RefreshCw } from 'lucide-react';

const API = 'http://localhost:3000';

interface ResumoObra {
    id: number;
    nome: string;
    status: string;
    orcamento: number;
    gastos: number;
    lucro: number;
    qtd_lancamentos: number;
}

const fmt = (v: number) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

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
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');

    const carregar = async () => {
        setCarregando(true);
        setErro('');
        try {
            const res = await fetch(`${API}/api/relatorios/custos-por-obra`);
            setDados(await res.json());
        } catch {
            setErro('Não foi possível conectar ao servidor.');
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => { carregar(); }, []);

    const totalOrcamento = dados.reduce((a, d) => a + d.orcamento, 0);
    const totalGastos = dados.reduce((a, d) => a + d.gastos, 0);
    const totalLucro = totalOrcamento - totalGastos;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-3xl font-black text-slate-800">Relatório de Obras</h2>
                    <p className="text-slate-500 font-bold mt-2">Análise de custos, gastos e lucratividade por canteiro.</p>
                </div>
                <button onClick={carregar} disabled={carregando} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black px-6 py-3 rounded-2xl transition-all">
                    <RefreshCw size={18} className={carregando ? 'animate-spin' : ''} /> ATUALIZAR
                </button>
            </div>

            {erro && <div className="bg-red-50 border border-red-200 text-red-700 font-bold px-6 py-4 rounded-2xl">{erro}</div>}

            {/* Cards resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Total Orçado</p>
                    <p className="text-3xl font-black text-slate-800">{fmt(totalOrcamento)}</p>
                    <p className="text-xs text-slate-400 font-bold mt-2">{dados.length} obra(s)</p>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-red-100 shadow-sm">
                    <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-2">Total Gasto</p>
                    <p className="text-3xl font-black text-red-600">{fmt(totalGastos)}</p>
                    <p className="text-xs text-slate-400 font-bold mt-2">{dados.reduce((a, d) => a + d.qtd_lancamentos, 0)} lançamento(s)</p>
                </div>
                <div className={`p-8 rounded-[32px] border shadow-sm ${totalLucro >= 0 ? 'bg-white border-emerald-100' : 'bg-white border-red-100'}`}>
                    <p className={`text-xs font-black uppercase tracking-widest mb-2 ${totalLucro >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>Lucro Previsto</p>
                    <p className={`text-3xl font-black ${totalLucro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(totalLucro)}</p>
                    <div className="flex items-center gap-1 mt-2">
                        {totalLucro >= 0
                            ? <TrendingUp size={14} className="text-emerald-500" />
                            : <TrendingDown size={14} className="text-red-500" />
                        }
                        <p className="text-xs text-slate-400 font-bold">
                            {totalOrcamento > 0 ? `${((totalLucro / totalOrcamento) * 100).toFixed(1)}% do orçamento` : '—'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tabela detalhada */}
            <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-black text-slate-700 flex items-center gap-2"><Building2 size={18} /> Detalhamento por Obra</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5">Obra</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Orçamento</th>
                                <th className="px-8 py-5 text-right">Gastos</th>
                                <th className="px-8 py-5 text-right">Lucro</th>
                                <th className="px-8 py-5 text-center">Lançamentos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {dados.length === 0 ? (
                                <tr><td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-bold">
                                    {carregando ? 'Carregando...' : 'Nenhuma obra encontrada.'}
                                </td></tr>
                            ) : dados.map(d => (
                                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5 font-bold text-slate-800">{d.nome}</td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${statusColor[d.status] || 'bg-slate-100 text-slate-600'}`}>{d.status}</span>
                                    </td>
                                    <td className="px-8 py-5 text-right font-bold text-slate-700">{fmt(d.orcamento)}</td>
                                    <td className="px-8 py-5 text-right font-bold text-red-500">{fmt(d.gastos)}</td>
                                    <td className="px-8 py-5 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            {d.lucro >= 0
                                                ? <TrendingUp size={14} className="text-emerald-500" />
                                                : <TrendingDown size={14} className="text-red-500" />
                                            }
                                            <span className={`font-black text-base ${d.lucro >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(d.lucro)}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-center">
                                        <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-black">{d.qtd_lancamentos}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
