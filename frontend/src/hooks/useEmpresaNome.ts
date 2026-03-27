import { useEffect, useState } from 'react';
import { API } from '../config';

export const useEmpresaNome = () => {
  const [nome, setNome] = useState(() => {
    try {
      return localStorage.getItem('empresa_nome') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch(`${API}/api/empresa`);
        if (!res.ok) return;
        const data = await res.json().catch(() => ({} as any));
        const n = String(data?.nome || '').trim();
        if (!n) return;
        if (cancelled) return;
        setNome(n);
        try {
          localStorage.setItem('empresa_nome', n);
        } catch {
          // noop
        }
      } catch {
        // noop
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return nome;
};

