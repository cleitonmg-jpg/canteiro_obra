

export const AuditoriaView = () => (
    <div className="space-y-8">
        <div className="flex justify-between items-center text-center">
            <div>
                <h2 className="text-3xl font-black text-slate-800">Registro de Auditoria</h2>
                <p className="text-slate-500 font-bold mt-2">Log completo de inclusão, alteração e exclusão de todos os usuários.</p>
            </div>
        </div>
        <div className="bg-white p-10 rounded-[32px] border border-slate-200">
            <p className="text-slate-500 font-medium">Tabela de registros detalhados gravando usuario_id, data_hora e tipo_operacao...</p>
        </div>
    </div>
);
