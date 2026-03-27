import { useState, useEffect } from 'react';
import { Building2, Save, Mail, Phone, MapPin, AlignLeft, Hash, CheckCircle2 } from 'lucide-react';

import { API } from '../config';

interface EmpresaViewProps {
    onSaved?: () => void;
}

export const EmpresaView = ({ onSaved }: EmpresaViewProps) => {
    const [cnpj, setCnpj] = useState('');
    const [nome, setNome] = useState('');
    const [email, setEmail] = useState('');
    const [telefone, setTelefone] = useState('');
    const [endereco, setEndereco] = useState('');
    const [observacao, setObservacao] = useState('');
    const [carregando, setCarregando] = useState(false);
    const [salvo, setSalvo] = useState(false);
    const [erro, setErro] = useState('');

    useEffect(() => {
        fetch(`${API}/api/empresa`)
            .then(r => r.json())
            .then(d => {
                if (d.id) {
                    setCnpj(d.cnpj || '');
                    setNome(d.nome || '');
                    setEmail(d.email || '');
                    setTelefone(d.telefone || '');
                    setEndereco(d.endereco || '');
                    setObservacao(d.observacao || '');
                }
            })
            .catch(() => setErro('Não foi possível carregar os dados da empresa.'));
    }, []);

    const handleSalvar = async (e: React.FormEvent) => {
        e.preventDefault();
        setCarregando(true);
        setErro('');
        setSalvo(false);
        try {
            const res = await fetch(`${API}/api/empresa`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cnpj, nome, email, telefone, endereco, observacao }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.erro || 'Erro ao salvar');
            }
            setSalvo(true);
            setTimeout(() => {
                setSalvo(false);
                if (onSaved) onSaved();
            }, 1500);
        } catch (err: any) {
            setErro(err.message || 'Erro ao salvar. Verifique a conexão.');
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-3xl font-black text-slate-800">Cadastro de Empresa</h2>
                    <p className="text-slate-500 font-bold mt-2">Gerencie os dados exclusivos da empresa mandante do sistema.</p>
                </div>
                <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl">
                    <Building2 size={32} />
                </div>
            </div>

            {erro && (
                <div className="bg-red-50 border border-red-200 text-red-700 font-bold px-6 py-4 rounded-2xl">{erro}</div>
            )}
            {salvo && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold px-6 py-4 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 size={20} /> Dados salvos com sucesso!
                </div>
            )}

            <form className="bg-white p-10 rounded-[32px] border border-slate-200 shadow-sm space-y-8" onSubmit={handleSalvar}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">CNPJ (Apenas números)</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <Hash size={20} />
                            </div>
                            <input required type="text" placeholder="Ex: 56909515000110" maxLength={14}
                                className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                value={cnpj} onChange={e => setCnpj(e.target.value.replace(/\D/g, ''))} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Razão Social</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <Building2 size={20} />
                            </div>
                            <input required type="text" placeholder="Nome Oficial da Empresa"
                                className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                value={nome} onChange={e => setNome(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">E-mail Comercial</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <Mail size={20} />
                            </div>
                            <input type="email" placeholder="contato@empresa.com"
                                className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                value={email} onChange={e => setEmail(e.target.value)} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Telefone Principal</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <Phone size={20} />
                            </div>
                            <input type="text" placeholder="(00) 0000-0000"
                                className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                value={telefone} onChange={e => setTelefone(e.target.value)} />
                        </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Endereço Completo</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <MapPin size={20} />
                            </div>
                            <input type="text" placeholder="Rua, Número, Bairro, Cidade - UF"
                                className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                value={endereco} onChange={e => setEndereco(e.target.value)} />
                        </div>
                    </div>

                    <div className="col-span-1 md:col-span-2 space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Observações / Notas Internas</label>
                        <div className="relative group">
                            <div className="absolute top-3.5 left-0 pl-4 flex items-start pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                                <AlignLeft size={20} />
                            </div>
                            <textarea rows={3} placeholder="Anotações adicionais..."
                                className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium resize-none"
                                value={observacao} onChange={e => setObservacao(e.target.value)} />
                        </div>
                    </div>
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end">
                    <button type="submit" disabled={carregando}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-10 py-4 rounded-xl font-black text-lg shadow-lg shadow-blue-100 flex items-center gap-2 transform active:scale-95 transition-all">
                        <Save size={20} />
                        {carregando ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                    </button>
                </div>
            </form>
        </div>
    );
};
