const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
require('dotenv').config();

const app = express();
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.json({ message: 'Backend Canteiro de Obras Ativo', developer: 'V9 INFORMÁTICA LTDA - (37) 4141-0341', status: 'ONLINE' }));

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
    await prisma.tb_grupo.delete({ where: { id: parseInt(req.params.id) } });
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
    await prisma.tb_produto_servico.update({ where: { id: parseInt(req.params.id) }, data: { ativo: false } });
    res.json({ mensagem: 'Item inativado' });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// OBRAS (com gastos calculados)
// ═══════════════════════════════════════════════════════════════════════════════
app.get('/api/obras', async (_req, res) => {
  try {
    const obras = await prisma.tb_obra.findMany({
      orderBy: { data_cadastro: 'desc' },
      include: { tb_movimentacao_obra: { select: { total_calculado: true } } },
    });
    const result = obras.map(o => {
      const gastos = o.tb_movimentacao_obra.reduce((acc, m) => acc + parseFloat(m.total_calculado || 0), 0);
      const { tb_movimentacao_obra, ...obra } = o;
      return { ...obra, gastos };
    });
    res.json(result);
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.post('/api/obras', async (req, res) => {
  try {
    const { nome, endereco, responsavel, status, valor_contratado, data_inicio, data_termino, numero_licitacao, orgao_responsavel, tipo_orgao } = req.body;
    if (!nome?.trim()) return res.status(400).json({ erro: 'Nome obrigatório' });
    res.status(201).json(await prisma.tb_obra.create({
      data: {
        nome: nome.trim(), endereco: endereco || null, responsavel: responsavel || null,
        status: status || 'ATIVA', valor_contratado: parseFloat(valor_contratado) || 0,
        data_inicio: data_inicio ? new Date(data_inicio) : null,
        data_termino: data_termino ? new Date(data_termino) : null,
        numero_licitacao: numero_licitacao || null, orgao_responsavel: orgao_responsavel || null, tipo_orgao: tipo_orgao || null,
      },
    }));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.put('/api/obras/:id', async (req, res) => {
  try {
    const { nome, endereco, responsavel, status, valor_contratado, data_inicio, data_termino } = req.body;
    if (!nome?.trim()) return res.status(400).json({ erro: 'Nome obrigatório' });
    res.json(await prisma.tb_obra.update({
      where: { id: parseInt(req.params.id) },
      data: {
        nome: nome.trim(), endereco: endereco || null, responsavel: responsavel || null,
        status: status || 'ATIVA', valor_contratado: parseFloat(valor_contratado) || 0,
        data_inicio: data_inicio ? new Date(data_inicio) : null,
        data_termino: data_termino ? new Date(data_termino) : null,
      },
    }));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.delete('/api/obras/:id', async (req, res) => {
  try {
    await prisma.tb_obra.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ mensagem: 'Obra excluída' });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

// ═══════════════════════════════════════════════════════════════════════════════
// LANÇAMENTOS (Movimentação)
// ═══════════════════════════════════════════════════════════════════════════════
app.post('/api/lancamentos', async (req, res) => {
  try {
    const { id_obra, itens } = req.body;
    if (!id_obra || !itens?.length) return res.status(400).json({ erro: 'Obra e itens são obrigatórios' });
    const criados = await prisma.$transaction(
      itens.map(item => prisma.tb_movimentacao_obra.create({
        data: {
          id_obra: parseInt(id_obra),
          id_produto_servico: parseInt(item.id_produto_servico),
          quantidade: parseFloat(item.quantidade),
          preco_custo_aplicado: parseFloat(item.preco_unit),
          total_calculado: parseFloat(item.quantidade) * parseFloat(item.preco_unit),
        },
      }))
    );
    res.status(201).json({ mensagem: `${criados.length} item(ns) lançado(s) com sucesso`, total: criados.length });
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.get('/api/lancamentos', async (req, res) => {
  try {
    const { id_obra } = req.query;
    const where = id_obra ? { id_obra: parseInt(id_obra) } : {};
    const lancamentos = await prisma.tb_movimentacao_obra.findMany({
      where, orderBy: { data_movimentacao: 'asc' },
      include: {
        tb_obra: { select: { id: true, nome: true } },
        tb_produto_servico: { select: { id: true, codigo_interno: true, descricao: true, unidade_medida: true } },
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
      select: { id: true, nome: true, email: true, nivel_permissao: true, ativo: true, data_cadastro: true },
      orderBy: { nome: 'asc' },
    }));
  } catch (err) { res.status(500).json({ erro: err.message }); }
});

app.post('/api/usuarios', async (req, res) => {
  try {
    const { nome, email, senha, nivel_permissao } = req.body;
    if (!nome?.trim() || !email?.trim() || !senha?.trim()) return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios' });
    res.status(201).json(await prisma.tb_usuario.create({
      data: { nome: nome.trim(), email: email.trim().toLowerCase(), senha, nivel_permissao: nivel_permissao || 'OPERADOR', ativo: true },
      select: { id: true, nome: true, email: true, nivel_permissao: true, ativo: true, data_cadastro: true },
    }));
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ erro: 'E-mail já cadastrado' });
    res.status(500).json({ erro: err.message });
  }
});

app.put('/api/usuarios/:id', async (req, res) => {
  try {
    const { nome, email, nivel_permissao, ativo, senha } = req.body;
    const data = { nome: nome?.trim(), email: email?.trim().toLowerCase(), nivel_permissao, ativo };
    if (senha?.trim()) data.senha = senha.trim();
    res.json(await prisma.tb_usuario.update({
      where: { id: parseInt(req.params.id) }, data,
      select: { id: true, nome: true, email: true, nivel_permissao: true, ativo: true, data_cadastro: true },
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

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`V9 INFORMÁTICA LTDA - Desenvolvendo o futuro da Sr Engenharia.`);
});
