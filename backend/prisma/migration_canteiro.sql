-- ============================================================
-- MIGRAÇÃO: Reestruturação Canteiro de Obras
-- Data: 2026-04-06
-- Descrição: Cria tabela tb_canteiro (pai) e vincula tb_obra (filho)
-- V9 INFORMÁTICA LTDA - (37) 4141-0341 - Divinópolis MG
-- ============================================================

-- PASSO 1: Criar tabela de Canteiro (entidade pai)
CREATE TABLE IF NOT EXISTS tb_canteiro (
    id            SERIAL PRIMARY KEY,
    nome          VARCHAR(200)  NOT NULL,
    endereco      TEXT,
    responsavel   VARCHAR(100),
    descricao     TEXT,
    ativo         BOOLEAN       DEFAULT true,
    data_cadastro TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- PASSO 2: Adicionar chave estrangeira em tb_obra → tb_canteiro
ALTER TABLE tb_obra
    ADD COLUMN IF NOT EXISTS id_canteiro INTEGER REFERENCES tb_canteiro(id) ON DELETE SET NULL;

-- PASSO 3: Índice para buscas por canteiro
CREATE INDEX IF NOT EXISTS idx_tb_obra_id_canteiro ON tb_obra(id_canteiro);

-- PASSO 4: Índice para buscas ativas
CREATE INDEX IF NOT EXISTS idx_tb_canteiro_ativo ON tb_canteiro(ativo);

-- VERIFICAÇÃO
-- SELECT c.nome AS canteiro, o.nome AS obra, o.status
-- FROM tb_canteiro c
-- LEFT JOIN tb_obra o ON o.id_canteiro = c.id
-- ORDER BY c.nome, o.nome;
