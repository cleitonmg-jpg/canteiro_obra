import { useMemo, useState, useEffect } from 'react';
import {
  Plus, Building2, MapPin, Search, Edit2, Trash2, X, HardHat,
  ChevronDown, ChevronRight, TrendingDown, TrendingUp, Save, FolderOpen
} from 'lucide-react';
import { API } from '../config';
import { formatBRL } from '../utils/format';
import { DEFAULT_OBRA_FILTRO_STATUS, matchesObraFiltroStatus, OBRA_FILTRO_STATUS_OPTIONS, obraFiltroLabel, type ObraFiltroStatus } from '../utils/obraStatus';

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface Obra {
  id: number;
  nome: string;
  endereco?: string;
  responsavel?: string;
  status: string;
  valor_contratado: number;
  gastos: number;
  id_canteiro?: number | null;
}

interface Canteiro {
  id: number;
  nome: string;
  endereco?: string;
  responsavel?: string;
  descricao?: string;
  ativo: boolean;
  data_cadastro: string;
  obras: Obra[];
  totalOrcamento: number;
  totalGastos: number;
  lucro: number;
}

const fmt = (v: number) => formatBRL(v);

const statusColor: Record<string, string> = {
  'LICITAÇÃO': 'bg-amber-100 text-amber-700',
  'FUNDAÇÃO': 'bg-orange-100 text-orange-700',
  'EXECUÇÃO': 'bg-blue-100 text-blue-700',
  'ATIVA': 'bg-blue-100 text-blue-700',
  'ACABAMENTO': 'bg-purple-100 text-purple-700',
  'FINALIZADA': 'bg-emerald-100 text-emerald-700',
};

