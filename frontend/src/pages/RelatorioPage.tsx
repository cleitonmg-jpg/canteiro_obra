import { Construction, X } from 'lucide-react';
import { RelatoriosView } from '../views/RelatoriosView';
import { useEmpresaNome } from '../hooks/useEmpresaNome';

const RelatorioPage: React.FC = () => {
    const empresaNome = useEmpresaNome();

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-100">
                        <Construction size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black text-slate-800 tracking-tighter leading-none">CANTEIRO DE OBRAS</h1>
                        {empresaNome && <p className="text-xs font-bold text-slate-400 leading-none mt-0.5">{empresaNome}</p>}
                    </div>
                </div>
                <button
                    onClick={() => window.close()}
                    title="Fechar esta guia"
                    className="flex items-center gap-2 text-slate-500 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl font-black text-sm transition-all border border-slate-200"
                >
                    <X size={16} /> FECHAR
                </button>
            </header>

            <main className="flex-1 p-6 md:p-10 max-w-[1400px] mx-auto w-full">
                <RelatoriosView />
            </main>

            <footer className="py-6 text-center border-t border-slate-100 bg-white">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-[2px]">
                    V9 INFORMÁTICA LTDA — (37) 4141-0341 — Divinópolis MG
                </p>
            </footer>
        </div>
    );
};

import React from 'react';
export default RelatorioPage;
