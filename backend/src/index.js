const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { onlyDigits, parseDanfePdfBuffer, parseNfeXml, round } = require('./nfeImport');
require('dotenv').config();

const app = express();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME}`;
}

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;
const uploadRoot = path.join(__dirname, '../uploads/nf');

app.use(cors());
app.use(express.json({ limit: '25mb' }));

// ─── Auditoria ────────────────────────────────────────────────────────────────
app.use(async (req, _res, next) => {
  const operacao = req.method === 'POST' ? 'INCLUSAO'
    : req.method === 'PUT' ? 'ALTERACAO'
    : req.method === 'DELETE' ? 'EXCLUSAO' : 'CONSULTA';
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    console.log(`[Auditoria] ${operacao} ${req.url}`);
  }
  next();
});

// ─── Helpers sequenciais ──────────────────────────────────────────────────────
const gerarCodigoGrupo = async () => {
  const grupos = await prisma.tb_grupo.findMany({ select: { codigo: true } });
  const nums = grupos.map(g => g.codigo).filter(c => c?.startsWith('GR-'))
    .map(c => parseInt(c.replace('GR-', ''), 10)).filter(n => !isNaN(n));
  return `GR-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0')}`;
};

const gerarCodigoProduto = async (tipo) => {
  const prefix = tipo === 'SERVICO' ? 'SV-' : 'PR-';
  const items = await prisma.tb_produto_servico.findMany({ select: { codigo_interno: true }, where: { tipo } });
  const nums = items.map(p => p.codigo_interno).filter(c => c?.startsWith(prefix))
    .map(c => parseInt(c.replace(prefix, ''), 10)).filter(n => !isNaN(n));
  return `${prefix}${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, '0')}`;
};

const garantirCompatibilidadeBanco = async () => {
  // Ajusta bases antigas para o schema atual sem depender de recriacao manual.
  await prisma.$executeRawUnsafe(`
    ALTER TABLE IF EXISTS tb_usuario
    ADD COLUMN IF NOT EXISTS login VARCHAR(50);
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE IF EXISTS tb_usuario
    ALTER COLUMN email DROP NOT NULL;
  `);

  await prisma.$executeRawUnsafe(`
    WITH prepared AS (
      SELECT
        id,
        CASE
          WHEN email IS NOT NULL AND POSITION('@' IN email) > 1 THEN LOWER(SPLIT_PART(email, '@', 1))
          ELSE 'usuario'
        END AS base_login
      FROM tb_usuario
      WHERE login IS NULL OR BTRIM(login) = ''
    ),
    ranked AS (
      SELECT
        id,
        CASE
          WHEN ROW_NUMBER() OVER (PARTITION BY base_login ORDER BY id) = 1 THEN base_login
          ELSE base_login || '_' || id::text
        END AS login_final
      FROM prepared
    )
    UPDATE tb_usuario AS usuario
    SET login = ranked.login_final
    FROM ranked
    WHERE usuario.id = ranked.id;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'tb_usuario_login_key'
      ) THEN
        CREATE UNIQUE INDEX tb_usuario_login_key ON tb_usuario(login);
      END IF;
    END
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE IF EXISTS tb_usuario
    ALTER COLUMN login SET NOT NULL;
  `);

  // ── MIGRACAO CANTEIRO ── adiciona tb_canteiro e vincula tb_obra
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS tb_canteiro (
      id            SERIAL PRIMARY KEY,
      nome          VARCHAR(200) NOT NULL,
      endereco      TEXT,
      responsavel   VARCHAR(100),
      descricao     TEXT,
      ativo         BOOLEAN      DEFAULT true,
      data_cadastro TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE tb_obra
    ADD COLUMN IF NOT EXISTS id_canteiro INTEGER REFERENCES tb_canteiro(id) ON DELETE SET NULL;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_tb_obra_id_canteiro ON tb_obra(id_canteiro);
  `);
};


garantirCompatibilidadeBanco().catch((err) => {
  console.error('Erro ao inicializar o banco de dados:', err);
  process.exit(1);
});

let garantiaImportacaoFiscalPromise = null;

const toDateOrNull = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toNumberValue = (value, scale = 2) => round(Number(value || 0), scale);

const sanitizeFileName = (value) => String(value || 'arquivo')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9._-]+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const garantirEstruturaImportacaoFiscal = async () => {
  if (garantiaImportacaoFiscalPromise) return garantiaImportacaoFiscalPromise;

  garantiaImportacaoFiscalPromise = (async () => {
    fs.mkdirSync(uploadRoot, { recursive: true });

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS tb_importacao_nfe (
        id SERIAL PRIMARY KEY,
        tipo_arquivo VARCHAR(10) NOT NULL,
        nome_arquivo_original VARCHAR(255) NOT NULL,
        nome_arquivo_salvo VARCHAR(255) NOT NULL,
        caminho_arquivo VARCHAR(500) NOT NULL,
        url_arquivo VARCHAR(500) NOT NULL,
        chave_acesso VARCHAR(60),
        numero_nf VARCHAR(30),
        serie VARCHAR(10),
        data_emissao TIMESTAMP NULL,
        cnpj_emitente VARCHAR(14),
        nome_emitente VARCHAR(200),
        valor_total_itens DECIMAL(15,2) DEFAULT 0,
        valor_total_nota DECIMAL(15,2) DEFAULT 0,
        status_processamento VARCHAR(30) DEFAULT 'IMPORTADO',
        observacao TEXT,
        metadata_json TEXT,
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS tb_importacao_nfe_item (
        id SERIAL PRIMARY KEY,
        id_importacao_nfe INTEGER NOT NULL REFERENCES tb_importacao_nfe(id) ON DELETE CASCADE,
        numero_item VARCHAR(10),
        codigo_produto_fornecedor VARCHAR(60),
        descricao VARCHAR(255),
        unidade VARCHAR(20),
        quantidade DECIMAL(15,4) DEFAULT 0,
        valor_unitario_original DECIMAL(15,6) DEFAULT 0,
        valor_unitario_final DECIMAL(15,6) DEFAULT 0,
        valor_total DECIMAL(15,2) DEFAULT 0,
        valor_rateio DECIMAL(15,2) DEFAULT 0,
        id_produto_servico_vinculado INTEGER REFERENCES tb_produto_servico(id),
        sugestao_historica BOOLEAN DEFAULT FALSE,
        observacao TEXT,
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS tb_vinculo_produto_fornecedor (
        id SERIAL PRIMARY KEY,
        cnpj_fornecedor VARCHAR(14) NOT NULL,
        codigo_produto_fornecedor VARCHAR(60) NOT NULL,
        descricao_referencia VARCHAR(255),
        id_produto_servico INTEGER NOT NULL REFERENCES tb_produto_servico(id),
        data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_ultima_utilizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tb_vinculo_produto_fornecedor_unique
      ON tb_vinculo_produto_fornecedor(cnpj_fornecedor, codigo_produto_fornecedor);
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_tb_importacao_nfe_data_cadastro
      ON tb_importacao_nfe(data_cadastro DESC);
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_tb_importacao_nfe_item_importacao
      ON tb_importacao_nfe_item(id_importacao_nfe);
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS idx_tb_importacao_nfe_item_produto
      ON tb_importacao_nfe_item(id_produto_servico_vinculado);
    `);
  })().catch((err) => {
    garantiaImportacaoFiscalPromise = null;
    throw err;
  });

  return garantiaImportacaoFiscalPromise;
};

