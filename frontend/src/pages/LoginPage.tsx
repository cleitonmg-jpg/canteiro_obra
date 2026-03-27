import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, Construction } from 'lucide-react';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Regra Global 3.7: Usuário Master
        if (login.toLowerCase() === 'master' && password === 'Belvedere640@') {
            
            // Simular login bem sucedido
            localStorage.setItem('user_role', 'MASTER');
            localStorage.setItem('user_name', 'Master Admin');
            navigate('/dashboard');
        } else {
            setError('Credenciais inválidas para esta empresa.');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 antialiased">
            <div className="max-w-md w-full">
                {/* Branding do Sistema */}
                <div className="text-center mb-8 space-y-2">
                    <div className="inline-flex items-center justify-center p-4 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-100 mb-4 transform hover:scale-105 transition-transform">
                        <Construction size={48} strokeWidth={2.5} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">CANTEIRO DE OBRAS</h1>
                    <p className="text-slate-500 font-medium">S.R Engenharia e Projetos Ltda</p>
                </div>

                {/* Card de Login */}
                <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/60 border border-white">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold flex items-center gap-2 rounded-r-lg">
                            <span>❌</span> {error}
                        </div>
                    )}
                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Campo Usuário */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Usuário</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <User size={20} />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Digite seu usuário"
                                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                    value={login}
                                    onChange={(e) => setLogin(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Campo Senha */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-sm font-bold text-slate-700">Senha</label>
                                <a href="#" className="text-xs font-bold text-blue-600 hover:text-blue-700">Esqueci a senha</a>
                            </div>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                    <Lock size={20} />
                                </div>
                                <input 
                                    type="password" 
                                    placeholder="••••••••"
                                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Botão Entrar */}
                        <button 
                            type="submit" 
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transform active:scale-95 transition-all group"
                        >
                            ENTRAR NO SISTEMA
                            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </form>
                </div>

                {/* Rodapé V9 Informática */}
                <div className="mt-12 text-center space-y-4">
                    <div className="h-px w-16 bg-slate-200 mx-auto"></div>
                    <div className="space-y-1">
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Desenvolvido por</p>
                        <h4 className="text-slate-800 font-black text-lg">V9 INFORMÁTICA LTDA</h4>
                        <p className="text-blue-600 font-bold text-sm">(37) 4141-0341 – Divinópolis MG</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
