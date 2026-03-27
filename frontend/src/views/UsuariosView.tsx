import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, X, Shield, CheckCircle } from 'lucide-react';

import { API } from '../config';

interface Usuario {
    id: number;
    nome: string;
    login: string;
    email?: string;
    nivel_permissao: string;
    ativo: boolean;
    data_cadastro?: string;
}

const nivelLabel: Record<string, { label: string; cls: string }> = {
    MASTER: { label: 'Master', cls: 'bg-purple-100 text-purple-700' },
    ADMIN: { label: 'Administrador', cls: 'bg-blue-100 text-blue-700' },
    OPERADOR: { label: 'Operador', cls: 'bg-slate-100 text-slate-600' },
};

export const UsuariosView = () => {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [viewForm, setViewForm] = useState(false);
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState('');

    const [editId, setEditId] = useState<number | null>(null);
    const [nome, setNome] = useState('');
    const [loginUsuario, setLoginUsuario] = useState('');
    const [email, setEmail] = useState('');
    const [senha, setSenha] = useState('');
    const [nivel, setNivel] = useState('OPERADOR');
    const [ativo, setAtivo] = useState(true);

    const carregar = async () => {
        try {
            const res = await fetch(`${API}/api/usuarios`);
            setUsuarios(await res.json());
        } catch {
            setErro('Não foi possível conectar ao servidor.');
        }
    };

    useEffect(() => { carregar(); }, []);

    const resetForm = () => {
        setEditId(null); setNome(''); setLoginUsuario(''); setEmail(''); setSenha(''); setNivel('OPERADOR'); setAtivo(true);
        setViewForm(false); setErro('');
    };

    const handleSalvar = async (e: React.FormEvent) => {
        e.preventDefault();
        setCarregando(true);
        setErro('');
        try {
            if (!editId && !senha.trim()) { setErro('Senha obrigatória para novo usuário.'); setCarregando(false); return; }
            if (!loginUsuario.trim()) { setErro('Usuário (login) obrigatório.'); setCarregando(false); return; }
            const body: any = { nome, login: loginUsuario.trim().toLowerCase(), email, nivel_permissao: nivel, ativo };
            if (senha.trim()) body.senha = senha;

            const res = editId
                ? await fetch(`${API}/api/usuarios/${editId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
                : await fetch(`${API}/api/usuarios`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, senha }) });

            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.erro || 'Erro ao salvar');
            }
            await carregar();
            resetForm();
        } catch (err: any) {
            setErro(err.message || 'Erro ao salvar.');
        } finally {
            setCarregando(false);
        }
    };

    const handleEditar = (u: Usuario) => {
        setEditId(u.id); setNome(u.nome); setLoginUsuario(u.login); setEmail(u.email || ''); setSenha('');
        setNivel(u.nivel_permissao); setAtivo(u.ativo);
        setViewForm(true);
    };

    const handleInativar = async (id: number, nomeU: string) => {
        if (!window.confirm(`Inativar usuário "${nomeU}"?`)) return;
        try {
            await fetch(`${API}/api/usuarios/${id}`, { method: 'DELETE' });
            await carregar();
        } catch {
            setErro('Erro ao inativar usuário.');
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
                <div>
                    <h2 className="text-3xl font-black text-slate-800">Usuários do Sistema</h2>
                    <p className="text-slate-500 font-bold mt-2">Controle de acesso e permissões.</p>
                </div>
                {!viewForm && (
                    <button onClick={() => setViewForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-blue-100 transition-all">
                        <Plus size={20} /> NOVO USUÁRIO
                    </button>
                )}
            </div>

            {erro && <div className="bg-red-50 border border-red-200 text-red-700 font-bold px-6 py-4 rounded-2xl">{erro}</div>}

            {viewForm && (
                <form onSubmit={handleSalvar} className="bg-white p-10 rounded-[32px] border border-slate-200 shadow-sm space-y-8">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                            <Shield className="text-blue-500" />
                            {editId ? 'Editando Usuário' : 'Novo Usuário'}
                        </h3>
                        <button type="button" onClick={resetForm} className="text-slate-400 hover:text-red-500 p-2 bg-slate-50 rounded-xl"><X size={20} /></button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Nome Completo</label>
                            <input required type="text" placeholder="Nome do usuário" value={nome} onChange={e => setNome(e.target.value)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Usuário <span className="text-slate-400 font-medium text-xs">(usado no login)</span></label>
                            <input required type="text" placeholder="ex: joao.silva" value={loginUsuario} onChange={e => setLoginUsuario(e.target.value.replace(/\s/g, ''))} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">E-mail <span className="text-slate-400 font-medium">(opcional)</span></label>
                            <input type="text" placeholder="usuario@email.com" value={email} onChange={e => setEmail(e.target.value)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">{editId ? 'Nova Senha (opcional)' : 'Senha'}</label>
                            <input type="password" placeholder="••••••••" value={senha} onChange={e => setSenha(e.target.value)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Nível de Permissão</label>
                            <select value={nivel} onChange={e => setNivel(e.target.value)} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold">
                                <option value="OPERADOR">Operador</option>
                                <option value="ADMIN">Administrador</option>
                                <option value="MASTER">Master</option>
                            </select>
                        </div>
                        {editId && (
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 ml-1">Status</label>
                                <select value={String(ativo)} onChange={e => setAtivo(e.target.value === 'true')} className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold">
                                    <option value="true">Ativo</option>
                                    <option value="false">Inativo</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button type="submit" disabled={carregando} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-10 py-4 rounded-xl font-black text-lg shadow-lg flex items-center gap-2 active:scale-95 transition-all">
                            SALVAR USUÁRIO
                        </button>
                    </div>
                </form>
            )}

            <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                        <tr>
                            <th className="px-8 py-5">Nome</th>
                            <th className="px-8 py-5">Usuário</th>
                            <th className="px-8 py-5">E-mail</th>
                            <th className="px-8 py-5">Nível</th>
                            <th className="px-8 py-5">Status</th>
                            <th className="px-8 py-5 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {usuarios.length === 0 ? (
                            <tr><td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-bold">Nenhum usuário cadastrado.</td></tr>
                        ) : usuarios.map(u => (
                            <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center font-black text-sm">
                                            {u.nome.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-slate-800">{u.nome}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="font-black text-slate-600 text-sm bg-slate-100 px-2 py-1 rounded-lg">{u.login}</span>
                                </td>
                                <td className="px-8 py-5 text-slate-500 font-medium">{u.email || <span className="text-slate-300">—</span>}</td>
                                <td className="px-8 py-5">
                                    <span className={`px-3 py-1 rounded-full text-xs font-black ${(nivelLabel[u.nivel_permissao] || nivelLabel.OPERADOR).cls}`}>
                                        {(nivelLabel[u.nivel_permissao] || nivelLabel.OPERADOR).label}
                                    </span>
                                </td>
                                <td className="px-8 py-5">
                                    {u.ativo
                                        ? <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs"><CheckCircle size={14} /> Ativo</span>
                                        : <span className="flex items-center gap-1.5 text-slate-400 font-bold text-xs"><X size={14} /> Inativo</span>
                                    }
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEditar(u)} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 size={18} /></button>
                                        {u.ativo && <button onClick={() => handleInativar(u.id, u.nome)} className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18} /></button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center gap-3 text-slate-400 px-2">
                <Users size={16} />
                <span className="text-sm font-bold">{usuarios.filter(u => u.ativo).length} usuário(s) ativo(s)</span>
            </div>
        </div>
    );
};
