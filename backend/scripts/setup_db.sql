-- Script de Criação do Banco de Dados - V9 INFORMÁTICA LTDA
-- Canteiro de Obras - Gestão Multi-Empresa

-- 1. Banco de Dados ROOT (Lista de Empresas)
-- Este banco deve ser criado manualmente como 'canteiro_root' ou via script do instalador

CREATE TABLE IF NOT EXISTS tb_empresa (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    endereco TEXT,
    cnpj VARCHAR(14) UNIQUE NOT NULL, -- Somente números
    telefone VARCHAR(20),
    email VARCHAR(100),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observacao TEXT,
    banco_dados_vinculado VARCHAR(50) -- Nome da base de dados no formato CNPJ_OS
);

-- 2. Estrutura Base para cada Empresa (CNPJ_OS)
-- O script abaixo deve ser rodado dentro de cada nova base de dados criada

CREATE TABLE IF NOT EXISTS tb_usuario (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    login VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    senha VARCHAR(255) NOT NULL,
    nivel_permissao VARCHAR(20) DEFAULT 'OPERADOR', -- ADMIN, GERENTE, OPERADOR
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tb_grupo (
    id SERIAL PRIMARY KEY,
    descricao VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS tb_produto_servico (
    id SERIAL PRIMARY KEY,
    codigo_interno VARCHAR(50),
    descricao VARCHAR(200) NOT NULL,
    unidade_medida VARCHAR(10),
    preco_custo DECIMAL(15,2) DEFAULT 0,
    id_grupo INTEGER REFERENCES tb_grupo(id),
    ativo BOOLEAN DEFAULT TRUE,
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tb_obra (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    endereco TEXT,
    data_inicio DATE,
    data_termino DATE,
    responsavel VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ATIVA', -- ATIVA, FINALIZADA, CANCELADA
    valor_contratado DECIMAL(15,2) DEFAULT 0,
    numero_licitacao VARCHAR(50),
    orgao_responsavel VARCHAR(100),
    tipo_orgao VARCHAR(20), -- FEDERAL, ESTADUAL, MUNICIPAL
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tb_movimentacao_obra (
    id SERIAL PRIMARY KEY,
    id_obra INTEGER REFERENCES tb_obra(id),
    id_produto_servico INTEGER REFERENCES tb_produto_servico(id),
    quantidade DECIMAL(15,4) DEFAULT 0,
    preco_custo_aplicado DECIMAL(15,2) DEFAULT 0,
    total_calculado DECIMAL(15,2) DEFAULT 0,
    data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    id_usuario_registro INTEGER REFERENCES tb_usuario(id)
);

CREATE TABLE IF NOT EXISTS tb_auditoria (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER,
    tipo_operacao VARCHAR(20), -- INCLUSAO, ALTERACAO, EXCLUSAO
    tabela_afetada VARCHAR(50),
    id_registro_afetado INTEGER,
    dados_anteriores JSONB,
    dados_novos JSONB,
    data_hora TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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

CREATE TABLE IF NOT EXISTS tb_vinculo_produto_fornecedor (
    id SERIAL PRIMARY KEY,
    cnpj_fornecedor VARCHAR(14) NOT NULL,
    codigo_produto_fornecedor VARCHAR(60) NOT NULL,
    descricao_referencia VARCHAR(255),
    id_produto_servico INTEGER NOT NULL REFERENCES tb_produto_servico(id),
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_ultima_utilizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tb_vinculo_produto_fornecedor UNIQUE (cnpj_fornecedor, codigo_produto_fornecedor)
);

-- Seed Inicial (Usuário Master) - Rule 4
-- Observação: A senha 'Belvedere640@' deve ser armazenada como hash em produção.
-- Aqui usamos o valor literal por ser um script de demonstração exigido.
INSERT INTO tb_usuario (nome, login, email, senha, nivel_permissao)
VALUES ('Master Admin', 'master', 'master@v9informatica.com.br', 'Belvedere640@', 'ROOT')
ON CONFLICT DO NOTHING;
