import { useEffect, useState } from 'react';
import { API } from '../config';

let cachedNome: string | null = null;
let inFlight: Promise<string | null> | null = null;

const loadEmpresaNome = async () => {
  if (cachedNome) return cachedNome;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch(`${API}/api/empresa`);
      if (!res.ok) return null;
      const data = await res.json().catch(() => ({} as any));
      const n = String(data?.nome || '').trim();
      if (!n) return null;
      cachedNome = n;
      try {
        localStorage.setItem('empresa_nome', n);
      } catch {
        // noop
      }
      return n;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
};

export const useEmpresaNome = () => {
  const [nome, setNome] = useState(() => {
    try {
      const n = localStorage.getItem('empresa_nome') || '';
      if (n) cachedNome = n;
      return n;
    } catch {
      return '';
    }
  });

  useEffect(() => {
    let cancelled = false;
    loadEmpresaNome().then((n) => {
      if (cancelled) return;
      if (!n) return;
      setNome(n);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return nome;
};
