import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, X } from 'lucide-react';
import { API } from '../config';
import { formatBRL } from '../utils/format';

interface Empresa {
    nome: string; cnpj: string; endereco?: string; telefone?: string; email?: string;
}
interface Obra {
    id: number; nome: string; responsavel?: string; status?: string;
    valor_contratado?: number;
}
interface Etapa {
    id: number; servico_executado: string; descricao?: string;
    valor_a_receber: number; status_etapa: string; data_lancamento: string;
    data_baixa?: string;
}

const fmtData = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtCNPJ = (c: string) => c?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') ?? c;

const statusLabel: Record<string, string> = {
    'pendente': 'Pendente', 'em andamento': 'Em Andamento',
    'concluída': 'Concluída', 'cancelada': 'Cancelada',
};

const RelatorioExecutorPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [empresa, setEmpresa] = useState<Empresa | null>(null);
    const [obra, setObra] = useState<Obra | null>(null);
    const [etapas, setEtapas] = useState<Etapa[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (!id) return;
        const carregar = async () => {
            try {
                const [resEmp, resObra, resEtapas] = await Promise.all([
                    fetch(`${API}/api/empresa`),
                    fetch(`${API}/api/obras/${id}`),
                    fetch(`${API}/api/etapas-obra?id_obra=${id}`),
                ]);
                if (!resObra.ok) throw new Error('Obra não encontrada');
                setEmpresa(await resEmp.json());
                setObra(await resObra.json());
                setEtapas(await resEtapas.json());
            } catch (e: any) {
                setErro(e.message || 'Erro ao carregar dados');
            } finally {
                setCarregando(false);
            }
        };
        carregar();
    }, [id]);

    if (carregando) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <p className="text-slate-400 font-bold text-lg">Carregando relatório...</p>
        </div>
    );
    if (erro || !obra) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <p className="text-red-500 font-bold text-lg">{erro || 'Obra não encontrada'}</p>
        </div>
    );

    const totalRecebido = etapas.reduce((a, e) => a + parseFloat(String(e.valor_a_receber || 0)), 0);
    const orcamento = parseFloat(String(obra.valor_contratado || 0));
    const pctGeral = orcamento > 0 ? ((totalRecebido / orcamento) * 100).toFixed(1) : null;

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
                <p className="text-white font-bold text-sm">Relatório do Executor — {obra.nome}</p>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.print()}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black px-5 py-2 rounded-xl text-sm transition-all"
                    >
                        <Printer size={16} /> IMPRIMIR / SALVAR PDF
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white font-black px-4 py-2 rounded-xl text-sm transition-all"
                    >
                        <X size={16} /> FECHAR
                    </button>
                </div>
            </div>

            <div className="page bg-white max-w-[900px] mx-auto px-10 py-8 shadow-sm" style={{ fontFamily: 'Arial, sans-serif' }}>

                {/* Cabeçalho da empresa */}
                <div className="border-b-2 border-slate-800 pb-4 mb-5">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                                {empresa?.nome || 'EMPRESA'}
                            </h1>
                            {empresa?.cnpj && (
                                <p className="text-xs text-slate-500 font-medium mt-0.5">CNPJ: {fmtCNPJ(empresa.cnpj)}</p>
                            )}
                            {empresa?.endereco && (
                                <p className="text-xs text-slate-500 mt-0.5">{empresa.endereco}</p>
                            )}
                            {(empresa?.telefone || empresa?.email) && (
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {empresa.telefone && `Tel: ${empresa.telefone}`}
                                    {empresa.telefone && empresa.email && '  |  '}
                                    {empresa.email && `E-mail: ${empresa.email}`}
                                </p>
                            )}
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">RELATÓRIO DO EXECUTOR</p>
                            <p className="text-[10px] text-slate-400 mt-1">Emitido em: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                </div>

                {/* Identificação da obra */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Identificação da Obra</h2>
                    <h3 className="text-lg font-black text-slate-900 uppercase leading-tight mb-3">{obra.nome}</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                        {obra.responsavel && (
                            <div>
                                <span className="font-bold text-slate-500 text-xs uppercase tracking-wide">Responsável: </span>
                                <span className="text-slate-700">{obra.responsavel}</span>
                            </div>
                        )}
                        {obra.status && (
                            <div>
                                <span className="font-bold text-slate-500 text-xs uppercase tracking-wide">Status: </span>
                                <span className="font-bold text-slate-800">{obra.status}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Resumo financeiro */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="border border-slate-200 rounded-lg p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Orçamento Total</p>
                        <p className="text-lg font-black text-slate-800">{formatBRL(orcamento)}</p>
                    </div>
                    <div className="border border-emerald-100 bg-emerald-50/40 rounded-lg p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Total a Receber</p>
                        <p className="text-lg font-black text-emerald-700">{formatBRL(totalRecebido)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{etapas.length} etapa(s)</p>
                    </div>
                    <div className="border border-blue-100 bg-blue-50/40 rounded-lg p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">% do Orçamento</p>
                        <p className="text-lg font-black text-blue-700">{pctGeral ? `${pctGeral}%` : '—'}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Valor recebido / orçamento</p>
                    </div>
                </div>

                {/* Tabela de etapas */}
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Relação de Etapas</h2>

                {etapas.length === 0 ? (
                    <p className="text-center text-slate-400 font-bold py-8 border border-dashed border-slate-200 rounded-lg">
                        Nenhuma etapa lançada nesta obra.
                    </p>
                ) : (
                    <>
                        <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden mb-6">
                            <thead>
                                <tr className="bg-slate-800 text-white font-black uppercase tracking-widest">
                                    <th className="px-3 py-2 w-5">#</th>
                                    <th className="px-3 py-2">Data</th>
                                    <th className="px-3 py-2">Serviço Executado</th>
                                    <th className="px-3 py-2">Descrição</th>
                                    <th className="px-3 py-2">Status</th>
                                    <th className="px-3 py-2">Dt. Baixa</th>
                                    <th className="px-3 py-2 text-right">Valor a Receber</th>
                                    <th className="px-3 py-2 text-right">% Orç.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {etapas.map((e, idx) => {
                                    const val = parseFloat(String(e.valor_a_receber || 0));
                                    const pct = orcamento > 0 ? ((val / orcamento) * 100).toFixed(1) : '—';
                                    return (
                                        <tr key={e.id} className={`border-t border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                                            <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{fmtData(e.data_lancamento)}</td>
                                            <td className="px-3 py-2 font-black text-slate-800">{e.servico_executado}</td>
                                            <td className="px-3 py-2 text-slate-500">{e.descricao || '—'}</td>
                                            <td className="px-3 py-2 font-bold text-slate-600">{statusLabel[e.status_etapa] ?? e.status_etapa}</td>
                                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{e.data_baixa ? fmtData(e.data_baixa) : '—'}</td>
                                            <td className="px-3 py-2 text-right font-black text-emerald-700">{formatBRL(val)}</td>
                                            <td className="px-3 py-2 text-right text-slate-500">{pct}{orcamento > 0 ? '%' : ''}</td>
                                        </tr>
                                    );
                                })}
                                <tr className="border-t-2 border-slate-200 bg-slate-50">
                                    <td colSpan={5} className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Total
                                    </td>
                                    <td className="px-3 py-2 text-right font-black text-emerald-700">{formatBRL(totalRecebido)}</td>
                                    <td className="px-3 py-2 text-right font-black text-blue-700">{pctGeral ? `${pctGeral}%` : '—'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </>
                )}

                {/* Rodapé */}
                <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
                    <span>CANTEIRO DE OBRAS — V9 INFORMÁTICA LTDA — (37) 4141-0341</span>
                    <span>Página 1</span>
                </div>

                <div className="no-print mt-8 grid grid-cols-2 gap-16">
                    <div className="border-t border-slate-400 pt-2 text-center text-xs text-slate-500 font-bold">Responsável Técnico</div>
                    <div className="border-t border-slate-400 pt-2 text-center text-xs text-slate-500 font-bold">Aprovação / Fiscalização</div>
                </div>
            </div>
        </>
    );
};

export default RelatorioExecutorPage;
