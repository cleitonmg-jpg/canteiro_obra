import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { LayoutDashboard, Settings, User as UserIcon, Building, LogIn } from 'lucide-react';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RelatorioPage from './pages/RelatorioPage';
import RelatorioObraPage from './pages/RelatorioObraPage';
import RelatorioExecutorPage from './pages/RelatorioExecutorPage';
import { useEmpresaNome } from './hooks/useEmpresaNome';

const EmpresaNomeInline = ({ fallback = 'Empresa', className = '' }: any) => {
  const empresaNome = useEmpresaNome();
  return <span className={className}>{empresaNome || fallback}</span>;
};

// Componente Header Principal
const Header: React.FC = () => (
  <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="bg-blue-600 p-2 rounded-lg">
          <span className="text-white font-black text-xl leading-none">V9</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">CANTEIRO DE OBRAS</h1>
        <span className="text-slate-300 hidden md:inline">|</span>
        <EmpresaNomeInline className="text-slate-500 font-medium" />
      </div>
      <div className="flex items-center gap-4 w-full md:w-auto">
        <Link to="/login" className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black px-8 py-3 rounded-xl transition-all shadow-lg shadow-blue-200 transform hover:-translate-y-0.5">
          <LogIn size={20} />
          ACESSAR PORTAL
        </Link>
      </div>
    </div>
  </header>
);

// Componente Footer Principal
const Footer: React.FC = () => (
  <footer className="bg-slate-900 text-slate-300 py-12 border-t-4 border-blue-600">
    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
      <div className="space-y-4 text-center md:text-left">
        <h4 className="text-2xl font-black text-white px-2 py-1 bg-blue-600 inline-block rounded-md">V9 INFORMÁTICA LTDA</h4>
        <address className="not-italic text-slate-400 space-y-1">
          <p className="font-bold text-slate-200">Matriz Divinópolis MG</p>
          <p className="font-black text-blue-400 text-xl tracking-tight">(37) 4141-0341</p>
        </address>
      </div>
      <div className="flex flex-col items-center md:items-end gap-3">
        <div className="flex items-center gap-3">
          <div className="h-0.5 w-12 bg-blue-900"></div>
          <p className="text-sm font-bold tracking-widest text-slate-500 uppercase">© 2026 Todos os direitos reservados</p>
          <div className="h-0.5 w-12 bg-blue-900"></div>
        </div>
        <p className="text-xs text-slate-500 italic font-medium">Desenvolvimento Expert para Construtoras e Projetos</p>
      </div>
    </div>
  </footer>
);

// Página Home
const Home: React.FC = () => (
  <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
    <Header />
    <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-12 space-y-12">
      {/* Hero Section */}
      <section className="bg-white p-8 md:p-16 rounded-[40px] shadow-2xl shadow-slate-200/50 border border-white space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 opacity-30"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-slate-50 rounded-full -ml-16 -mb-16 opacity-50"></div>
        
        <div className="relative space-y-6">
          <span className="inline-block bg-blue-50 text-blue-700 px-4 py-1 rounded-full text-sm font-black uppercase tracking-widest">Tecnologia Premium</span>
          <h2 className="text-5xl md:text-7xl font-black text-slate-900 leading-none">
            Gestão de Obras para<br />
            <span className="text-blue-600">Engenharia Digital</span>
          </h2>
          <p className="text-slate-500 text-xl md:text-2xl leading-relaxed max-w-2xl font-medium">
            O software oficial da <strong><EmpresaNomeInline fallback="sua empresa" /></strong>. 
            Controle custos, materiais e equipes em um único lugar.
          </p>
          
          <div className="flex flex-wrap gap-4 pt-4">
            <Link to="/login" className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl shadow-slate-300 hover:bg-slate-800 transition-all flex items-center gap-2">
              ACESSAR PORTAL
              <LayoutDashboard size={20} />
            </Link>
          </div>
        </div>
        
        {/* Características */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 pt-12 border-t border-slate-100">
          {[
        { id: '01', title: 'Gestão Centralizada', icon: Building, desc: 'Todos os dados da sua construtora organizados e seguros em um único ambiente.' },
            { id: '02', title: 'Auditoria Total', icon: UserIcon, desc: 'Toda movimentação registra quem, quando e o que foi alterado.' },
            { id: '03', title: 'Financeiro Direto', icon: Settings, desc: 'Lance demandas por obra e acompanhe lucro e prejuízo por grupos.' }
          ].map(item => (
            <div key={item.id} className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-blue-400 transition-all hover:shadow-2xl hover:shadow-blue-50 group">
              <div className="bg-white p-3 rounded-2xl w-fit shadow-sm mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all text-blue-600">
                <item.icon size={28} strokeWidth={2.5} />
              </div>
              <h3 className="font-extrabold text-slate-800 text-xl mb-3">{item.title}</h3>
              <p className="text-slate-500 leading-relaxed font-medium">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
    <Footer />
  </div>
);

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/relatorios" element={<RelatorioPage />} />
        <Route path="/relatorio-obra/:id" element={<RelatorioObraPage />} />
        <Route path="/relatorio-executor/:id" element={<RelatorioExecutorPage />} />
      </Routes>
    </Router>
  );
};

export default App;
