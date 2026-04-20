import { useEffect, useState } from 'react';
import { Search, Plus, Trash2, X, ClipboardList, Edit2 } from 'lucide-react';
import { API } from '../config';
import { formatBRL } from '../utils/format';

const STATUS_OPTIONS = ['pendente', 'em andamento', 'concluída', 'cancelada'];

const fmtData = (d?: string) =>
  d ? new Date(d).toLocaleDateString('pt-BR') : '—';

const toInputDate = (d?: string) => {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
};

const statusColor: Record<string, string> = {
  'concluída':    'bg-emerald-100 text-emerald-700',
  'em andamento': 'bg-blue-100 text-blue-700',
  'pendente':     'bg-amber-100 text-amber-700',
  'cancelada':    'bg-slate-100 text-slate-500',
};

const InputField = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-400";

export const EtapasView = () => {
  const [canteiros, setCanteiros] = useState<any[]>([]);
  const [obras, setObras]         = useState<any[]>([]);
  const [catalogo, setCatalogo]   = useState<any[]>([]);
  const [etapas, setEtapas]       = useState<any[]>([]);

  const [canteiroSel, setCanteiroSel] = useState('');
  const [obraId, setObraId]           = useState('');
  const [dataLanc, setDataLanc]       = useState(() => new Date().toISOString().slice(0, 10));

  // formulário de novo lançamento
  const [buscaCatalogo, setBuscaCatalogo]       = useState('');
  const [catalogoFiltrado, setCatalogoFiltrado] = useState<any[]>([]);
  const [showDropdown, setShowDropdown]         = useState(false);
  const [etapaSel, setEtapaSel]                 = useState<any>(null);
  const [valorReceber, setValorReceber]         = useState('');
  const [statusEtapa, setStatusEtapa]           = useState('pendente');
  const [descricao, setDescricao]               = useState('');
  const [dataBaixa, setDataBaixa]               = useState('');
  const [salvando, setSalvando]                 = useState(false);
  const [erro, setErro]                         = useState('');

  // modal edição
  const [editItem, setEditItem]           = useState<any>(null);
  const [editServico, setEditServico]     = useState('');
  const [editDesc, setEditDesc]           = useState('');
  const [editValor, setEditValor]         = useState('');
  const [editStatus, setEditStatus]       = useState('pendente');
  const [editDataLanc, setEditDataLanc]   = useState('');
  const [editDataBaixa, setEditDataBaixa] = useState('');
  const [salvandoEdit, setSalvandoEdit]   = useState(false);
  const [erroEdit, setErroEdit]           = useState('');

  // modal catálogo
  const [modalCatalogo, setModalCatalogo]   = useState(false);
  const [novoServico, setNovoServico]       = useState('');
  const [novoDesc, setNovoDesc]             = useState('');
  const [novoValor, setNovoValor]           = useState('');
  const [salvandoCatalogo, setSalvandoCatalogo] = useState(false);

  // modal exclusão
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const obraAtual    = obras.find(o => String(o.id) === obraId);
  const obrasFiltradas = canteiroSel
    ? obras.filter(o => String(o.id_canteiro) === canteiroSel)
    : obras;

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/canteiros/lista`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/obras`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/etapas-catalogo`).then(r => r.json()).catch(() => []),
    ]).then(([c, o, cat]) => { setCanteiros(c); setObras(o); setCatalogo(cat); });
  }, []);

  useEffect(() => {
    if (!obraId) { setEtapas([]); return; }
    fetch(`${API}/api/etapas-obra?id_obra=${obraId}`)
      .then(r => r.json()).then(setEtapas).catch(() => setEtapas([]));
  }, [obraId]);

  useEffect(() => {
    const q = buscaCatalogo.trim().toLowerCase();
    if (!q) { setCatalogoFiltrado([]); setShowDropdown(false); return; }
    setCatalogoFiltrado(catalogo.filter(e =>
      e.servico_executado.toLowerCase().includes(q) || e.codigo.toLowerCase().includes(q)
    ));
    setShowDropdown(true);
  }, [buscaCatalogo, catalogo]);

  const selecionarDoCatalogo = (item: any) => {
    setEtapaSel(item);
    setBuscaCatalogo(item.servico_executado);
    setValorReceber(item.valor_padrao ? String(Number(item.valor_padrao).toFixed(2)) : '');
    setShowDropdown(false);
  };

  const limparFormulario = () => {
    setEtapaSel(null); setBuscaCatalogo(''); setValorReceber('');
    setStatusEtapa('pendente'); setDescricao(''); setDataBaixa('');
  };

  const lancarEtapa = async () => {
    setErro('');
    const servico = etapaSel?.servico_executado || buscaCatalogo.trim();
    if (!obraId)   { setErro('Selecione uma obra.'); return; }
    if (!servico)  { setErro('Informe o serviço executado.'); return; }
    if (!valorReceber || isNaN(parseFloat(valorReceber))) { setErro('Informe o valor a receber.'); return; }
    setSalvando(true);
    try {
      const res = await fetch(`${API}/api/etapas-obra`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_obra: parseInt(obraId), id_etapa_catalogo: etapaSel?.id || null,
          servico_executado: servico, descricao,
          valor_a_receber: parseFloat(valorReceber), status_etapa: statusEtapa,
          data_lancamento: dataLanc, data_baixa: dataBaixa || null,
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.erro || 'Erro'); }
      const nova = await res.json();
      setEtapas(prev => [nova, ...prev]);
      limparFormulario();
    } catch (e: any) { setErro(e.message); }
    finally { setSalvando(false); }
  };

  // ── Abrir modal de edição ──
  const abrirEdicao = (e: any) => {
    setEditItem(e);
    setEditServico(e.servico_executado || '');
    setEditDesc(e.descricao || '');
    setEditValor(String(Number(e.valor_a_receber || 0).toFixed(2)));
    setEditStatus(e.status_etapa || 'pendente');
    setEditDataLanc(toInputDate(e.data_lancamento));
    setEditDataBaixa(toInputDate(e.data_baixa));
    setErroEdit('');
  };

  const salvarEdicao = async () => {
    if (!editServico.trim()) { setErroEdit('Serviço obrigatório.'); return; }
    if (!editValor || isNaN(parseFloat(editValor))) { setErroEdit('Valor inválido.'); return; }
    setSalvandoEdit(true);
    setErroEdit('');
    try {
      const res = await fetch(`${API}/api/etapas-obra/${editItem.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          servico_executado: editServico.trim(), descricao: editDesc.trim(),
          valor_a_receber: parseFloat(editValor), status_etapa: editStatus,
          data_lancamento: editDataLanc || undefined, data_baixa: editDataBaixa || null,
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.erro || 'Erro'); }
      const atualizado = await res.json();
      setEtapas(prev => prev.map(e => e.id === atualizado.id ? atualizado : e));
      setEditItem(null);
    } catch (e: any) { setErroEdit(e.message); }
    finally { setSalvandoEdit(false); }
  };

  const confirmarDelete = async () => {
    if (!deleteId) return;
    await fetch(`${API}/api/etapas-obra/${deleteId}`, { method: 'DELETE' });
    setEtapas(prev => prev.filter(e => e.id !== deleteId));
    setDeleteId(null);
  };

  const salvarNoCatalogo = async () => {
    if (!novoServico.trim()) return;
    setSalvandoCatalogo(true);
    try {
      const res = await fetch(`${API}/api/etapas-catalogo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ servico_executado: novoServico.trim(), descricao: novoDesc.trim(), valor_padrao: parseFloat(novoValor) || 0 }),
      });
      if (!res.ok) throw new Error('Erro ao salvar no catálogo');
      const novo = await res.json();
      setCatalogo(prev => [...prev, novo]);
      setModalCatalogo(false);
      setNovoServico(''); setNovoDesc(''); setNovoValor('');
    } finally { setSalvandoCatalogo(false); }
  };

  const totalRecebido = etapas.reduce((acc, e) => acc + parseFloat(e.valor_a_receber || 0), 0);
  const orcamento     = parseFloat(obraAtual?.valor_contratado || 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tighter">Etapas da Obra</h2>
        <p className="text-slate-400 text-sm font-medium mt-1">Registre e acompanhe etapas e valores a receber por obra</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Painel Esquerdo ── */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-[24px] p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Dados Principais</h3>
            {obraAtual && (
              <div className="bg-slate-50 rounded-xl px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Status da Obra</p>
                <span className="text-sm font-black text-slate-700">{obraAtual.status || 'ATIVA'}</span>
              </div>
            )}
            <InputField label="Canteiro">
              <select value={canteiroSel} onChange={e => { setCanteiroSel(e.target.value); setObraId(''); }} className={inputCls}>
                <option value="">— Todos os canteiros —</option>
                {canteiros.map((c: any) => <option key={c.id} value={String(c.id)}>{c.nome}</option>)}
              </select>
            </InputField>
            <InputField label="Obra *">
              <select value={obraId} onChange={e => setObraId(e.target.value)} className={inputCls}>
                <option value="">— Selecione a obra —</option>
                {obrasFiltradas.map((o: any) => <option key={o.id} value={String(o.id)}>{o.nome}</option>)}
              </select>
            </InputField>
            <InputField label="Data do Lançamento">
              <input type="date" value={dataLanc} onChange={e => setDataLanc(e.target.value)} className={inputCls} />
            </InputField>
          </div>

          <div className="bg-white border border-slate-200 rounded-[24px] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Adicionar Etapa</h3>
              <button onClick={() => setModalCatalogo(true)} className="flex items-center gap-1.5 text-xs font-black text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl transition-all">
                <Plus size={14} /> Novo no catálogo
              </button>
            </div>

            <div className="relative">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Buscar no catálogo</label>
              <div className="relative flex items-center">
                <Search size={16} className="absolute left-3 text-slate-400" />
                <input type="text" value={buscaCatalogo} onChange={e => setBuscaCatalogo(e.target.value)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  onFocus={() => buscaCatalogo.trim() && setShowDropdown(true)}
                  placeholder="Código ou descrição..."
                  className="w-full pl-9 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-400"
                />
                {buscaCatalogo && (
                  <button onClick={() => { setBuscaCatalogo(''); setEtapaSel(null); }} className="absolute right-3 text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                )}
              </div>
              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 max-h-48 overflow-auto">
                  {catalogoFiltrado.length === 0
                    ? <div className="p-4 text-sm font-bold text-slate-400">Nenhuma etapa encontrada.</div>
                    : catalogoFiltrado.map(item => (
                      <button key={item.id} type="button" onMouseDown={() => selecionarDoCatalogo(item)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                        <p className="font-black text-slate-800 text-sm truncate">{item.servico_executado}</p>
                        <p className="text-[11px] font-bold text-slate-400">{item.codigo}{item.valor_padrao > 0 ? ` • ${formatBRL(Number(item.valor_padrao))}` : ''}</p>
                      </button>
                    ))
                  }
                </div>
              )}
            </div>

            <InputField label="Valor a Receber *">
              <input type="number" step="0.01" value={valorReceber} onChange={e => setValorReceber(e.target.value)} placeholder="R$ 0,00" className={inputCls} />
            </InputField>
            <InputField label="Status da Etapa">
              <select value={statusEtapa} onChange={e => setStatusEtapa(e.target.value)} className={inputCls}>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </InputField>
            <InputField label="Descrição (opcional)">
              <input type="text" value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Ex: Paredes internas..." className={inputCls} />
            </InputField>
            <div>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Data de Baixa / Recebimento</label>
              <input type="date" value={dataBaixa} onChange={e => setDataBaixa(e.target.value)} className={inputCls} />
              <p className="text-[10px] text-slate-400 mt-1 font-medium">Deixe em branco se ainda não recebido</p>
            </div>

            {erro && <p className="text-red-500 text-xs font-bold">{erro}</p>}

            <button onClick={lancarEtapa} disabled={salvando || !obraId}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black px-4 py-3 rounded-2xl text-sm transition-all shadow-lg shadow-blue-100">
              {salvando ? 'Lançando...' : 'ADICIONAR ETAPA'}
            </button>
          </div>
        </div>

        {/* ── Painel Direito ── */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[24px] overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-slate-800">
                Dados Lançados {obraAtual ? `— ${obraAtual.nome}` : ''}
              </h3>
              {obraAtual && orcamento > 0 && (
                <p className="text-xs font-bold text-slate-400 mt-0.5">Orçamento: {formatBRL(orcamento)}</p>
              )}
            </div>
            {etapas.length > 0 && obraId && (
              <button onClick={() => window.open(`/relatorio-executor/${obraId}`, '_blank')}
                className="flex items-center gap-2 text-xs font-black text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-4 py-2 rounded-xl transition-all">
                <ClipboardList size={14} /> Relatório Executor
              </button>
            )}
          </div>

          {!obraId ? (
            <div className="py-16 text-center text-slate-400 font-bold">Selecione uma obra para ver as etapas.</div>
          ) : etapas.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-bold">Nenhuma etapa lançada para esta obra.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[560px]">
                  <thead className="bg-slate-50/80 text-slate-400 uppercase text-[10px] font-black tracking-[2px]">
                    <tr>
                      <th className="px-4 py-4">Data</th>
                      <th className="px-4 py-4">Serviço Executado</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 hidden md:table-cell">Dt. Baixa</th>
                      <th className="px-4 py-4 text-right">Valor</th>
                      {orcamento > 0 && <th className="px-4 py-4 text-right hidden sm:table-cell">%</th>}
                      <th className="px-4 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {etapas.map(e => {
                      const val = parseFloat(e.valor_a_receber || 0);
                      const pct = orcamento > 0 ? ((val / orcamento) * 100).toFixed(1) : null;
                      return (
                        <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-4 text-sm font-bold text-slate-500 whitespace-nowrap">
                            {fmtData(e.data_lancamento)}
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-black text-slate-800 text-sm">{e.servico_executado}</p>
                            {e.descricao && <p className="text-[11px] text-slate-400 font-bold">{e.descricao}</p>}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-[11px] font-black px-2.5 py-1 rounded-xl whitespace-nowrap ${statusColor[e.status_etapa] || 'bg-slate-100 text-slate-500'}`}>
                              {e.status_etapa}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm font-bold whitespace-nowrap hidden md:table-cell">
                            {e.data_baixa
                              ? <span className="text-emerald-700">{fmtData(e.data_baixa)}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-4 text-right font-black text-emerald-700 text-sm whitespace-nowrap">
                            {formatBRL(val)}
                          </td>
                          {orcamento > 0 && (
                            <td className="px-4 py-4 text-right text-sm font-bold text-slate-400 whitespace-nowrap hidden sm:table-cell">
                              {pct}%
                            </td>
                          )}
                          <td className="px-4 py-4 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => abrirEdicao(e)}
                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                title="Editar andamento">
                                <Edit2 size={15} />
                              </button>
                              <button onClick={() => setDeleteId(e.id)}
                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                title="Excluir">
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  {etapas.length} etapa{etapas.length !== 1 ? 's' : ''}
                </span>
                <div className="text-right">
                  <span className="text-base font-black text-emerald-700">{formatBRL(totalRecebido)}</span>
                  {orcamento > 0 && (
                    <span className="ml-3 text-xs font-black text-slate-400">
                      {((totalRecebido / orcamento) * 100).toFixed(1)}% do orçamento
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ Modal — Editar Andamento da Etapa ═══ */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button type="button" aria-label="Fechar" onClick={() => setEditItem(null)} className="absolute inset-0 bg-slate-900/40" />
          <div className="relative bg-white w-full max-w-lg rounded-3xl border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-lg font-black text-slate-800">Atualizar Andamento</h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">{editItem.servico_executado}</p>
              </div>
              <button onClick={() => setEditItem(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <InputField label="Serviço Executado *">
                <input type="text" value={editServico} onChange={e => setEditServico(e.target.value)} className={inputCls} />
              </InputField>

              <InputField label="Descrição">
                <input type="text" value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Ex: Paredes internas..." className={inputCls} />
              </InputField>

              <div className="grid grid-cols-2 gap-4">
                <InputField label="Valor a Receber *">
                  <input type="number" step="0.01" value={editValor} onChange={e => setEditValor(e.target.value)} className={inputCls} />
                </InputField>

                <InputField label="Status da Etapa">
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className={inputCls}>
                    {STATUS_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </InputField>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <InputField label="Data do Lançamento">
                  <input type="date" value={editDataLanc} onChange={e => setEditDataLanc(e.target.value)} className={inputCls} />
                </InputField>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Data de Baixa</label>
                  <input type="date" value={editDataBaixa} onChange={e => setEditDataBaixa(e.target.value)} className={inputCls} />
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">Deixe vazio se não recebido</p>
                </div>
              </div>

              {erroEdit && <p className="text-red-500 text-xs font-bold">{erroEdit}</p>}

              {/* Atalhos rápidos de status */}
              <div className="border-t border-slate-100 pt-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Atualização rápida de status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(s => (
                    <button key={s} type="button"
                      onClick={() => setEditStatus(s)}
                      className={`text-xs font-black px-3 py-1.5 rounded-xl border transition-all ${editStatus === s ? (statusColor[s] || 'bg-slate-100 text-slate-600') + ' border-transparent' : 'border-slate-200 text-slate-500 hover:border-slate-300 bg-white'}`}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setEditItem(null)}
                className="flex-1 border border-slate-200 font-black px-4 py-3 rounded-2xl text-sm text-slate-600 hover:bg-slate-50 transition-all">
                CANCELAR
              </button>
              <button onClick={salvarEdicao} disabled={salvandoEdit}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black px-4 py-3 rounded-2xl text-sm transition-all shadow-lg shadow-blue-100">
                {salvandoEdit ? 'Salvando...' : 'SALVAR ALTERAÇÕES'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal — Novo no catálogo ═══ */}
      {modalCatalogo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button type="button" aria-label="Fechar" onClick={() => setModalCatalogo(false)} className="absolute inset-0 bg-slate-900/40" />
          <div className="relative bg-white w-full max-w-md rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-800">Cadastrar no Catálogo</h3>
              <button onClick={() => setModalCatalogo(false)} className="p-2 rounded-xl hover:bg-slate-50 text-slate-400"><X size={18} /></button>
            </div>
            <InputField label="Serviço Executado *">
              <input type="text" value={novoServico} onChange={e => setNovoServico(e.target.value)} placeholder="Ex: Pintura" className={inputCls} />
            </InputField>
            <InputField label="Descrição">
              <input type="text" value={novoDesc} onChange={e => setNovoDesc(e.target.value)} placeholder="Ex: Paredes internas" className={inputCls} />
            </InputField>
            <InputField label="Valor Padrão">
              <input type="number" step="0.01" value={novoValor} onChange={e => setNovoValor(e.target.value)} placeholder="R$ 0,00" className={inputCls} />
            </InputField>
            <button onClick={salvarNoCatalogo} disabled={salvandoCatalogo || !novoServico.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black px-4 py-3 rounded-2xl text-sm transition-all">
              {salvandoCatalogo ? 'Salvando...' : 'SALVAR NO CATÁLOGO'}
            </button>
          </div>
        </div>
      )}

      {/* ═══ Modal — Confirmar exclusão ═══ */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button type="button" aria-label="Fechar" onClick={() => setDeleteId(null)} className="absolute inset-0 bg-slate-900/40" />
          <div className="relative bg-white w-full max-w-sm rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-5">
            <h3 className="text-lg font-black text-slate-800">Excluir Etapa</h3>
            <p className="text-slate-500 font-medium text-sm">Deseja realmente excluir este lançamento? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 border border-slate-200 font-black px-4 py-3 rounded-2xl text-sm text-slate-600 hover:bg-slate-50 transition-all">CANCELAR</button>
              <button onClick={confirmarDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-black px-4 py-3 rounded-2xl text-sm transition-all">EXCLUIR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