// ─── Componente principal ────────────────────────────────────────────────────
export const CanteiroView = ({ buscaExterna }: any) => {
  const [canteiros, setCanteiros] = useState<Canteiro[]>([]);
  const [busca, setBusca] = useState('');
  const [expandido, setExpandido] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [filtroStatusObra, setFiltroStatusObra] = useState<ObraFiltroStatus>(DEFAULT_OBRA_FILTRO_STATUS);

  /* Formulário de canteiro */
  const [viewForm, setViewForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [responsavel, setResponsavel] = useState('');
  const [descricao, setDescricao] = useState('');

  // Carrega lista de canteiros com obras vinculadas
  const carregar = async () => {
    setCarregando(true);
    try {
      const res = await fetch(`${API}/api/canteiros`);
      if (!res.ok) throw new Error('Falha ao carregar canteiros');
      setCanteiros(await res.json());
    } catch (e: any) {
      setErro(e?.message || 'Erro de conexão');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  useEffect(() => {
    if (typeof buscaExterna === 'string') setBusca(buscaExterna);
  }, [buscaExterna]);

  // ── CRUD formulário ─────────────────────────────────────────────────────────
  const resetForm = () => {
    setEditId(null); setNome(''); setEndereco('');
    setResponsavel(''); setDescricao(''); setViewForm(false);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true); setErro('');
    try {
      const body = { nome, endereco, responsavel, descricao };
      const res = editId
        ? await fetch(`${API}/api/canteiros/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch(`${API}/api/canteiros`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.erro || 'Erro ao salvar');
      }
      await carregar(); resetForm();
    } catch (e: any) {
      setErro(e?.message || 'Erro ao salvar canteiro.');
    } finally {
      setCarregando(false);
    }
  };

  const handleEditar = (c: Canteiro) => {
    setEditId(c.id); setNome(c.nome); setEndereco(c.endereco || '');
    setResponsavel(c.responsavel || ''); setDescricao(c.descricao || '');
    setViewForm(true);
  };

  const handleExcluir = async (id: number) => {
    if (!window.confirm('Deseja inativar este canteiro?')) return;
    try {
      const res = await fetch(`${API}/api/canteiros/${id}`, { method: 'DELETE' });
      const body = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(body.erro || 'Erro ao excluir canteiro.');
      await carregar();
    } catch (e: any) {
      setErro(e?.message || 'Erro ao excluir canteiro.');
    }
  };

  const canteirosExibidos = useMemo(() => {
    const termo = busca.toLowerCase();
    return canteiros
      .filter(c =>
        c.nome.toLowerCase().includes(termo) ||
        (c.responsavel || '').toLowerCase().includes(termo)
      )
      .map(c => {
        const obrasFiltradas = (c.obras || []).filter(o => matchesObraFiltroStatus(o.status, filtroStatusObra));
        const totalOrcamento = obrasFiltradas.reduce((acc, o) => acc + (Number(o.valor_contratado) || 0), 0);
        const totalGastos = obrasFiltradas.reduce((acc, o) => acc + (Number(o.gastos) || 0), 0);
        const lucro = totalOrcamento - totalGastos;
        return {
          ...c,
          obras: obrasFiltradas,
          totalOrcamento,
          totalGastos,
          lucro,
        };
      });
  }, [canteiros, busca, filtroStatusObra]);

  // ── FORMULÁRIO ──────────────────────────────────────────────────────────────
  if (viewForm) {
    return (
      <div className="space-y-8">
        <form onSubmit={handleSalvar} className="bg-white p-8 rounded-[28px] border border-slate-200 shadow-sm space-y-8">
          <div className="flex justify-between items-center border-b border-slate-100 pb-6">
            <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <Building2 className="text-blue-500" />
              {editId ? 'Editando Canteiro de Obras' : 'Novo Canteiro de Obras'}
            </h3>
            <button type="button" onClick={resetForm} className="text-slate-400 hover:text-red-500 p-2 bg-slate-50 rounded-xl"><X size={20} /></button>
          </div>

          {erro && <div className="bg-red-50 border border-red-200 text-red-700 font-bold px-6 py-4 rounded-2xl">{erro}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Nome do Canteiro / Empresa / Escritório *</label>
              <input required type="text" placeholder="Ex: Escritório Central, Canteiro Divinópolis..." value={nome}
                onChange={e => setNome(e.target.value)}
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none focus:border-blue-500 font-medium" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Eng. / Responsável</label>
              <input type="text" placeholder="Nome do responsável" value={responsavel} onChange={e => setResponsavel(e.target.value)}
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none focus:border-blue-500 font-medium" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Endereço / Localização</label>
              <input type="text" placeholder="Cidade, rua..." value={endereco} onChange={e => setEndereco(e.target.value)}
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none focus:border-blue-500 font-medium" />
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Descrição / Observação</label>
              <textarea rows={3} placeholder="Informações adicionais sobre o canteiro..." value={descricao} onChange={e => setDescricao(e.target.value)}
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:outline-none focus:border-blue-500 font-medium resize-none" />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 gap-3">
            <button type="button" onClick={resetForm} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={carregando}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-10 py-4 rounded-xl font-black text-lg shadow-lg flex items-center gap-2 active:scale-95 transition-all">
              <Save size={18} /> SALVAR CANTEIRO
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── LISTA DE CANTEIROS ──────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center bg-white p-5 rounded-[26px] border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Canteiros de Obras</h2>
          <p className="text-slate-500 font-bold mt-1 text-sm">
            Gerencie os canteiros (empresas/escritórios) que agrupam suas obras.
            <span className="ml-2 text-blue-600">Clique em um canteiro para ver suas obras.</span>
          </p>
        </div>
        <button onClick={() => setViewForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-2xl text-sm font-black shadow-lg shadow-blue-100 flex items-center gap-2 transition-all">
          <Plus size={20} /> NOVO CANTEIRO
        </button>
      </div>

      {erro && <div className="bg-red-50 border border-red-200 text-red-700 font-bold px-6 py-4 rounded-2xl">{erro}</div>}

      {/* Campo de busca */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/60 max-w-sm flex items-center gap-3 focus-within:ring-4 ring-blue-50 transition-all">
          <Search size={18} className="text-slate-400" />
          <input type="text" placeholder="Buscar canteiro..." value={busca} onChange={e => setBusca(e.target.value)}
            className="bg-transparent border-none outline-none w-full font-bold text-sm text-slate-700" />
        </div>

        <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-200/60 max-w-sm flex items-center gap-3">
          <HardHat size={16} className="text-blue-500 shrink-0" />
          <select
            value={filtroStatusObra}
            onChange={(e) => setFiltroStatusObra(e.target.value as ObraFiltroStatus)}
            className="bg-transparent border-none outline-none w-full font-bold text-sm text-slate-700"
            title={`Filtro de obras: ${obraFiltroLabel(filtroStatusObra)}`}
          >
            {OBRA_FILTRO_STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {carregando && (
        <div className="bg-white rounded-[32px] border border-slate-200 p-12 text-center text-slate-400 font-bold">Carregando...</div>
      )}

      {!carregando && canteirosExibidos.length === 0 && (
        <div className="bg-white rounded-[32px] border border-slate-200 p-16 text-center shadow-sm">
          <Building2 size={64} className="mx-auto text-slate-200 mb-6" />
          <h3 className="text-xl font-black text-slate-500 mb-2">Nenhum canteiro encontrado</h3>
          <p className="text-slate-400 font-medium">Cadastre o primeiro canteiro de obras clicando em "Novo Canteiro".</p>
        </div>
      )}

      {/* Lista de canteiros, cada um expansível */}
      <div className="space-y-5">
        {canteirosExibidos.map(c => {
          const aberto = expandido === c.id;
          const lucroPositivo = c.lucro >= 0;

          return (
            <div key={c.id}
              className={`bg-white border rounded-[24px] shadow-sm transition-all overflow-hidden ${aberto ? 'border-blue-300 shadow-blue-100' : 'border-slate-200 hover:border-blue-200'}`}>

              {/* Linha do canteiro */}
              <div className="p-5 flex flex-col md:flex-row md:items-center gap-4">
                {/* Botão expansão */}
                <button onClick={() => setExpandido(aberto ? null : c.id)}
                  className={`flex items-center gap-3 text-left flex-1 min-w-0 ${aberto ? 'text-blue-700' : 'text-slate-700'}`}>
                  <div className={`p-2.5 rounded-2xl shrink-0 transition-colors ${aberto ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                    <FolderOpen size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-lg leading-tight truncate">{c.nome}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      {c.responsavel && (
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                          <HardHat size={12} /> {c.responsavel}
                        </span>
                      )}
                      {c.endereco && (
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-500">
                          <MapPin size={12} /> {c.endereco}
                        </span>
                      )}
                      <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {c.obras.length} obra(s)
                      </span>
                    </div>
                  </div>
                </button>

                {/* Totais do canteiro */}
                <div className="flex flex-wrap gap-4 shrink-0">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Orçamento</p>
                    <p className="text-sm font-black text-slate-700">{fmt(c.totalOrcamento)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest">Gastos</p>
                    <p className="text-sm font-black text-red-600">{fmt(c.totalGastos)}</p>
                  </div>
                  <div className={`text-right px-3 py-1.5 rounded-xl ${lucroPositivo ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <p className={`text-[9px] font-black uppercase tracking-widest flex items-center justify-end gap-1 ${lucroPositivo ? 'text-emerald-500' : 'text-red-400'}`}>
                      {lucroPositivo ? <TrendingUp size={10} /> : <TrendingDown size={10} />} Lucro
                    </p>
                    <p className={`text-sm font-black ${lucroPositivo ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(c.lucro)}</p>
                  </div>
                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEditar(c)} title="Editar canteiro"
                      className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-colors">
                      <Edit2 size={16} />
                    </button>
                    <button onClick={() => handleExcluir(c.id)} title="Inativar canteiro"
                      className="p-2 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl transition-colors">
                      <Trash2 size={16} />
                    </button>
                    <button onClick={() => setExpandido(aberto ? null : c.id)} title={aberto ? 'Recolher' : 'Expandir obras'}
                      className={`p-2 rounded-xl transition-colors ${aberto ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-blue-50 hover:text-blue-600'}`}>
                      {aberto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Obras do canteiro (expansível) */}
              {aberto && (
                <div className="border-t border-blue-100 bg-blue-50/30">
                  {c.obras.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-bold">
                      Nenhuma obra vinculada a este canteiro. Use "Cadastro de Obras" e selecione este canteiro.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-blue-100/50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                          <tr>
                            <th className="px-6 py-3">Obra</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Responsável</th>
                            <th className="px-6 py-3 text-right">Orçamento</th>
                            <th className="px-6 py-3 text-right">Gastos</th>
                            <th className="px-6 py-3 text-right">Lucro</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-100">
                          {c.obras.map(o => {
                            const lucro = (Number(o.valor_contratado) || 0) - (o.gastos || 0);
                            const pos = lucro >= 0;
                            return (
                              <tr key={o.id} className="hover:bg-white/60 transition-colors">
                                <td className="px-6 py-3.5">
                                  <p className="font-black text-slate-800 leading-tight">{o.nome}</p>
                                  {o.endereco && <p className="text-[10px] text-slate-400 font-bold mt-0.5">{o.endereco}</p>}
                                </td>
                                <td className="px-6 py-3.5">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${statusColor[o.status] || 'bg-slate-100 text-slate-600'}`}>
                                    {o.status}
                                  </span>
                                </td>
                                <td className="px-6 py-3.5 text-slate-500 font-bold text-xs">{o.responsavel || '—'}</td>
                                <td className="px-6 py-3.5 text-right font-bold text-slate-700">{fmt(Number(o.valor_contratado) || 0)}</td>
                                <td className="px-6 py-3.5 text-right font-bold text-red-600">{fmt(o.gastos || 0)}</td>
                                <td className={`px-6 py-3.5 text-right font-black ${pos ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(lucro)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {/* Linha de totais */}
                        <tfoot className="bg-blue-100 border-t-2 border-blue-200">
                          <tr>
                            <td colSpan={3} className="px-6 py-3 text-xs font-black text-blue-700 uppercase tracking-widest">
                              TOTAL DO CANTEIRO — {c.obras.length} obra(s)
                            </td>
                            <td className="px-6 py-3 text-right font-black text-slate-800">{fmt(c.totalOrcamento)}</td>
                            <td className="px-6 py-3 text-right font-black text-red-700">{fmt(c.totalGastos)}</td>
                            <td className={`px-6 py-3 text-right font-black ${c.lucro >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(c.lucro)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
