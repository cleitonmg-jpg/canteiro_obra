import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Construction, 
  Package, 
  Users, 
  Settings, 
  LogOut, 
  Search, 
  Plus,
  BarChart3,
  LayoutDashboard,
  FileText,
  ChevronRight,
  Calculator,
  HardHat,
  Menu,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API } from '../config';
import { useEmpresaNome } from '../hooks/useEmpresaNome';

import { DashboardOverview } from '../views/DashboardOverview';
import { EmpresaView } from '../views/EmpresaView';
import { ObrasView } from '../views/ObrasView';
import { GruposView } from '../views/GruposView';
import { ProdutosView } from '../views/ProdutosView';
import { MovimentosView } from '../views/MovimentosView';
import { RelatoriosView } from '../views/RelatoriosView';
import { UsuariosView } from '../views/UsuariosView';
import { AuditoriaView } from '../views/AuditoriaView';

const NavItem = ({ icon: Icon, label, active = false, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`
            w-full flex items-center gap-4 px-4 py-4 rounded-2xl font-bold transition-all group
            ${active ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
        `}
    >
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
        <span className="text-sm">{label}</span>
        {active && <ChevronRight size={16} className="ml-auto opacity-50" />}
    </button>
);

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const empresaNome = useEmpresaNome();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [globalSearch, setGlobalSearch] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchData, setSearchData] = useState<{ obras: any[]; produtos: any[]; grupos: any[] } | null>(null);

    const [buscaObrasExterna, setBuscaObrasExterna] = useState('');
    const [buscaProdutosExterna, setBuscaProdutosExterna] = useState('');
    const [buscaGruposExterna, setBuscaGruposExterna] = useState('');
    const userName = localStorage.getItem('user_name') || 'Usuário';

    const handleLogout = () => {
        localStorage.clear();
        navigate('/');
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setSidebarOpen(false);
        setGlobalSearch('');
        setBuscaObrasExterna('');
        setBuscaProdutosExterna('');
        setBuscaGruposExterna('');
    };

    const carregarSearchData = async () => {
        if (searchData) return searchData;
        setSearchLoading(true);
        try {
            const [obrasRes, produtosRes, gruposRes] = await Promise.all([
                fetch(`${API}/api/obras`),
                fetch(`${API}/api/produtos`),
                fetch(`${API}/api/grupos`),
            ]);
            const data = {
                obras: obrasRes.ok ? await obrasRes.json() : [],
                produtos: produtosRes.ok ? await produtosRes.json() : [],
                grupos: gruposRes.ok ? await gruposRes.json() : [],
            };
            setSearchData(data);
            return data;
        } finally {
            setSearchLoading(false);
        }
    };

    const aplicarBuscaNaAba = (termo: string) => {
        if (activeTab === 'obras') setBuscaObrasExterna(termo);
        if (activeTab === 'produtos') setBuscaProdutosExterna(termo);
        if (activeTab === 'grupos') setBuscaGruposExterna(termo);
    };

    const selecionarResultado = (r: any) => {
        const termo = globalSearch.trim();
        setSearchOpen(false);
        if (r?.type === 'obra') { setActiveTab('obras'); setBuscaObrasExterna(termo); }
        if (r?.type === 'produto') { setActiveTab('produtos'); setBuscaProdutosExterna(termo); }
        if (r?.type === 'grupo') { setActiveTab('grupos'); setBuscaGruposExterna(termo); }
    };

    useEffect(() => {
        const termo = globalSearch.trim();

        // Em outras abas, a busca do topo filtra a listagem da própria aba (sem dropdown global)
        if (activeTab !== 'dashboard') {
            aplicarBuscaNaAba(termo);
            setSearchOpen(false);
            setSearchResults([]);
            return;
        }

        if (termo.length < 2) {
            setSearchOpen(false);
            setSearchResults([]);
            return;
        }

        setSearchOpen(true);
        const id = setTimeout(async () => {
            const base = await carregarSearchData();
            const q = termo.toLowerCase();

            const obras = base.obras
                .filter((o: any) => String(o.nome || '').toLowerCase().includes(q) || String(o.id || '').includes(q))
                .slice(0, 5)
                .map((o: any) => ({ type: 'obra', id: o.id, title: o.nome, subtitle: `OB-${String(o.id).padStart(3, '0')} • ${o.status || ''}` }));

            const produtos = base.produtos
                .filter((p: any) => String(p.descricao || '').toLowerCase().includes(q) || String(p.codigo_interno || '').toLowerCase().includes(q))
                .slice(0, 5)
                .map((p: any) => ({ type: 'produto', id: p.id, title: p.descricao, subtitle: `${p.codigo_interno || ''} • ${p.tipo || ''}` }));

            const grupos = base.grupos
                .filter((g: any) => String(g.descricao || '').toLowerCase().includes(q) || String(g.codigo || '').toLowerCase().includes(q))
                .slice(0, 5)
                .map((g: any) => ({ type: 'grupo', id: g.id, title: g.descricao, subtitle: `${g.codigo || ''}` }));

            setSearchResults([...obras, ...produtos, ...grupos]);
        }, 250);

        return () => clearTimeout(id);
    }, [globalSearch, activeTab]);

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Backdrop mobile */}
            {sidebarOpen && (
                <button
                    type="button"
                    aria-label="Fechar menu"
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-slate-900/40 z-30 md:hidden"
                />
            )}

            {/* Sidebar Lateral */}
            <aside
                className={`w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm fixed h-full z-40 transition-transform duration-200 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
            >
                <div className="p-8 border-b border-slate-100 mb-6 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-100">
                        <Construction size={24} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tighter">CANTEIRO</h1>
                    <button
                        type="button"
                        aria-label="Fechar menu"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSidebarOpen(false);
                        }}
                        className="ml-auto md:hidden text-slate-500 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                    <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[2px] mb-4 mt-2">Visão Geral</p>
                    <NavItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => handleTabChange('dashboard')} />

                    <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[2px] mt-8 mb-4">Cadastros</p>
                    <NavItem icon={Building2} label="Cadastro da Empresa" active={activeTab === 'empresa'} onClick={() => handleTabChange('empresa')} />
                    <NavItem icon={HardHat} label="Cadastro de Obras" active={activeTab === 'obras'} onClick={() => handleTabChange('obras')} />
                    <NavItem icon={Package} label="Cadastro de Grupos" active={activeTab === 'grupos'} onClick={() => handleTabChange('grupos')} />
                    <NavItem icon={Settings} label="Produtos e Serviços" active={activeTab === 'produtos'} onClick={() => handleTabChange('produtos')} />

                    <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[2px] mt-8 mb-4">Movimentação</p>
                    <NavItem icon={Calculator} label="Lançamento nas Obras" active={activeTab === 'movimentos'} onClick={() => handleTabChange('movimentos')} />

                    <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[2px] mt-8 mb-4">Consultas</p>
                    <NavItem icon={BarChart3} label="Relatórios" active={false} onClick={() => { setSidebarOpen(false); window.open('/relatorios', '_blank'); }} />

                    <p className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-[2px] mt-8 mb-4">Sistema</p>
                    <NavItem icon={Users} label="Usuários" active={activeTab === 'usuarios'} onClick={() => handleTabChange('usuarios')} />
                    <NavItem icon={FileText} label="Auditoria" active={activeTab === 'auditoria'} onClick={() => handleTabChange('auditoria')} />
                </nav>

                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                    <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all font-bold text-sm"
                    >
                        <LogOut size={18} />
                        Desconectar
                    </button>
                </div>
            </aside>

            {/* Conteúdo Principal */}
            <main className="flex-1 flex flex-col w-full md:ml-72">
                {/* Header Superior Fixado */}
                <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 md:px-10 py-4 md:py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 sticky top-0 z-10">
                    <div className="flex items-center gap-3 md:gap-4 w-full md:w-auto">
                        <button
                            type="button"
                            aria-label="Abrir menu"
                            onClick={() => setSidebarOpen(true)}
                            className="md:hidden bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-2xl shadow-sm"
                        >
                            <Menu size={18} />
                        </button>

                        <div className="relative flex items-center gap-3 bg-slate-100/50 border border-slate-200 px-4 md:px-5 py-2.5 rounded-2xl w-full md:w-96 group focus-within:bg-white focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-50 transition-all">
                        <Search size={18} className="text-slate-400 group-focus-within:text-blue-500" />
                        <input 
                            type="text"
                            value={globalSearch}
                            onChange={(e) => {
                                const v = e.target.value;
                                setGlobalSearch(v);
                                if (activeTab !== 'dashboard') aplicarBuscaNaAba(v.trim());
                            }}
                            onFocus={() => { if (activeTab === 'dashboard' && globalSearch.trim().length >= 2) setSearchOpen(true); }}
                            onBlur={() => { if (activeTab === 'dashboard') setTimeout(() => setSearchOpen(false), 150); }}
                            onKeyDown={(e) => {
                                if (e.key !== 'Enter') return;
                                e.preventDefault();
                                const termo = globalSearch.trim();
                                if (termo.length < 2) return;
                                if (activeTab === 'dashboard') {
                                    if (searchResults[0]) selecionarResultado(searchResults[0]);
                                } else {
                                    aplicarBuscaNaAba(termo);
                                    setSearchOpen(false);
                                }
                            }}
                            placeholder="Buscar no sistema... (Cód/Desc)" 
                            className="bg-transparent border-none focus:outline-none w-full text-sm font-semibold text-slate-700"
                        />

                        {searchOpen && globalSearch.trim().length >= 2 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-20">
                                {searchLoading ? (
                                    <div className="p-4 text-sm font-bold text-slate-500">Carregando...</div>
                                ) : searchResults.length === 0 ? (
                                    <div className="p-4 text-sm font-bold text-slate-500">Sem resultados.</div>
                                ) : (
                                    <div className="max-h-80 overflow-auto">
                                        {searchResults.map((r: any) => (
                                            <button
                                                key={`${r.type}-${r.id}`}
                                                type="button"
                                                onMouseDown={() => selecionarResultado(r)}
                                                className="w-full text-left p-4 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="font-black text-slate-800 truncate">{r.title}</p>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0">{r.type}</span>
                                                </div>
                                                {r.subtitle && <p className="text-xs font-bold text-slate-500 mt-1 truncate">{r.subtitle}</p>}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6">
                        <div className="flex items-center gap-4 md:border-r md:border-slate-200 md:pr-6">
                            <button title="Nova Obra" onClick={() => handleTabChange('obras')} className="bg-emerald-50 text-emerald-600 p-2 rounded-lg hover:bg-emerald-100 transition-colors">
                                <Plus size={20} />
                            </button>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Root Access</p>
                                <p className="text-sm font-black text-slate-800 leading-none">{userName}</p>
                            </div>
                            <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-100">
                                {userName.charAt(0)}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Área Dinâmica baseada no activeTab */}
                <div className="p-4 md:p-10 pb-16 md:pb-20">
                    {activeTab === 'dashboard' && <DashboardOverview userName={userName} />}
                    {activeTab === 'empresa' && <EmpresaView onSaved={() => setActiveTab('dashboard')} />}
                    {activeTab === 'obras' && <ObrasView buscaExterna={buscaObrasExterna} />}
                    {activeTab === 'grupos' && <GruposView buscaExterna={buscaGruposExterna} />}
                    {activeTab === 'produtos' && <ProdutosView buscaExterna={buscaProdutosExterna} />}
                    {activeTab === 'movimentos' && <MovimentosView />}
                    {activeTab === 'relatorios' && <RelatoriosView />}
                    {activeTab === 'usuarios' && <UsuariosView />}
                    {activeTab === 'auditoria' && <AuditoriaView />}
                </div>

                {/* Direitos Autorais V9 */}
                <footer className="mt-auto px-4 md:px-10 py-8 md:py-10 text-center border-t border-slate-100 bg-white">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-[2px]">
                        V9 INFORMÁTICA LTDA - (37) 4141-0341 - Divinópolis MG
                    </p>
                    <p className="text-slate-300 text-[10px] mt-2 italic font-medium">Software Oficial da {empresaNome || 'Empresa'}</p>
                </footer>
            </main>
        </div>
    );
};

export default DashboardPage;
