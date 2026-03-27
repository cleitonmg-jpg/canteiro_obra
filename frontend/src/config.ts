// Em desenvolvimento: defina VITE_API_URL=http://localhost:3000 no .env.local
// Em produção: deixe vazio — frontend e backend rodam na mesma origem
export const API = import.meta.env.VITE_API_URL || '';
