import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Printer, X } from 'lucide-react';
import { API } from '../config';
import { formatBRL } from '../utils/format';

interface Empresa {
    nome: string; cnpj: string; endereco?: string; telefone?: string; email?: string;
}
interface Obra {
    id: number; nome: string; endereco?: string; responsavel?: string; status?: string;
    valor_contratado?: number; data_inicio?: string; data_termino?: string;
    numero_licitacao?: string; orgao_responsavel?: string; tipo_orgao?: string;
}
interface Lancamento {
    id: number; quantidade: number; preco_custo_aplicado: number; total_calculado: number;
    data_movimentacao: string;
    tb_produto_servico?: {
        id: number; codigo_interno: string; tipo?: string; descricao: string; unidade_medida?: string;
        tb_grupo?: { id: number; codigo?: string; descricao: string };
    };
}

const fmtData = (d?: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtNum = (n: number) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const fmt = (v: number) => formatBRL(v);
const fmtCNPJ = (c: string) => c?.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') ?? c;

const statusLabel: Record<string, string> = {
    LICITACAO: 'Licitação', FUNDACAO: 'Fundação', EXECUCAO: 'Execução',
    ATIVA: 'Ativa', ACABAMENTO: 'Acabamento', FINALIZADA: 'Finalizada',
};

const RelatorioObraPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [empresa, setEmpresa] = useState<Empresa | null>(null);
    const [obra, setObra] = useState<Obra | null>(null);
    const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');

    useEffect(() => {
        if (!id) return;
        const carregar = async () => {
            try {
                const [resEmp, resObra, resLanc] = await Promise.all([
                    fetch(`${API}/api/empresa`),
                    fetch(`${API}/api/obras/${id}`),
                    fetch(`${API}/api/lancamentos?id_obra=${id}`),
                ]);
                if (!resObra.ok) throw new Error('Obra não encontrada');
                setEmpresa(await resEmp.json());
                setObra(await resObra.json());
                setLancamentos(await resLanc.json());
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

    const totalCusto = lancamentos.reduce((a, l) => a + parseFloat(String(l.total_calculado || 0)), 0);
    const orcamento = parseFloat(String(obra.valor_contratado || 0));
    const saldo = orcamento - totalCusto;

    // Agrupar por grupo
    const grupos = new Map<string, { descricao: string; itens: Lancamento[] }>();
    lancamentos.forEach(l => {
        const g = l.tb_produto_servico?.tb_grupo;
        const key = g ? String(g.id) : '0';
        const desc = g ? g.descricao : 'Sem Grupo';
        if (!grupos.has(key)) grupos.set(key, { descricao: desc, itens: [] });
        grupos.get(key)!.itens.push(l);
    });

    return (
        <>
            {/* Estilos de impressão */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { margin: 0; }
                    .page { box-shadow: none !important; margin: 0 !important; padding: 16px !important; }
                }
                @page { margin: 12mm 15mm; size: A4 portrait; }
            `}</style>

            {/* Barra de ações — some na impressão */}
            <div className="no-print bg-slate-800 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
                <p className="text-white font-bold text-sm">Relatório de Obra — {obra.nome}</p>
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

            {/* Corpo do relatório */}
            <div className="page bg-white max-w-[900px] mx-auto px-10 py-8 shadow-sm" style={{ fontFamily: 'Arial, sans-serif' }}>

                {/* ── CABEÇALHO DA EMPRESA ── */}
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
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">RELATÓRIO DE OBRA</p>
                            <p className="text-[10px] text-slate-400 mt-1">Emitido em: {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                        </div>
                    </div>
                </div>

                {/* ── IDENTIFICAÇÃO DA OBRA ── */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Identificação da Obra</h2>
                    <h3 className="text-lg font-black text-slate-900 uppercase leading-tight mb-3">{obra.nome}</h3>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
                        {obra.endereco && (
                            <div className="col-span-2">
                                <span className="font-bold text-slate-500 text-xs uppercase tracking-wide">Endereço: </span>
                                <span className="text-slate-700">{obra.endereco}</span>
                            </div>
                        )}
                        {obra.responsavel && (
                            <div>
                                <span className="font-bold text-slate-500 text-xs uppercase tracking-wide">Responsável: </span>
                                <span className="text-slate-700">{obra.responsavel}</span>
                            </div>
                        )}
                        {obra.status && (
                            <div>
                                <span className="font-bold text-slate-500 text-xs uppercase tracking-wide">Status: </span>
                                <span className="font-bold text-slate-800">{statusLabel[obra.status] ?? obra.status}</span>
                            </div>
                        )}
                        {obra.data_inicio && (
                            <div>
                                <span className="font-bold text-slate-500 text-xs uppercase tracking-wide">Início: </span>
                                <span className="text-slate-700">{fmtData(obra.data_inicio)}</span>
                            </div>
                        )}
                        {obra.data_termino && (
                            <div>
                                <span className="font-bold text-slate-500 text-xs uppercase tracking-wide">Término Prev.: </span>
                                <span className="text-slate-700">{fmtData(obra.data_termino)}</span>
                            </div>
                        )}
                        {obra.numero_licitacao && (
                            <div>
                                <span className="font-bold text-slate-500 text-xs uppercase tracking-wide">Nº Licitação: </span>
                                <span className="text-slate-700">{obra.numero_licitacao}</span>
                            </div>
                        )}
                        {obra.orgao_responsavel && (
                            <div>
                                <span className="font-bold text-slate-500 text-xs uppercase tracking-wide">Órgão: </span>
                                <span className="text-slate-700">{obra.orgao_responsavel}</span>
                                {obra.tipo_orgao && <span className="text-slate-400 ml-1 text-xs">({obra.tipo_orgao})</span>}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── ORÇAMENTO RESUMO ── */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <div className="border border-slate-200 rounded-lg p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Valor Contratado</p>
                        <p className="text-lg font-black text-slate-800">{fmt(orcamento)}</p>
                    </div>
                    <div className="border border-red-100 bg-red-50/40 rounded-lg p-4 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1">Total de Custos</p>
                        <p className="text-lg font-black text-red-600">{fmt(totalCusto)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{lancamentos.length} lançamento(s)</p>
                    </div>
                    <div className={`border rounded-lg p-4 text-center ${saldo >= 0 ? 'border-emerald-100 bg-emerald-50/40' : 'border-red-100 bg-red-50/40'}`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${saldo >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                            {saldo >= 0 ? 'Saldo Disponível' : 'Saldo Negativo'}
                        </p>
                        <p className={`text-lg font-black ${saldo >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(saldo)}</p>
                        {orcamento > 0 && (
                            <p className="text-[10px] text-slate-400 mt-0.5">
                                {((totalCusto / orcamento) * 100).toFixed(1)}% executado
                            </p>
                        )}
                    </div>
                </div>

                {/* ── RELAÇÃO DE PRODUTOS E SERVIÇOS ── */}
                <div className="mb-2">
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Relação de Produtos e Serviços Lançados</h2>

                    {lancamentos.length === 0 ? (
                        <p className="text-center text-slate-400 font-bold py-8 border border-dashed border-slate-200 rounded-lg">
                            Nenhum lançamento registrado nesta obra.
                        </p>
                    ) : (
                        <>
                            {Array.from(grupos.entries()).map(([gkey, grupo]) => (
                                <div key={gkey} className="mb-5">
                                    {/* Cabeçalho do grupo */}
                                    <div className="bg-slate-800 text-white px-4 py-1.5 rounded-t-md flex justify-between items-center">
                                        <span className="text-xs font-black uppercase tracking-wide">{grupo.descricao}</span>
                                        <span className="text-xs font-bold text-slate-300">
                                            {fmt(grupo.itens.reduce((a, l) => a + parseFloat(String(l.total_calculado || 0)), 0))}
                                        </span>
                                    </div>

                                    {/* Tabela de itens */}
                                    <table className="w-full text-left text-xs border border-t-0 border-slate-200 rounded-b-md overflow-hidden">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-500 font-black uppercase tracking-widest">
                                                <th className="px-3 py-2 w-5">#</th>
                                                <th className="px-3 py-2">Código</th>
                                                <th className="px-3 py-2">Tipo</th>
                                                <th className="px-3 py-2">Descrição</th>
                                                <th className="px-3 py-2 text-center">Und</th>
                                                <th className="px-3 py-2 text-right">Qtd</th>
                                                <th className="px-3 py-2 text-right">Preço Unit.</th>
                                                <th className="px-3 py-2 text-right">Total</th>
                                                <th className="px-3 py-2">Data</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {grupo.itens.map((l, idx) => (
                                                <tr key={l.id} className={`border-t border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                                                    <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                                    <td className="px-3 py-2 font-black text-blue-700">{l.tb_produto_servico?.codigo_interno || '—'}</td>
                                                    <td className="px-3 py-2 text-slate-500">{l.tb_produto_servico?.tipo || '—'}</td>
                                                    <td className="px-3 py-2 font-bold text-slate-800">{l.tb_produto_servico?.descricao || '—'}</td>
                                                    <td className="px-3 py-2 text-center text-slate-500">{l.tb_produto_servico?.unidade_medida || '—'}</td>
                                                    <td className="px-3 py-2 text-right font-bold text-slate-700">{fmtNum(parseFloat(String(l.quantidade)))}</td>
                                                    <td className="px-3 py-2 text-right text-slate-600">{fmt(parseFloat(String(l.preco_custo_aplicado)))}</td>
                                                    <td className="px-3 py-2 text-right font-black text-slate-900">{fmt(parseFloat(String(l.total_calculado)))}</td>
                                                    <td className="px-3 py-2 text-slate-400">{fmtData(l.data_movimentacao)}</td>
                                                </tr>
                                            ))}
                                            {/* Subtotal do grupo */}
                                            <tr className="border-t-2 border-slate-200 bg-slate-50">
                                                <td colSpan={7} className="px-3 py-2 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    Subtotal {grupo.descricao}
                                                </td>
                                                <td className="px-3 py-2 text-right font-black text-slate-800">
                                                    {fmt(grupo.itens.reduce((a, l) => a + parseFloat(String(l.total_calculado || 0)), 0))}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            ))}

                            {/* ── TOTAIS FINAIS ── */}
                            <div className="mt-6 border-t-2 border-slate-800 pt-4">
                                <table className="w-full text-sm">
                                    <tbody>
                                        <tr>
                                            <td className="py-1.5 text-slate-500 font-bold text-right pr-4">Total de Custos Lançados:</td>
                                            <td className="py-1.5 text-right font-black text-red-600 w-40">{fmt(totalCusto)}</td>
                                        </tr>
                                        <tr>
                                            <td className="py-1.5 text-slate-500 font-bold text-right pr-4">Valor Contratado (Orçamento):</td>
                                            <td className="py-1.5 text-right font-black text-slate-800 w-40">{fmt(orcamento)}</td>
                                        </tr>
                                        <tr className="border-t border-slate-300">
                                            <td className="pt-3 pb-1 font-black text-slate-800 text-right pr-4 text-base uppercase tracking-wide">
                                                {saldo >= 0 ? 'Saldo Disponível:' : 'Saldo Devedor:'}
                                            </td>
                                            <td className={`pt-3 pb-1 text-right font-black text-xl w-40 ${saldo >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                                {fmt(Math.abs(saldo))}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* ── RODAPÉ ── */}
                <div className="mt-10 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
                    <span>CANTEIRO DE OBRAS — V9 INFORMÁTICA LTDA — (37) 4141-0341</span>
                    <span>Página 1</span>
                </div>

                {/* Área de assinatura */}
                <div className="no-print mt-8 grid grid-cols-2 gap-16">
                    <div className="border-t border-slate-400 pt-2 text-center text-xs text-slate-500 font-bold">Responsável Técnico</div>
                    <div className="border-t border-slate-400 pt-2 text-center text-xs text-slate-500 font-bold">Aprovação / Fiscalização</div>
                </div>
                <div className="print-only hidden mt-8 grid grid-cols-2 gap-16">
                    <div className="border-t border-slate-400 pt-2 text-center text-xs text-slate-500 font-bold">Responsável Técnico</div>
                    <div className="border-t border-slate-400 pt-2 text-center text-xs text-slate-500 font-bold">Aprovação / Fiscalização</div>
                </div>
            </div>
        </>
    );
};

export default RelatorioObraPage;