const salvarArquivoImportado = ({ fileName, contentBase64 }) => {
  const extension = path.extname(fileName || '').toLowerCase() || '.bin';
  const baseName = sanitizeFileName(path.basename(fileName || 'arquivo', extension)) || 'arquivo';
  const nomeArquivoSalvo = `${Date.now()}-${baseName}${extension}`;
  const caminhoArquivo = path.join(uploadRoot, nomeArquivoSalvo);
  fs.writeFileSync(caminhoArquivo, Buffer.from(contentBase64, 'base64'));

  return {
    nomeArquivoSalvo,
    caminhoArquivo,
    urlArquivo: `/uploads/nf/${nomeArquivoSalvo}`,
  };
};

const normalizarProdutoRelacionado = (row) => {
  if (!row?.produto_id) return null;

  return {
    id: Number(row.produto_id),
    codigo_interno: row.produto_codigo_interno,
    descricao: row.produto_descricao,
    tipo: row.produto_tipo,
    grupo: row.grupo_id ? {
      id: Number(row.grupo_id),
      codigo: row.grupo_codigo,
      descricao: row.grupo_descricao,
    } : null,
  };
};

const buscarVinculosFornecedor = async (cnpjFornecedor) => {
  if (!cnpjFornecedor) return new Map();

  const rows = await prisma.$queryRaw`
    SELECT
      v.cnpj_fornecedor,
      v.codigo_produto_fornecedor,
      v.id_produto_servico AS produto_id,
      p.codigo_interno AS produto_codigo_interno,
      p.descricao AS produto_descricao,
      p.tipo AS produto_tipo,
      g.id AS grupo_id,
      g.codigo AS grupo_codigo,
      g.descricao AS grupo_descricao
    FROM tb_vinculo_produto_fornecedor v
    JOIN tb_produto_servico p ON p.id = v.id_produto_servico
    LEFT JOIN tb_grupo g ON g.id = p.id_grupo
    WHERE v.cnpj_fornecedor = ${cnpjFornecedor}
  `;

  return new Map(rows.map((row) => [
    String(row.codigo_produto_fornecedor || '').trim(),
    normalizarProdutoRelacionado(row),
  ]));
};

const normalizarDocumentoImportado = (row) => ({
  id: Number(row.id),
  tipo_arquivo: row.tipo_arquivo,
  nome_arquivo_original: row.nome_arquivo_original,
  nome_arquivo_salvo: row.nome_arquivo_salvo,
  url_arquivo: row.url_arquivo,
  chave_acesso: row.chave_acesso,
  numero_nf: row.numero_nf,
  serie: row.serie,
  data_emissao: row.data_emissao,
  cnpj_emitente: row.cnpj_emitente,
  nome_emitente: row.nome_emitente,
  valor_total_itens: toNumberValue(row.valor_total_itens),
  valor_total_nota: toNumberValue(row.valor_total_nota),
  status_processamento: row.status_processamento,
  observacao: row.observacao,
  metadata_json: row.metadata_json ? JSON.parse(row.metadata_json) : null,
  data_cadastro: row.data_cadastro,
  qtd_itens: row.qtd_itens !== undefined ? Number(row.qtd_itens) : undefined,
});

