
import { HardHat, TrendingUp, BarChart3, Calculator, Plus, Construction } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, color }: any) => {
    const colorClasses: any = {
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        slate: 'bg-slate-50 text-slate-600'
    };
    return (
        <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm group hover:border-blue-300 transition-all hover:shadow-2xl hover:shadow-slate-100">
            <div className={`p-3 rounded-2xl w-fit mb-6 transition-transform group-hover:scale-110 ${colorClasses[color]}`}>
                <Icon size={24} />
            </div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <h4 className="text-3xl font-black text-slate-800 tracking-tighter">{value}</h4>
        </div>
    );
};

const TableRowHome = ({ code, name, resp, progress }: any) => (
    <tr className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
        <td className="px-10 py-6">
            <div className="flex flex-col">
                <span className="text-[10px] font-black text-blue-500 mb-1 leading-none">{code}</span>
                <span className="font-extrabold text-slate-800">{name}</span>
            </div>
        </td>
        <td className="px-10 py-6 font-bold text-slate-500 text-sm">{resp}</td>
        <td className="px-10 py-6">
            <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400">{progress}</span>
                </div>
                <div className="w-48 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full group-hover:bg-emerald-500 transition-all" style={{ width: progress }}></div>
                </div>
            </div>
        </td>
        <td className="px-10 py-6 text-right">
            <button className="p-2.5 text-slate-300 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all">
                <Plus size={18} />
            </button>
        </td>
    </tr>
);

const AuditItem = ({ user, action, target, time }: any) => (
    <div className="flex items-start gap-4">
        <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-bold shrink-0 border border-slate-100">{user.charAt(0)}</div>
        <div className="flex-1 space-y-0.5">
            <p className="text-sm font-bold text-slate-700">
                <span className="text-blue-600">{user}</span> {action}
            </p>
            <p className="text-[11px] font-medium text-slate-400">Alvo: <span className="text-slate-800 uppercase">{target}</span> • {time}</p>
        </div>
    </div>
);

export const DashboardOverview = ({ userName }: any) => (
    <div className="space-y-10">
        <section className="bg-gradient-to-br from-blue-700 to-blue-500 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-blue-100 flex items-center justify-between">
            <div className="relative z-10 space-y-3">
                <div className="flex items-center gap-3">
                    <div className="bg-white/20 w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">Status: Online</div>
                    <h2 className="text-3xl font-black tracking-tighter">Painel de Controle</h2>
                </div>
                <p className="text-blue-50 font-medium opacity-90 max-w-xl text-sm">
                    Olá {userName}, bem-vindo à gestão centralizada da <strong className="text-white">S.R Engenharia e Projetos</strong>. Acompanhe obras e custos em tempo real.
                </p>
            </div>
            <Construction size={100} className="text-white/10 transform rotate-12 absolute right-8" />
        </section>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard icon={HardHat} label="Obras em Execução" value="12" color="blue" />
            <StatCard icon={TrendingUp} label="Lucro Previsto" value="R$ 1.2M" color="emerald" />
            <StatCard icon={BarChart3} label="Aporte do Mês" value="R$ 485K" color="amber" />
            <StatCard icon={Calculator} label="Demandas Hoje" value="+24" color="slate" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                    <h3 className="text-xl font-black text-slate-800">Canteiros de Obra Ativos</h3>
                    <button className="bg-white text-slate-600 border border-slate-200 hover:border-blue-500 hover:text-blue-600 px-5 py-2.5 rounded-xl transition-all shadow-sm font-bold text-sm">Ver Mapa Global</button>
                </div>
                <table className="w-full text-left">
                    <thead className="bg-slate-50/80 text-slate-400 uppercase text-[10px] font-black tracking-[2px]">
                        <tr>
                            <th className="px-10 py-5">Identificação</th>
                            <th className="px-10 py-5">Responsável</th>
                            <th className="px-10 py-5">Progresso</th>
                            <th className="px-10 py-5 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        <TableRowHome code="OB-312" name="Residencial S.R - Torre A" resp="Ricardo S." progress="85%" />
                        <TableRowHome code="OB-315" name="Complexo Ind. Divinópolis" resp="Maria Helena" progress="42%" />
                        <TableRowHome code="OB-320" name="Canteiro Central Oeste" resp="Jorge Amado" progress="12%" />
                    </tbody>
                </table>
            </div>

            <div className="bg-white border border-slate-200 rounded-[32px] p-10 shadow-sm space-y-8">
                <h3 className="text-xl font-black text-slate-800">Auditoria Recente</h3>
                <div className="space-y-6">
                    <AuditItem user="Master" action="Lançou Material" target="OB-312" time="Há 5 min" />
                    <AuditItem user="Gerente" action="Criou Nova Obra" target="Canteiro Sul" time="Há 12 min" />
                    <AuditItem user="Operador" action="Editou Preço Custo" target="Cimento CP-II" time="Há 1h" />
                </div>
                <button className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 font-black rounded-2xl transition-all text-xs uppercase tracking-widest border border-slate-100">Log de Auditoria Completo</button>
            </div>
        </div>
    </div>
);
