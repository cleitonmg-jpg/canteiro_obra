import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileArchive, FileSpreadsheet, FileUp, Link2, PackagePlus, RefreshCw, Save, Tags, Trash2 } from 'lucide-react';

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
  descricao: string;
  tipo: 'PRODUTO' | 'SERVICO';
  unidade_medida?: string;
  preco_custo?: number;
  tb_grupo?: Grupo | null;
}

interface ProdutoRelacionado {
  id: number;
  codigo_interno: string;
  descricao: string;
  tipo: 'PRODUTO' | 'SERVICO';
  grupo?: Grupo | null;
}

interface ImportacaoResumo {
  id: number;
  tipo_arquivo: string;
  nome_arquivo_original: string;
  url_arquivo: string;
  numero_nf?: string | null;
  serie?: string | null;
  nome_emitente?: string | null;
  cnpj_emitente?: string | null;
  valor_total_nota: number;
  status_processamento: string;
  qtd_itens?: number;
  data_cadastro: string;
}

interface ImportacaoItem {
  id: number;
  numero_item: string;
  codigo_produto_fornecedor: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  valor_unitario_original: number;
  valor_unitario_final: number;
  valor_total: number;
  valor_rateio: number;
  sugestao_historica: boolean;
  observacao?: string | null;
  produto_vinculado?: ProdutoRelacionado | null;
}

interface ImportacaoDetalhe extends ImportacaoResumo {
  metadata_json?: { possui_rateio_nota?: boolean; leitura_automatica?: boolean } | null;
  valor_total_itens: number;
  observacao?: string | null;
  itens: ImportacaoItem[];
}

interface VinculoEditado {
  id_produto_servico_vinculado: string;
  observacao: string;
}

const statusCls: Record<string, string> = {
  VINCULADO: 'bg-emerald-100 text-emerald-700',
  PENDENTE_VINCULO: 'bg-amber-100 text-amber-700',
  IMPORTADO: 'bg-blue-100 text-blue-700',
  ARQUIVADO: 'bg-slate-100 text-slate-600',
};

const lerArquivoComoBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const result = String(reader.result || '');
    resolve(result.includes(',') ? result.split(',')[1] : result);
  };
  reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'));
  reader.readAsDataURL(file);
});