const carregarImportacaoNfe = async (id) => {
  const documentos = await prisma.$queryRaw`
    SELECT *
    FROM tb_importacao_nfe
    WHERE id = ${id}
  `;

  if (!documentos.length) return null;

  const itens = await prisma.$queryRaw`
    SELECT
      i.*,
      p.id AS produto_id,
      p.codigo_interno AS produto_codigo_interno,
      p.descricao AS produto_descricao,
      p.tipo AS produto_tipo,
      g.id AS grupo_id,
      g.codigo AS grupo_codigo,
      g.descricao AS grupo_descricao
    FROM tb_importacao_nfe_item i
    LEFT JOIN tb_produto_servico p ON p.id = i.id_produto_servico_vinculado
    LEFT JOIN tb_grupo g ON g.id = p.id_grupo
    WHERE i.id_importacao_nfe = ${id}
    ORDER BY CAST(COALESCE(NULLIF(i.numero_item, ''), '0') AS INTEGER), i.id
  `;

  return {
    ...normalizarDocumentoImportado(documentos[0]),
    itens: itens.map((row) => ({
      id: Number(row.id),
      numero_item: row.numero_item,
      codigo_produto_fornecedor: row.codigo_produto_fornecedor,
      descricao: row.descricao,
      unidade: row.unidade,
      quantidade: toNumberValue(row.quantidade, 4),
      valor_unitario_original: toNumberValue(row.valor_unitario_original, 6),
      valor_unitario_final: toNumberValue(row.valor_unitario_final, 6),
      valor_total: toNumberValue(row.valor_total),
      valor_rateio: toNumberValue(row.valor_rateio),
      sugestao_historica: Boolean(row.sugestao_historica),
      observacao: row.observacao,
      produto_vinculado: normalizarProdutoRelacionado(row),
    })),
  };
};

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ message: 'Backend Canteiro de Obras Ativo', developer: 'V9 INFORMÁTICA LTDA - (37) 4141-0341', status: 'ONLINE' }));

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/login', async (req, res) => {
  try {
    const { login, senha } = req.body;
    if (!login?.trim() || !senha?.trim()) return res.status(400).json({ erro: 'Usuário e senha obrigatórios' });
    const usuario = await prisma.tb_usuario.findFirst({
      where: { login: login.trim().toLowerCase(), ativo: true },
      select: { id: true, nome: true, login: true, nivel_permissao: true, senha: true },
    });
    if (!usuario || usuario.senha !== senha.trim()) return res.status(401).json({ erro: 'Usuário ou senha inválidos' });
    const { senha: _, ...dados } = usuario;
    res.json(dados);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMPRESA (registro único)
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/empresa', async (_req, res) => {
  try {
    const empresa = await prisma.tb_empresa.findFirst();
    res.json(empresa || {});
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.put('/api/empresa', async (req, res) => {
  try {
    const { cnpj, nome, email, telefone, endereco, observacao } = req.body;
    const existing = await prisma.tb_empresa.findFirst();
    let empresa;
    if (existing) {
      empresa = await prisma.tb_empresa.update({ where: { id: existing.id }, data: { cnpj, nome, email, telefone, endereco, observacao } });
    } else {
      empresa = await prisma.tb_empresa.create({ data: { cnpj, nome, email, telefone, endereco, observacao } });
    }
    res.json(empresa);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GRUPOS
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/grupos', async (_req, res) => {
  try { res.json(await prisma.tb_grupo.findMany({ orderBy: { codigo: 'asc' } })); }
  catch (err) { res.status(500).json({ erro: err.message }); }
});

app.post('/api/grupos', async (req, res) => {
  try {
    const { descricao } = req.body;
    if (!descricao?.trim()) return res.status(400).json({ erro: 'Descrição obrigatória' });
    const codigo = await gerarCodigoGrupo();
    res.status(201).json(await prisma.tb_grupo.create({ data: { codigo, descricao: descricao.trim() } }));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.put('/api/grupos/:id', async (req, res) => {
  try {
    const { descricao } = req.body;
    if (!descricao?.trim()) return res.status(400).json({ erro: 'Descrição obrigatória' });
    res.json(await prisma.tb_grupo.update({ where: { id: parseInt(req.params.id) }, data: { descricao: descricao.trim() } }));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.delete('/api/grupos/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const produtos = await prisma.tb_produto_servico.findMany({
      where: { id_grupo: id },
      select: { id: true },
    });

    if (produtos.length) {
      const usados = await prisma.tb_movimentacao_obra.count({
        where: { id_produto_servico: { in: produtos.map(p => p.id) } },
      });
      if (usados > 0) {
        return res.status(400).json({ erro: 'Não é possível excluir este grupo porque existem lançamentos vinculados a itens deste grupo.' });
      }
      return res.status(400).json({ erro: 'Não é possível excluir este grupo porque existem produtos/serviços cadastrados nele. Remova ou mova os itens para outro grupo antes.' });
    }

    await prisma.tb_grupo.delete({ where: { id } });
    res.json({ mensagem: 'Grupo excluído' });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUTOS E SERVIÇOS
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/produtos', async (_req, res) => {
  try {
    res.json(await prisma.tb_produto_servico.findMany({
      where: { ativo: true }, orderBy: { codigo_interno: 'asc' },
      include: { tb_grupo: { select: { id: true, codigo: true, descricao: true } } },
    }));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.post('/api/produtos', async (req, res) => {
  try {
    const { tipo, descricao, id_grupo, unidade_medida, preco_custo } = req.body;
    if (!descricao?.trim()) return res.status(400).json({ erro: 'Descrição obrigatória' });
    const tipoValido = tipo === 'SERVICO' ? 'SERVICO' : 'PRODUTO';
    const codigo_interno = await gerarCodigoProduto(tipoValido);
    res.status(201).json(await prisma.tb_produto_servico.create({
      data: { codigo_interno, tipo: tipoValido, descricao: descricao.trim(), unidade_medida: unidade_medida || null, preco_custo: parseFloat(preco_custo) || 0, id_grupo: id_grupo ? parseInt(id_grupo) : null, ativo: true },
      include: { tb_grupo: { select: { id: true, codigo: true, descricao: true } } },
    }));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.put('/api/produtos/:id', async (req, res) => {
  try {
    const { tipo, descricao, id_grupo, unidade_medida, preco_custo } = req.body;
    if (!descricao?.trim()) return res.status(400).json({ erro: 'Descrição obrigatória' });
    res.json(await prisma.tb_produto_servico.update({
      where: { id: parseInt(req.params.id) },
      data: { tipo: tipo === 'SERVICO' ? 'SERVICO' : 'PRODUTO', descricao: descricao.trim(), unidade_medida: unidade_medida || null, preco_custo: parseFloat(preco_custo) || 0, id_grupo: id_grupo ? parseInt(id_grupo) : null },
      include: { tb_grupo: { select: { id: true, codigo: true, descricao: true } } },
    }));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.delete('/api/produtos/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const usados = await prisma.tb_movimentacao_obra.count({ where: { id_produto_servico: id } });
    if (usados > 0) {
      return res.status(400).json({ erro: 'Não é possível excluir/inativar este item porque existem lançamentos vinculados a ele.' });
    }
    await prisma.tb_produto_servico.update({ where: { id }, data: { ativo: false } });
    res.json({ mensagem: 'Item inativado' });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CANTEIROS (entidade pai que agrupa obras)
// ═══════════════════════════════════════════════════════════════════════════════

/** Retorna todos os canteiros com totais consolidados das obras filhas */
app.get('/api/canteiros', async (_req, res) => {
  try {
    const canteiros = await prisma.tb_canteiro.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      include: {
        tb_obra: {
          include: { tb_movimentacao_obra: { select: { total_calculado: true } } },
        },
      },
    });

    // Monta resumo hierárquico: canteiro > obras > totais
    const result = canteiros.map(c => {
      const obras = c.tb_obra.map(o => {
        const gastos = o.tb_movimentacao_obra.reduce((acc, m) => acc + parseFloat(String(m.total_calculado || 0)), 0);
        const { tb_movimentacao_obra, ...obra } = o;
        return { ...obra, gastos };
      });

      const totalOrcamento = obras.reduce((acc, o) => acc + parseFloat(String(o.valor_contratado || 0)), 0);
      const totalGastos    = obras.reduce((acc, o) => acc + (o.gastos || 0), 0);
      const lucro          = totalOrcamento - totalGastos;

      const { tb_obra, ...canteiro } = c;
      return { ...canteiro, obras, totalOrcamento, totalGastos, lucro };
    });

    res.json(result);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

/** Lista simples para selects/combos */
app.get('/api/canteiros/lista', async (_req, res) => {
  try {
    res.json(await prisma.tb_canteiro.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, responsavel: true },
      orderBy: { nome: 'asc' },
    }));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.get('/api/canteiros/:id', async (req, res) => {
  try {
    const c = await prisma.tb_canteiro.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        tb_obra: {
          include: { tb_movimentacao_obra: { select: { total_calculado: true } } },
        },
      },
    });
    if (!c) return res.status(404).json({ erro: 'Canteiro não encontrado' });

    const obras = c.tb_obra.map(o => {
      const gastos = o.tb_movimentacao_obra.reduce((acc, m) => acc + parseFloat(String(m.total_calculado || 0)), 0);
      const { tb_movimentacao_obra, ...obra } = o;
      return { ...obra, gastos };
    });
    const totalOrcamento = obras.reduce((acc, o) => acc + parseFloat(String(o.valor_contratado || 0)), 0);
    const totalGastos    = obras.reduce((acc, o) => acc + (o.gastos || 0), 0);
    const { tb_obra, ...canteiro } = c;
    res.json({ ...canteiro, obras, totalOrcamento, totalGastos, lucro: totalOrcamento - totalGastos });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.post('/api/canteiros', async (req, res) => {
  try {
    const { nome, endereco, responsavel, descricao } = req.body;
    if (!nome?.trim()) return res.status(400).json({ erro: 'Nome do canteiro obrigatório' });
    res.status(201).json(await prisma.tb_canteiro.create({
      data: { nome: nome.trim(), endereco: endereco || null, responsavel: responsavel || null, descricao: descricao || null, ativo: true },
    }));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.put('/api/canteiros/:id', async (req, res) => {
  try {
    const { nome, endereco, responsavel, descricao, ativo } = req.body;
    if (!nome?.trim()) return res.status(400).json({ erro: 'Nome do canteiro obrigatório' });
    res.json(await prisma.tb_canteiro.update({
      where: { id: parseInt(req.params.id) },
      data: { nome: nome.trim(), endereco: endereco || null, responsavel: responsavel || null, descricao: descricao || null, ativo: ativo !== false },
    }));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.delete('/api/canteiros/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    // Verifica se há obras vinculadas antes de excluir
    const qtdObras = await prisma.tb_obra.count({ where: { id_canteiro: id } });
    if (qtdObras > 0) {
      return res.status(400).json({ erro: `Não é possível excluir este canteiro porque há ${qtdObras} obra(s) vinculada(s). Mova ou exclua as obras primeiro.` });
    }
    await prisma.tb_canteiro.update({ where: { id }, data: { ativo: false } });
    res.json({ mensagem: 'Canteiro inativado com sucesso.' });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// OBRAS (com gastos calculados)
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/obras', async (_req, res) => {
  try {
    const obras = await prisma.tb_obra.findMany({
      orderBy: { data_cadastro: 'desc' },
      include: {
        tb_movimentacao_obra: { select: { total_calculado: true } },
        tb_canteiro: { select: { id: true, nome: true } }, // inclui canteiro no retorno
      },
    });
    const result = obras.map(o => {
      const gastos = o.tb_movimentacao_obra.reduce((acc, m) => acc + parseFloat(m.total_calculado || 0), 0);
      const { tb_movimentacao_obra, ...obra } = o;
      return { ...obra, gastos };
    });
    res.json(result);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});


// Gastos agregados por grupo (para gráfico pizza no frontend)
app.get('/api/obras/gastos-por-grupo', async (req, res) => {
  try {
    const { ativas } = req.query;
    const whereObra = ativas === '1' ? { NOT: { status: 'FINALIZADA' } } : {};

    const obras = await prisma.tb_obra.findMany({ where: whereObra, select: { id: true } });
    const ids = obras.map(o => o.id);
    if (!ids.length) return res.json([]);

    const movs = await prisma.tb_movimentacao_obra.findMany({
      where: { id_obra: { in: ids } },
      select: {
        id_obra: true,
        total_calculado: true,
        tb_produto_servico: {
          select: {
            tb_grupo: { select: { id: true, codigo: true, descricao: true } },
          },
        },
      },
    });

    const byObra = new Map();
    for (const m of movs) {
      const obraId = m.id_obra;
      if (!obraId) continue;
      const total = parseFloat(String(m.total_calculado || 0)) || 0;
      const g = m.tb_produto_servico?.tb_grupo;
      const gid = g?.id ? Number(g.id) : 0;
      const gkey = String(gid);
      const info = g
        ? { id: gid, codigo: g.codigo || '', descricao: g.descricao || '' }
        : { id: 0, codigo: 'SEM', descricao: 'Sem Grupo' };

      if (!byObra.has(obraId)) byObra.set(obraId, new Map());
      const byGrupo = byObra.get(obraId);
      if (!byGrupo.has(gkey)) byGrupo.set(gkey, { ...info, total: 0 });
      byGrupo.get(gkey).total += total;
    }

    const result = Array.from(byObra.entries()).map(([id_obra, gruposMap]) => ({
      id_obra,
      grupos: Array.from(gruposMap.values()).sort((a, b) => b.total - a.total),
    }));

    res.json(result);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.post('/api/obras', async (req, res) => {
  try {
    const { nome, endereco, responsavel, status, valor_contratado, data_inicio, data_termino, numero_licitacao, orgao_responsavel, tipo_orgao, id_canteiro } = req.body;
    if (!nome?.trim()) return res.status(400).json({ erro: 'Nome obrigatório' });
    res.status(201).json(await prisma.tb_obra.create({
      data: {
        nome: nome.trim(), endereco: endereco || null, responsavel: responsavel || null,
        status: status || 'ATIVA', valor_contratado: parseFloat(valor_contratado) || 0,
        data_inicio: data_inicio ? new Date(data_inicio) : null,
        data_termino: data_termino ? new Date(data_termino) : null,
        numero_licitacao: numero_licitacao || null, orgao_responsavel: orgao_responsavel || null, tipo_orgao: tipo_orgao || null,
        // Vincula ao canteiro se informado
        id_canteiro: id_canteiro ? parseInt(id_canteiro) : null,
      },
      include: { tb_canteiro: { select: { id: true, nome: true } } },
    }));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});


app.put('/api/obras/:id', async (req, res) => {
  try {
    const { nome, endereco, responsavel, status, valor_contratado, data_inicio, data_termino, id_canteiro } = req.body;
    if (!nome?.trim()) return res.status(400).json({ erro: 'Nome obrigatório' });
    res.json(await prisma.tb_obra.update({
      where: { id: parseInt(req.params.id) },
      data: {
        nome: nome.trim(), endereco: endereco || null, responsavel: responsavel || null,
        status: status || 'ATIVA', valor_contratado: parseFloat(valor_contratado) || 0,
        data_inicio: data_inicio ? new Date(data_inicio) : null,
        data_termino: data_termino ? new Date(data_termino) : null,
        // Permite alterar o canteiro vinculado (inclusive desvinculando com null)
        id_canteiro: id_canteiro ? parseInt(id_canteiro) : null,
      },
      include: { tb_canteiro: { select: { id: true, nome: true } } },
    }));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});


app.get('/api/obras/:id', async (req, res) => {
  try {
    const obra = await prisma.tb_obra.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!obra) return res.status(404).json({ erro: 'Obra não encontrada' });
    res.json(obra);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.delete('/api/obras/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const usados = await prisma.tb_movimentacao_obra.count({ where: { id_obra: id } });
    if (usados > 0) {
      return res.status(400).json({ erro: 'Não é possível excluir esta obra porque existem lançamentos vinculados a ela.' });
    }
    await prisma.tb_obra.delete({ where: { id } });
    res.json({ mensagem: 'Obra excluída' });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LANÇAMENTOS (Movimentação)
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/lancamentos', async (req, res) => {
  try {
    const { id_obra, itens, data_movimentacao } = req.body;
    if (!id_obra || !itens?.length) return res.status(400).json({ erro: 'Obra e itens são obrigatórios' });

    const idObra = parseInt(String(id_obra), 10);
    if (!Number.isFinite(idObra)) return res.status(400).json({ erro: 'ID da obra inválido' });

    let dataMov = null;
    if (data_movimentacao) {
      const d = new Date(data_movimentacao);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ erro: 'Data inválida' });
      dataMov = d;
    }

    const payload = itens.map((item, idx) => {
      const idProduto = parseInt(String(item.id_produto_servico), 10);
      const quantidade = parseFloat(String(item.quantidade).replace(',', '.'));
      const precoUnit = parseFloat(String(item.preco_unit).replace(',', '.'));

      if (!Number.isFinite(idProduto)) throw new Error(`Item ${idx + 1}: produto inválido`);
      if (!Number.isFinite(quantidade) || quantidade <= 0) throw new Error(`Item ${idx + 1}: quantidade inválida`);
      if (!Number.isFinite(precoUnit) || precoUnit < 0) throw new Error(`Item ${idx + 1}: preço inválido`);

      const total = +(quantidade * precoUnit).toFixed(2);

      return {
        id_obra: idObra,
        id_produto_servico: idProduto,
        quantidade,
        preco_custo_aplicado: +precoUnit.toFixed(2),
        total_calculado: total,
        ...(dataMov ? { data_movimentacao: dataMov } : {}),
      };
    });

    const result = await prisma.tb_movimentacao_obra.createMany({ data: payload });
    res.status(201).json({ mensagem: `${result.count} item(ns) lançado(s) com sucesso`, total: result.count });
  } catch (err) {
    console.error('Erro ao salvar lançamento:', err);
    if (err?.message?.startsWith('Item ')) return res.status(400).json({ erro: err.message });
    res.status(500).json({ erro: err.message || 'Erro interno' });
  }
});

app.get('/api/lancamentos', async (req, res) => {
  try {
    const { id_obra } = req.query;
    const where = id_obra ? { id_obra: parseInt(id_obra) } : {};
    const lancamentos = await prisma.tb_movimentacao_obra.findMany({
      where, orderBy: { data_movimentacao: 'asc' },
      include: {
        tb_obra: { select: { id: true, nome: true } },
        tb_produto_servico: { select: { id: true, codigo_interno: true, tipo: true, descricao: true, unidade_medida: true, tb_grupo: { select: { id: true, codigo: true, descricao: true } } } },
      },
    });
    res.json(lancamentos);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.put('/api/lancamentos/:id', async (req, res) => {
  try {
    const { quantidade, preco_custo_aplicado } = req.body;
    const q = parseFloat(quantidade);
    const p = parseFloat(preco_custo_aplicado);
    if (isNaN(q) || isNaN(p)) return res.status(400).json({ erro: 'Quantidade e preço inválidos' });
    const item = await prisma.tb_movimentacao_obra.update({
      where: { id: parseInt(req.params.id) },
      data: { quantidade: q, preco_custo_aplicado: p, total_calculado: q * p },
      include: {
        tb_produto_servico: { select: { id: true, codigo_interno: true, descricao: true, unidade_medida: true } },
      },
    });
    res.json(item);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.delete('/api/lancamentos/:id', async (req, res) => {
  try {
    await prisma.tb_movimentacao_obra.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ mensagem: 'Lançamento excluído' });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// USUÁRIOS
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/usuarios', async (_req, res) => {
  try {
    res.json(await prisma.tb_usuario.findMany({
      select: { id: true, nome: true, login: true, email: true, nivel_permissao: true, ativo: true, data_cadastro: true },
      orderBy: { nome: 'asc' },
    }));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.post('/api/usuarios', async (req, res) => {
  try {
    const { nome, login, email, senha, nivel_permissao } = req.body;
    if (!nome?.trim() || !login?.trim() || !senha?.trim()) return res.status(400).json({ erro: 'Nome, usuário e senha são obrigatórios' });
    res.status(201).json(await prisma.tb_usuario.create({
      data: { nome: nome.trim(), login: login.trim().toLowerCase(), email: email?.trim() ? email.trim().toLowerCase() : null, senha, nivel_permissao: nivel_permissao || 'OPERADOR', ativo: true },
      select: { id: true, nome: true, login: true, email: true, nivel_permissao: true, ativo: true, data_cadastro: true },
    }));
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ erro: 'Usuário ou e-mail já cadastrado' });
    res.status(500).json({ erro: err.message });
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
  try {
    const { nome, login, email, nivel_permissao, ativo, senha } = req.body;
    const data = { nome: nome?.trim(), login: login?.trim().toLowerCase(), email: email?.trim() ? email.trim().toLowerCase() : null, nivel_permissao, ativo };
    if (senha?.trim()) data.senha = senha.trim();
    res.json(await prisma.tb_usuario.update({
      where: { id: parseInt(req.params.id) }, data,
      select: { id: true, nome: true, login: true, email: true, nivel_permissao: true, ativo: true, data_cadastro: true },
    }));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.delete('/api/usuarios/:id', async (req, res) => {
  try {
    await prisma.tb_usuario.update({ where: { id: parseInt(req.params.id) }, data: { ativo: false } });
    res.json({ mensagem: 'Usuário inativado' });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RELATÓRIOS
// ═══════════════════════════════════════════════════════════════════════════════
// ─── Relatório de custos por Canteiro (agrega obras filhas) ───────────────────
app.get('/api/relatorios/custos-por-canteiro', async (_req, res) => {
  try {
    const canteiros = await prisma.tb_canteiro.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      include: {
        tb_obra: {
          orderBy: { nome: 'asc' },
          include: {
            tb_movimentacao_obra: {
              select: { total_calculado: true, quantidade: true, tb_produto_servico: { select: { descricao: true, tipo: true } } },
            },
          },
        },
      },
    });

    const result = canteiros.map(c => {
      const obras = c.tb_obra.map(o => {
        const gastos   = o.tb_movimentacao_obra.reduce((acc, m) => acc + parseFloat(String(m.total_calculado || 0)), 0);
        const orcamento = parseFloat(String(o.valor_contratado || 0));
        return {
          id: o.id, nome: o.nome, status: o.status,
          orcamento, gastos, lucro: orcamento - gastos,
          qtd_lancamentos: o.tb_movimentacao_obra.length,
        };
      });

      const totalOrcamento = obras.reduce((acc, o) => acc + o.orcamento, 0);
      const totalGastos    = obras.reduce((acc, o) => acc + o.gastos, 0);
      return {
        id: c.id, nome: c.nome, responsavel: c.responsavel,
        totalOrcamento, totalGastos, lucro: totalOrcamento - totalGastos,
        qtd_obras: obras.length, obras,
      };
    });

    // Obras SEM canteiro (avulsas)
    const obrasAvulsas = await prisma.tb_obra.findMany({
      where: { id_canteiro: null },
      orderBy: { nome: 'asc' },
      include: { tb_movimentacao_obra: { select: { total_calculado: true } } },
    });

    if (obrasAvulsas.length > 0) {
      const obras = obrasAvulsas.map(o => {
        const gastos    = o.tb_movimentacao_obra.reduce((acc, m) => acc + parseFloat(String(m.total_calculado || 0)), 0);
        const orcamento = parseFloat(String(o.valor_contratado || 0));
        return { id: o.id, nome: o.nome, status: o.status, orcamento, gastos, lucro: orcamento - gastos, qtd_lancamentos: o.tb_movimentacao_obra.length };
      });
      const totalOrcamento = obras.reduce((acc, o) => acc + o.orcamento, 0);
      const totalGastos    = obras.reduce((acc, o) => acc + o.gastos, 0);
      result.push({ id: 0, nome: '(Obras sem Canteiro)', responsavel: null, totalOrcamento, totalGastos, lucro: totalOrcamento - totalGastos, qtd_obras: obras.length, obras });
    }

    res.json(result);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.get('/api/relatorios/custos-por-obra', async (_req, res) => {
  try {
    const obras = await prisma.tb_obra.findMany({
      orderBy: { nome: 'asc' },
      include: { tb_movimentacao_obra: { select: { total_calculado: true, quantidade: true, tb_produto_servico: { select: { descricao: true, tipo: true } } } } },
    });
    const result = obras.map(o => {
      const gastos = o.tb_movimentacao_obra.reduce((acc, m) => acc + parseFloat(m.total_calculado || 0), 0);
      const orcamento = parseFloat(o.valor_contratado || 0);
      return {
        id: o.id, nome: o.nome, status: o.status,
        orcamento, gastos, lucro: orcamento - gastos,
        qtd_lancamentos: o.tb_movimentacao_obra.length,
      };
    });
    res.json(result);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ─── Frontend estático (produção) ────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTAÇÃO DE NF-e
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/nf-importacoes', async (_req, res) => {
  try {
    await garantirEstruturaImportacaoFiscal();

    const rows = await prisma.$queryRaw`
      SELECT
        n.*,
        COUNT(i.id)::int AS qtd_itens
      FROM tb_importacao_nfe n
      LEFT JOIN tb_importacao_nfe_item i ON i.id_importacao_nfe = n.id
      GROUP BY n.id
      ORDER BY n.data_cadastro DESC, n.id DESC
      LIMIT 40
    `;

    res.json(rows.map(normalizarDocumentoImportado));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.get('/api/nf-importacoes/:id', async (req, res) => {
  try {
    await garantirEstruturaImportacaoFiscal();
    const documento = await carregarImportacaoNfe(parseInt(req.params.id, 10));
    if (!documento) return res.status(404).json({ erro: 'Importação não encontrada' });
    res.json(documento);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.post('/api/nf-importacoes', async (req, res) => {
  try {
    await garantirEstruturaImportacaoFiscal();

    const { fileName, contentBase64 } = req.body || {};
    if (!fileName || !contentBase64) {
      return res.status(400).json({ erro: 'Arquivo obrigatório para importação.' });
    }

    const extension = path.extname(String(fileName)).toLowerCase();
    if (!['.xml', '.pdf'].includes(extension)) {
      return res.status(400).json({ erro: 'Envie um arquivo XML ou PDF.' });
    }

    const savedFile = salvarArquivoImportado({ fileName, contentBase64 });

    if (extension === '.pdf') {
      const pdfBuffer = Buffer.from(contentBase64, 'base64');

      try {
        const parsedPdf = await parseDanfePdfBuffer(pdfBuffer);
        const cnpjFornecedorPdf = onlyDigits(parsedPdf.documento.cnpj_emitente);
        const vinculosExistentesPdf = await buscarVinculosFornecedor(cnpjFornecedorPdf);

        const documentoIdPdf = await prisma.$transaction(async (tx) => {
          const insertedDoc = await tx.$queryRaw`
            INSERT INTO tb_importacao_nfe (
              tipo_arquivo,
              nome_arquivo_original,
              nome_arquivo_salvo,
              caminho_arquivo,
              url_arquivo,
              chave_acesso,
              numero_nf,
              serie,
              data_emissao,
              cnpj_emitente,
              nome_emitente,
              valor_total_itens,
              valor_total_nota,
              status_processamento,
              observacao,
              metadata_json
            )
            VALUES (
              'PDF',
              ${String(fileName)},
              ${savedFile.nomeArquivoSalvo},
              ${savedFile.caminhoArquivo},
              ${savedFile.urlArquivo},
              ${parsedPdf.documento.chave_acesso || null},
              ${parsedPdf.documento.numero_nf || null},
              ${parsedPdf.documento.serie || null},
              ${toDateOrNull(parsedPdf.documento.data_emissao)},
              ${cnpjFornecedorPdf || null},
              ${parsedPdf.documento.nome_emitente || null},
              ${parsedPdf.documento.valor_total_itens},
              ${parsedPdf.documento.valor_total_nota},
              ${parsedPdf.itens.length ? 'PENDENTE_VINCULO' : 'IMPORTADO'},
              ${parsedPdf.itens.length ? 'Itens extraidos automaticamente do DANFE PDF.' : 'PDF lido, mas sem itens estruturados.'},
              ${JSON.stringify({ leitura_automatica: true, origem: 'pdf' })}
            )
            RETURNING *
          `;

          const documento = insertedDoc[0];

          for (const item of parsedPdf.itens) {
            const codigoFornecedor = String(item.codigo_produto_fornecedor || '').trim();
            let vinculo = vinculosExistentesPdf.get(codigoFornecedor) || null;

            if (!vinculo && cnpjFornecedorPdf && codigoFornecedor) {
              const vinculoRows = await tx.$queryRaw`
                SELECT
                  p.id AS produto_id,
                  p.codigo_interno AS produto_codigo_interno,
                  p.descricao AS produto_descricao,
                  p.tipo AS produto_tipo,
                  g.id AS grupo_id,
                  g.codigo AS grupo_codigo,
                  g.descricao AS grupo_descricao
                FROM tb_vinculo_produto_fornecedor v
                JOIN tb_produto_servico p ON p.id = v.id_produto_servico
                LEFT JOIN tb_grupo g ON g.id = p.id_grupo
                WHERE v.cnpj_fornecedor = ${cnpjFornecedorPdf}
                  AND v.codigo_produto_fornecedor = ${codigoFornecedor}
                LIMIT 1
              `;
              vinculo = vinculoRows[0] ? normalizarProdutoRelacionado(vinculoRows[0]) : null;
            }

            await tx.$queryRaw`
              INSERT INTO tb_importacao_nfe_item (
                id_importacao_nfe,
                numero_item,
                codigo_produto_fornecedor,
                descricao,
                unidade,
                quantidade,
                valor_unitario_original,
                valor_unitario_final,
                valor_total,
                valor_rateio,
                id_produto_servico_vinculado,
                sugestao_historica,
                observacao
              )
              VALUES (
                ${Number(documento.id)},
                ${item.numero_item || null},
                ${codigoFornecedor || null},
                ${item.descricao || null},
                ${item.unidade || null},
                ${item.quantidade},
                ${item.valor_unitario_original},
                ${item.valor_unitario_final},
                ${item.valor_total_final},
                ${item.valor_rateio},
                ${vinculo?.id || null},
                ${Boolean(vinculo)},
                ${item.valor_rateio ? 'Valor ajustado para fechamento do total do DANFE.' : null}
              )
            `;
          }

          return Number(documento.id);
        });

        return res.status(201).json(await carregarImportacaoNfe(documentoIdPdf));
      } catch (_pdfErr) {
        const insertedPdfFallback = await prisma.$queryRaw`
          INSERT INTO tb_importacao_nfe (
            tipo_arquivo,
            nome_arquivo_original,
            nome_arquivo_salvo,
            caminho_arquivo,
            url_arquivo,
            status_processamento,
            observacao,
            metadata_json
          )
          VALUES (
            'PDF',
            ${String(fileName)},
            ${savedFile.nomeArquivoSalvo},
            ${savedFile.caminhoArquivo},
            ${savedFile.urlArquivo},
            'ARQUIVADO',
            ${'PDF armazenado. A leitura automatica nao conseguiu estruturar este DANFE.'},
            ${JSON.stringify({ leitura_automatica: false, origem: 'pdf' })}
          )
          RETURNING *
        `;

        return res.status(201).json(await carregarImportacaoNfe(Number(insertedPdfFallback[0].id)));
      }
    }

    const xmlContent = Buffer.from(contentBase64, 'base64').toString('utf8');
    const parsed = parseNfeXml(xmlContent);
    const cnpjFornecedor = onlyDigits(parsed.documento.cnpj_emitente);
    const vinculosExistentes = await buscarVinculosFornecedor(cnpjFornecedor);

    const documentoId = await prisma.$transaction(async (tx) => {
      const insertedDoc = await tx.$queryRaw`
        INSERT INTO tb_importacao_nfe (
          tipo_arquivo,
          nome_arquivo_original,
          nome_arquivo_salvo,
          caminho_arquivo,
          url_arquivo,
          chave_acesso,
          numero_nf,
          serie,
          data_emissao,
          cnpj_emitente,
          nome_emitente,
          valor_total_itens,
          valor_total_nota,
          status_processamento,
          observacao,
          metadata_json
        )
        VALUES (
          'XML',
          ${String(fileName)},
          ${savedFile.nomeArquivoSalvo},
          ${savedFile.caminhoArquivo},
          ${savedFile.urlArquivo},
          ${parsed.documento.chave_acesso || null},
          ${parsed.documento.numero_nf || null},
          ${parsed.documento.serie || null},
          ${toDateOrNull(parsed.documento.data_emissao)},
          ${cnpjFornecedor || null},
          ${parsed.documento.nome_emitente || null},
          ${parsed.documento.valor_total_itens},
          ${parsed.documento.valor_total_nota},
          ${parsed.itens.length ? 'PENDENTE_VINCULO' : 'IMPORTADO'},
          ${null},
          ${JSON.stringify({ possui_rateio_nota: parsed.documento.possui_rateio_nota })}
        )
        RETURNING *
      `;

      const documento = insertedDoc[0];

      for (const item of parsed.itens) {
        const codigoFornecedor = String(item.codigo_produto_fornecedor || '').trim();
        let vinculo = vinculosExistentes.get(codigoFornecedor) || null;

        if (!vinculo && cnpjFornecedor && codigoFornecedor) {
          const vinculoRows = await tx.$queryRaw`
            SELECT
              p.id AS produto_id,
              p.codigo_interno AS produto_codigo_interno,
              p.descricao AS produto_descricao,
              p.tipo AS produto_tipo,
              g.id AS grupo_id,
              g.codigo AS grupo_codigo,
              g.descricao AS grupo_descricao
            FROM tb_vinculo_produto_fornecedor v
            JOIN tb_produto_servico p ON p.id = v.id_produto_servico
            LEFT JOIN tb_grupo g ON g.id = p.id_grupo
            WHERE v.cnpj_fornecedor = ${cnpjFornecedor}
              AND v.codigo_produto_fornecedor = ${codigoFornecedor}
            LIMIT 1
          `;
          vinculo = vinculoRows[0] ? normalizarProdutoRelacionado(vinculoRows[0]) : null;
        }

        await tx.$queryRaw`
          INSERT INTO tb_importacao_nfe_item (
            id_importacao_nfe,
            numero_item,
            codigo_produto_fornecedor,
            descricao,
            unidade,
            quantidade,
            valor_unitario_original,
            valor_unitario_final,
            valor_total,
            valor_rateio,
            id_produto_servico_vinculado,
            sugestao_historica,
            observacao
          )
          VALUES (
            ${Number(documento.id)},
            ${item.numero_item || null},
            ${codigoFornecedor || null},
            ${item.descricao || null},
            ${item.unidade || null},
            ${item.quantidade},
            ${item.valor_unitario_original},
            ${item.valor_unitario_final},
            ${item.valor_total_final},
            ${item.valor_rateio},
            ${vinculo?.id || null},
            ${Boolean(vinculo)},
            ${item.valor_rateio ? 'Valor ajustado para fechamento do total da NF-e.' : null}
          )
        `;
      }

      return Number(documento.id);
    });

    res.status(201).json(await carregarImportacaoNfe(documentoId));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

app.delete('/api/nf-importacoes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.$executeRawUnsafe(`DELETE FROM tb_importacao_nfe WHERE id = ${id}`);
    res.json({ mensagem: 'Importação excluída com sucesso.' });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.post('/api/nf-importacoes/:id/vinculos', async (req, res) => {
  try {
    await garantirEstruturaImportacaoFiscal();

    const importacaoId = parseInt(req.params.id, 10);
    const documento = await carregarImportacaoNfe(importacaoId);
    if (!documento) return res.status(404).json({ erro: 'Importação não encontrada.' });

    const itensRecebidos = Array.isArray(req.body?.itens) ? req.body.itens : [];
    const itensPorId = new Map(documento.itens.map((item) => [item.id, item]));

    await prisma.$transaction(async (tx) => {
      for (const item of itensRecebidos) {
        const atual = itensPorId.get(Number(item.id));
        if (!atual) continue;

        const produtoId = item.id_produto_servico_vinculado ? parseInt(item.id_produto_servico_vinculado, 10) : null;
        const observacao = item.observacao?.trim() || null;

        await tx.$queryRaw`
          UPDATE tb_importacao_nfe_item
          SET
            id_produto_servico_vinculado = ${produtoId},
            observacao = ${observacao}
          WHERE id = ${Number(item.id)}
            AND id_importacao_nfe = ${importacaoId}
        `;

        if (produtoId && documento.cnpj_emitente && atual.codigo_produto_fornecedor) {
          await tx.$queryRaw`
            INSERT INTO tb_vinculo_produto_fornecedor (
              cnpj_fornecedor,
              codigo_produto_fornecedor,
              descricao_referencia,
              id_produto_servico
            )
            VALUES (
              ${documento.cnpj_emitente},
              ${atual.codigo_produto_fornecedor},
              ${atual.descricao || null},
              ${produtoId}
            )
            ON CONFLICT (cnpj_fornecedor, codigo_produto_fornecedor)
            DO UPDATE SET
              descricao_referencia = EXCLUDED.descricao_referencia,
              id_produto_servico = EXCLUDED.id_produto_servico,
              data_ultima_utilizacao = CURRENT_TIMESTAMP
          `;
        }
      }

      const pendentes = await tx.$queryRaw`
        SELECT COUNT(*)::int AS total
        FROM tb_importacao_nfe_item
        WHERE id_importacao_nfe = ${importacaoId}
          AND id_produto_servico_vinculado IS NULL
      `;

      const totalItens = await tx.$queryRaw`
        SELECT COUNT(*)::int AS total
        FROM tb_importacao_nfe_item
        WHERE id_importacao_nfe = ${importacaoId}
      `;

      const status = Number(totalItens[0]?.total || 0) === 0
        ? 'ARQUIVADO'
        : Number(pendentes[0]?.total || 0) === 0
          ? 'VINCULADO'
          : 'PENDENTE_VINCULO';

      await tx.$queryRaw`
        UPDATE tb_importacao_nfe
        SET status_processamento = ${status}
        WHERE id = ${importacaoId}
      `;
    });

    res.json(await carregarImportacaoNfe(importacaoId));
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use('/uploads/nf', express.static(uploadRoot));
app.use(express.static(frontendDist));
app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`V9 INFORMÁTICA LTDA - Desenvolvendo o futuro da Sr Engenharia.`);
});
