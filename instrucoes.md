# Projeto: Gestão de Canteiro de Obras (V9 Informática)

## 1. Identificação do Projeto e Cliente
**Empresa Responsável (Responsável Técnica):**
- **Nome:** S.R Engenharia e Projetos Ltda.
- **Endereço:** Rua Aluminio, 935, Apt 101, Sao Joao de Deus - Divinópolis/MG
- **CEP:** 35500-246
- **CNPJ:** 56.909.515/0001-10

- **Ação:** Estes dados devem ser lançados na tabela `tbempresa` como a empresa raiz/responsável no momento do setup. e forma que seja editavel em formulario.

---

## 2. Visão Geral e Persona
Você deve atuar como um Desenvolvedor Sênior e Especialista em Administração/Engenharia Civil. O objetivo é criar um ecossistema robusto para planejamento de obras, controle de custos e gestão multi-empresa.

---

## 3. Arquitetura Técnica
- **Frontend:** React + TypeScript + Tailwind CSS (Design Premium, Cores Suaves/Construção Civil).
- **Backend:** Node.js (ou similar) com PostgreSQL.
- **Configuração:** Uso estrito de arquivo `.env` para credenciais e variáveis de ambiente.
- **Deploy:** Preparado para GitHub + Coolify (Dockerização obrigatória).

---

## 4. Banco de Dados e Naming
- **Linguagem:** Nomes de campos e tabelas em **Português Brasil** (exceto `email`).
- **Padrão Multi-empresa:** Ao criar a base para uma nova empresa, usar o CNPJ (apenas números) + sufixo `_OS` (Ex: `1165592000164_OS`).
- **Segurança:** 
    - Usuário Master/Root: `Master` / Senha: `Belvedere640@`.
    - Script de criação automática de tabelas se não existirem.
- **Controle de Versão:** Migrations ou scripts SQL versionados.

---

## 5. Funcionalidades de Cadastro (CRUD)
### Padrões de Interface
- **Busca Inteligente:** Todo campo de busca deve permitir pesquisar por **Código** ou **Descrição**.
- **Cadastro Rápido:** Se o registro não for localizado na busca, deve haver um botão/atalho para abrir a janela de cadastro.
- **Exclusão:** Somente permitida se não houver registros vinculados (movimentação).

### Módulos Principais
1. **Cadastro de Empresa:** Não precisa ser gestão multi-empresa.

2. **cadastro Obras:** Nome, endereço, datas (início/término), responsável, status, valor contratado, licitação e órgão responsável (Federal/Estadual/Municipal).
3. **Cadastro de Grupos:** Agrupamento de materiais/serviços (Ex: Elétrica, Hidráulica).
4. **Cadastro de Produtos e Serviços:** Código, Descrição, Unidade de Medida, Preço de Custo, Quantidade e Grupo.
5. **Cadastro de Usuários e Permissões:**
    - Níveis: Admin Total, Gerente (Permissão na empresa), Operador (Lançamentos).
    - Restrições por tela e por ação (Consultar, Alterar, Excluir).

Ordem  do menu
Cadastro da Empresa (unicaa)
Cadastro de Obras
Cadastro de Grupos
Cadastro de Produtos e Serviço

--
Movimentação
Lançamento de itens e serviços nas obras
---
Relatórios
----
Usuários
Auditoria
Sair

## 6. Operacional: Lançamento em Canteiro de Obras
- **Lançamento de Demandas:** Inserir diversos itens (materiais/serviços) em um único lançamento para uma obra selecionada.
- **Cálculo Automático:** Quantidade x Preço de Custo = Total.
- **Edição:** Possibilidade de editar itens lançados ou adicionar novas demandas conforme a evolução da obra.
- **Indicadores de Obra:**
    - Valor Gasto (Materiais/Serviços) vs. Valor Contratado.
    - Status de Lucro ou Prejuízo em tempo real.

---

## 7. Gráficos e Relatórios
- **Dashboard:** Gráfico de gastos por grupo (ex: pizza/barras mostrando % gasto em Elétrica, Civil, etc.).
- **Relatórios Detalhados:** Exportação para **Excel** de obras, materiais e serviços.
- **Filtros:** Detalhamento por custos, quantidades e totais gerais.

---

## 8. Segurança e Auditoria
- **Login Multi-empresa:** Requer CNPJ, Usuário e Senha vinculados entre si.
- **Registro de Auditoria:** Toda inclusão, alteração ou exclusão deve gravar:
    - `usuario_id` (quem fez).
    - `data_hora` (quando fez).
    - `tipo_operacao` (o que fez).

---

## 9. Deploy e Publicação (Sem Docker)
Para o servidor de produção da Sr Engenharia, seguiremos o padrão de alta disponibilidade usando **PM2** e **NGINX**.

### GitHub
- Repositório organizado por pastas: `/frontend` e `/backend`.

### Servidor (Linux/Windows com PM2)
- **Frontend (React):** Gerar o build estático e servir via NGINX.
  - `npm run build`
  - Pasta resultante: `dist/`
- **Backend (Node):** Gerenciar o processo usando PM2 para reinicialização automática.
  - `pm2 start src/index.js --name canteiro-backend`
  - `pm2 save`

### NGINX (Configuração de Proxy)
- Redirecionar a porta 80 para a pasta do frontend.
- Proxificar chamadas de API (`/api`) para a porta do backend (ex: `http://localhost:3000`).

---

## 10. Direitos Autorais e Créditos
Este software é desenvolvido e mantido por:
**V9 INFORMÁTICA LTDA - (37) 4141-0341 - Divinópolis MG**
*Todos os direitos autorais e intelectuais reservados.*