export const ImportacaoNfView = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [importacoes, setImportacoes] = useState<ImportacaoResumo[]>([]);
  const [selecionada, setSelecionada] = useState<ImportacaoDetalhe | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [vinculos, setVinculos] = useState<Record<number, VinculoEditado>>({});
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const [grupoDescricao, setGrupoDescricao] = useState('');
  const [tipoNovo, setTipoNovo] = useState<'PRODUTO' | 'SERVICO'>('PRODUTO');
  const [produtoDescricao, setProdutoDescricao] = useState('');
  const [produtoUnidade, setProdutoUnidade] = useState('');
  const [produtoPreco, setProdutoPreco] = useState('');
  const [produtoGrupoId, setProdutoGrupoId] = useState('');
  const [itemEmFoco, setItemEmFoco] = useState<number | null>(null);

  const carregarImportacoes = async () => {
    const res = await fetch(`${API}/api/nf-importacoes`);
    if (!res.ok) throw new Error('Falha ao carregar importações.');
    return res.json();
  };

  const carregarCatalogos = async () => {
    const [resProdutos, resGrupos] = await Promise.all([
      fetch(`${API}/api/produtos`),
      fetch(`${API}/api/grupos`),
    ]);
    if (!resProdutos.ok || !resGrupos.ok) throw new Error('Falha ao carregar produtos e grupos.');
    return {
      produtos: await resProdutos.json(),
      grupos: await resGrupos.json(),
    };
  };

  const carregarDetalhe = async (id: number) => {
    const res = await fetch(`${API}/api/nf-importacoes/${id}`);
    if (!res.ok) throw new Error('Falha ao carregar os detalhes da importação.');
    const data = await res.json();
    setSelecionada(data);

    const nextVinculos: Record<number, VinculoEditado> = {};
    for (const item of data.itens || []) {
      nextVinculos[item.id] = {
        id_produto_servico_vinculado: item.produto_vinculado?.id ? String(item.produto_vinculado.id) : '',
        observacao: item.observacao || '',
      };
    }
    setVinculos(nextVinculos);
  };

  const recarregarTudo = async (manterSelecionada = true) => {
    setCarregando(true);
    setErro('');

    try {
      const [lista, catalogos] = await Promise.all([carregarImportacoes(), carregarCatalogos()]);
      setImportacoes(lista);
      setProdutos(catalogos.produtos);
      setGrupos(catalogos.grupos);

      const alvo = manterSelecionada
        ? lista.find((item: ImportacaoResumo) => item.id === selecionada?.id)?.id || lista[0]?.id
        : lista[0]?.id;

      if (alvo) {
        await carregarDetalhe(alvo);
      } else {
        setSelecionada(null);
        setVinculos({});
      }
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível carregar a tela de importação.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    recarregarTudo(false);
  }, []);

  const totais = useMemo(() => {
    if (!selecionada) return { resolvidos: 0, pendentes: 0 };
    const resolvidos = selecionada.itens.filter((item) => vinculos[item.id]?.id_produto_servico_vinculado).length;
    return {
      resolvidos,
      pendentes: selecionada.itens.length - resolvidos,
    };
  }, [selecionada, vinculos]);

  const handleSelecionarImportacao = async (id: number) => {
    setErro('');
    try {
      await carregarDetalhe(id);
    } catch (e: any) {
      setErro(e?.message || 'Falha ao abrir a importação.');
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setEnviando(true);
    setErro('');
    setSucesso('');

    try {
      const contentBase64 = await lerArquivoComoBase64(file);
      const res = await fetch(`${API}/api/nf-importacoes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentBase64 }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.erro || 'Falha ao importar a nota.');

      await recarregarTudo(false);
      await carregarDetalhe(body.id);
      setSucesso(file.name.toLowerCase().endsWith('.pdf')
        ? 'PDF armazenado com sucesso. A leitura automática completa está habilitada para XML.'
        : 'Nota fiscal importada com sucesso.');
    } catch (e: any) {
      setErro(e?.message || 'Falha ao importar o arquivo.');
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleExcluirImportacao = async (id: number, nome: string) => {
    if (!window.confirm(`Excluir a importação "${nome}"?\n\nOs vínculos e itens serão removidos. Esta ação não pode ser desfeita.`)) return;
    try {
      const res = await fetch(`${API}/api/nf-importacoes/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.erro); }
      if (selecionada?.id === id) setSelecionada(null);
      await carregarImportacoes();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir importação.');
    }
  };

  const handleSalvarVinculos = async () => {
    if (!selecionada) return;

    setSalvando(true);
    setErro('');
    setSucesso('');

    try {
      const res = await fetch(`${API}/api/nf-importacoes/${selecionada.id}/vinculos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens: selecionada.itens.map((item) => ({
            id: item.id,
            id_produto_servico_vinculado: vinculos[item.id]?.id_produto_servico_vinculado || null,
            observacao: vinculos[item.id]?.observacao || '',
          })),
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.erro || 'Falha ao salvar vínculos.');

      setSelecionada(body);
      const lista = await carregarImportacoes();
      setImportacoes(lista);
      setSucesso('Vínculos do fornecedor gravados com sucesso.');
    } catch (e: any) {
      setErro(e?.message || 'Falha ao salvar vínculos.');
    } finally {
      setSalvando(false);
    }
  };

  const preencherCadastroRapido = (item: ImportacaoItem) => {
    setItemEmFoco(item.id);
    setTipoNovo('PRODUTO');
    setProdutoDescricao(item.descricao || '');
    setProdutoUnidade(item.unidade || '');
    setProdutoPreco(String(item.valor_unitario_final || item.valor_unitario_original || ''));
    setProdutoGrupoId(item.produto_vinculado?.grupo?.id ? String(item.produto_vinculado.grupo.id) : '');
  };

  const criarGrupo = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    try {
      const res = await fetch(`${API}/api/grupos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: grupoDescricao }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.erro || 'Não foi possível criar o grupo.');

      const catalogos = await carregarCatalogos();
      setProdutos(catalogos.produtos);
      setGrupos(catalogos.grupos);
      setGrupoDescricao('');
      setProdutoGrupoId(String(body.id));
      setSucesso('Grupo criado e pronto para uso no cadastro rápido.');
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível criar o grupo.');
    }
  };

  const criarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setSucesso('');

    try {
      const res = await fetch(`${API}/api/produtos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipoNovo,
          descricao: produtoDescricao,
          unidade_medida: produtoUnidade,
          preco_custo: Number(String(produtoPreco).replace(',', '.')) || 0,
          id_grupo: produtoGrupoId ? Number(produtoGrupoId) : null,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.erro || 'Não foi possível criar o produto/serviço.');

      const catalogos = await carregarCatalogos();
      setProdutos(catalogos.produtos);
      setGrupos(catalogos.grupos);

      if (itemEmFoco) {
        setVinculos((current) => ({
          ...current,
          [itemEmFoco]: {
            ...(current[itemEmFoco] || { observacao: '' }),
            id_produto_servico_vinculado: String(body.id),
          },
        }));
      }

      setProdutoDescricao('');
      setProdutoUnidade('');
      setProdutoPreco('');
      setProdutoGrupoId('');
      setSucesso('Produto/serviço criado e selecionado para o item em foco.');
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível criar o produto/serviço.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-800">Importação de NF-e</h2>
          <p className="text-slate-500 font-bold mt-2">Envie XML ou PDF, revise os itens do fornecedor e grave os vínculos por histórico de compra.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input ref={inputRef} type="file" accept=".xml,.pdf" className="hidden" onChange={handleUpload} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={enviando}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-blue-100 transition-all"
          >
            <FileUp size={18} />
            {enviando ? 'IMPORTANDO...' : 'ENVIAR XML/PDF'}
          </button>
          <button
            type="button"
            onClick={() => recarregarTudo(true)}
            className="bg-white border border-slate-200 hover:border-blue-400 text-slate-700 px-5 py-3 rounded-2xl font-black flex items-center gap-2 transition-all"
          >
            <RefreshCw size={18} />
            ATUALIZAR
          </button>
        </div>
      </div>

      {erro && <div className="bg-red-50 border border-red-200 text-red-700 font-bold px-6 py-4 rounded-2xl">{erro}</div>}
      {sucesso && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-6 py-4 rounded-2xl">{sucesso}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[340px,minmax(0,1fr)] gap-8">
        <aside className="bg-white border border-slate-200 rounded-[28px] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-800">Notas Importadas</h3>
            <span className="text-xs font-black text-slate-400">{importacoes.length} arquivo(s)</span>
          </div>

          <div className="max-h-[780px] overflow-y-auto divide-y divide-slate-100">
            {carregando ? (
              <div className="p-6 text-slate-400 font-bold">Carregando...</div>
            ) : importacoes.length === 0 ? (
              <div className="p-8 text-center text-slate-400 font-bold">Nenhuma nota importada ainda.</div>
            ) : importacoes.map((item) => (
              <div
                key={item.id}
                className={`w-full text-left transition-all ${selecionada?.id === item.id ? 'bg-blue-50/70' : 'hover:bg-slate-50'}`}
              >
                <button
                  type="button"
                  onClick={() => handleSelecionarImportacao(item.id)}
                  className="w-full text-left p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{item.tipo_arquivo}</p>
                      <p className="font-black text-slate-800 truncate mt-1">{item.nome_emitente || item.nome_arquivo_original}</p>
                      <p className="text-xs font-bold text-slate-500 mt-2 truncate">
                        {item.numero_nf ? `NF ${item.numero_nf}${item.serie ? ` • Série ${item.serie}` : ''}` : item.nome_arquivo_original}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap ${statusCls[item.status_processamento] || 'bg-slate-100 text-slate-600'}`}>
                      {item.status_processamento.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-4 text-xs font-bold text-slate-500">
                    <span>{new Date(item.data_cadastro).toLocaleString('pt-BR')}</span>
                    <span>{formatBRL(item.valor_total_nota || 0)}</span>
                  </div>
                </button>
                <div className="px-5 pb-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleExcluirImportacao(item.id, item.nome_emitente || item.nome_arquivo_original)}
                    className="flex items-center gap-1.5 text-xs font-black text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all"
                  >
                    <Trash2 size={13} /> EXCLUIR
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="space-y-8">
          {!selecionada ? (
            <div className="bg-white border border-slate-200 rounded-[28px] p-10 shadow-sm text-center text-slate-400 font-bold">
              Selecione uma nota importada ou envie um novo XML/PDF para começar.
            </div>
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-[28px] p-6 md:p-8 shadow-sm space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-2xl font-black text-slate-800">
                        {selecionada.numero_nf ? `NF ${selecionada.numero_nf}` : selecionada.nome_arquivo_original}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${statusCls[selecionada.status_processamento] || 'bg-slate-100 text-slate-600'}`}>
                        {selecionada.status_processamento.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <p className="text-slate-500 font-bold mt-2">
                      {selecionada.nome_emitente || 'Fornecedor não identificado'}
                      {selecionada.cnpj_emitente ? ` • CNPJ ${selecionada.cnpj_emitente}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <a
                      href={`${API}${selecionada.url_arquivo}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-white border border-slate-200 hover:border-blue-400 text-slate-700 px-4 py-3 rounded-2xl font-black flex items-center gap-2 transition-all"
                    >
                      <FileArchive size={18} />
                      ABRIR ARQUIVO
                    </a>
                    {selecionada.itens.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSalvarVinculos}
                        disabled={salvando}
                        className="bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white px-5 py-3 rounded-2xl font-black flex items-center gap-2 shadow-lg transition-all"
                      >
                        <Save size={18} />
                        {salvando ? 'SALVANDO...' : 'GRAVAR VÍNCULOS'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arquivo</p>
                    <p className="text-sm font-black text-slate-800 mt-2">{selecionada.tipo_arquivo}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Itens da NF</p>
                    <p className="text-sm font-black text-slate-800 mt-2">{selecionada.itens.length}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total da Nota</p>
                    <p className="text-sm font-black text-blue-600 mt-2">{formatBRL(selecionada.valor_total_nota || 0)}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vínculos</p>
                    <p className="text-sm font-black text-slate-800 mt-2">{totais.resolvidos} resolvido(s) • {totais.pendentes} pendente(s)</p>
                  </div>
                </div>

                {selecionada.metadata_json?.possui_rateio_nota && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl px-5 py-4 font-bold text-sm">
                    O total da NF-e exigiu rateio para fechamento dos itens. O valor unitário final exibido abaixo já considera esse ajuste.
                  </div>
                )}

                {selecionada.observacao && (
                  <div className="bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl px-5 py-4 font-bold text-sm">
                    {selecionada.observacao}
                  </div>
                )}
              </div>

              {selecionada.itens.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-[28px] p-10 shadow-sm text-center space-y-3">
                  <FileSpreadsheet size={42} className="mx-auto text-slate-300" />
                  <p className="font-black text-slate-700">Este arquivo foi armazenado para documentação.</p>
                  <p className="text-slate-500 font-bold text-sm">Para leitura automática dos itens, envie o XML original da NF-e.</p>
                </div>
              ) : (
                <>
                  <div className="bg-white border border-slate-200 rounded-[28px] shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                      <h3 className="text-lg font-black text-slate-800">Itens da Nota</h3>
                      <span className="text-xs font-black text-slate-400">{selecionada.itens.length} linha(s)</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                          <tr>
                            <th className="px-5 py-4">Item</th>
                            <th className="px-5 py-4">Fornecedor</th>
                            <th className="px-5 py-4">Qtd / Total</th>
                            <th className="px-5 py-4">Produto Interno</th>
                            <th className="px-5 py-4">Observação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selecionada.itens.map((item) => (
                            <tr key={item.id} className="align-top hover:bg-slate-50/60 transition-colors">
                              <td className="px-5 py-5 min-w-[320px]">
                                <div className="space-y-2">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    Item {item.numero_item || item.id}
                                  </p>
                                  <p className="font-black text-slate-800 leading-tight">{item.descricao}</p>
                                  {item.codigo_produto_fornecedor && (
                                    <span className="inline-flex bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[11px] font-black">
                                      Código fornecedor: {item.codigo_produto_fornecedor}
                                    </span>
                                  )}
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => preencherCadastroRapido(item)}
                                      className="text-xs font-black text-slate-500 hover:text-blue-600 flex items-center gap-2"
                                    >
                                      <PackagePlus size={14} />
                                      Usar no cadastro rápido
                                    </button>
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-5 min-w-[210px]">
                                <div className="space-y-2 text-sm font-bold text-slate-600">
                                  <p>{item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 })} {item.unidade || ''}</p>
                                  <p>Unitário orig.: {formatBRL(item.valor_unitario_original || 0)}</p>
                                  <p className="text-slate-800">Unitário final: {formatBRL(item.valor_unitario_final || 0)}</p>
                                  <p className="text-slate-800 font-black">Total: {formatBRL(item.valor_total || 0)}</p>
                                  {item.valor_rateio !== 0 && (
                                    <p className="text-amber-700">Ajuste NF: {formatBRL(item.valor_rateio || 0)}</p>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-5 min-w-[360px]">
                                <div className="space-y-3">
                                  {item.sugestao_historica && item.produto_vinculado && (
                                    <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl px-4 py-3 text-xs font-black flex items-center gap-2">
                                      <CheckCircle2 size={14} />
                                      Sugestão histórica encontrada: {item.produto_vinculado.codigo_interno}
                                    </div>
                                  )}

                                  <select
                                    value={vinculos[item.id]?.id_produto_servico_vinculado || ''}
                                    onChange={(e) => setVinculos((current) => ({
                                      ...current,
                                      [item.id]: {
                                        ...(current[item.id] || { observacao: '' }),
                                        id_produto_servico_vinculado: e.target.value,
                                      },
                                    }))}
                                    className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                                  >
                                    <option value="">Selecionar produto/serviço...</option>
                                    {produtos.map((produto) => (
                                      <option key={produto.id} value={produto.id}>
                                        {produto.codigo_interno} • {produto.descricao}
                                      </option>
                                    ))}
                                  </select>

                                  {vinculos[item.id]?.id_produto_servico_vinculado && (
                                    <div className="text-xs font-black text-slate-500 flex items-center gap-2">
                                      <Link2 size={14} />
                                      Vínculo pronto para histórico do fornecedor.
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="px-5 py-5 min-w-[260px]">
                                <textarea
                                  value={vinculos[item.id]?.observacao || ''}
                                  onChange={(e) => setVinculos((current) => ({
                                    ...current,
                                    [item.id]: {
                                      ...(current[item.id] || { id_produto_servico_vinculado: '' }),
                                      observacao: e.target.value,
                                    },
                                  }))}
                                  rows={4}
                                  placeholder="Anotação opcional para este item..."
                                  className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 font-bold text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 resize-none"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <form onSubmit={criarGrupo} className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-50 text-blue-600 p-3 rounded-2xl"><Tags size={22} /></div>
                        <div>
                          <h3 className="text-xl font-black text-slate-800">Cadastro Rápido de Grupo</h3>
                          <p className="text-slate-500 font-bold text-sm mt-1">Use quando o item da nota ainda não se encaixa em nenhum grupo existente.</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Descrição do Grupo</label>
                        <input
                          required
                          type="text"
                          value={grupoDescricao}
                          onChange={(e) => setGrupoDescricao(e.target.value)}
                          placeholder="Ex.: Acabamento, Hidráulica, Ferramentas"
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                        />
                      </div>

                      <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 rounded-2xl font-black flex items-center gap-2">
                        <Tags size={18} />
                        CRIAR GRUPO
                      </button>
                    </form>

                    <form onSubmit={criarProduto} className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm space-y-5">
                      <div className="flex items-center gap-3">
                        <div className="bg-emerald-50 text-emerald-600 p-3 rounded-2xl"><PackagePlus size={22} /></div>
                        <div>
                          <h3 className="text-xl font-black text-slate-800">Cadastro Rápido de Produto/Serviço</h3>
                          <p className="text-slate-500 font-bold text-sm mt-1">
                            {itemEmFoco ? `Item em foco: ${itemEmFoco}. Após criar, ele já será selecionado nesta nota.` : 'Selecione “Usar no cadastro rápido” em um item para preencher este formulário.'}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                          <label className="text-sm font-bold text-slate-700 ml-1">Descrição</label>
                          <input
                            required
                            type="text"
                            value={produtoDescricao}
                            onChange={(e) => setProdutoDescricao(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 ml-1">Tipo</label>
                          <select
                            value={tipoNovo}
                            onChange={(e) => setTipoNovo(e.target.value as 'PRODUTO' | 'SERVICO')}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                          >
                            <option value="PRODUTO">Produto</option>
                            <option value="SERVICO">Serviço</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 ml-1">Grupo</label>
                          <select
                            required
                            value={produtoGrupoId}
                            onChange={(e) => setProdutoGrupoId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                          >
                            <option value="">Selecionar...</option>
                            {grupos.map((grupo) => (
                              <option key={grupo.id} value={grupo.id}>{grupo.codigo} • {grupo.descricao}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 ml-1">Unidade</label>
                          <input
                            required
                            type="text"
                            value={produtoUnidade}
                            onChange={(e) => setProdutoUnidade(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 ml-1">Preço de Custo</label>
                          <input
                            required
                            type="number"
                            step="0.01"
                            value={produtoPreco}
                            onChange={(e) => setProdutoPreco(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                          />
                        </div>
                      </div>

                      <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-black flex items-center gap-2">
                        <PackagePlus size={18} />
                        CRIAR PRODUTO/SERVIÇO
                      </button>
                    </form>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
