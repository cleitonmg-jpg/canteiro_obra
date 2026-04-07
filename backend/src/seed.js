const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Semeando usuário mestre...');
  
  // Criar ou atualizar usuário Root Master
  const master = await prisma.tb_usuario.upsert({
    where: { login: 'master' },
    update: {
      nome: 'Administrador Master',
      senha: 'Belvedere640@',
      nivel_permissao: 'ADMINISTRADOR',
      ativo: true
    },
    create: {
      nome: 'Administrador Master',
      login: 'master',
      senha: 'Belvedere640@',
      nivel_permissao: 'ADMINISTRADOR',
      ativo: true
    }
  });

  console.log('Usuário mestre configurado:', master.login);

  // Criar empresa padrão se não existir
  const empresa = await prisma.tb_empresa.findFirst();
  if (!empresa) {
    await prisma.tb_empresa.create({
      data: {
        nome: 'CONSTRUTORA EXEMPLO LTDA',
        cnpj: '11655920000164',
        email: 'contato@exemplo.com.br',
        telefone: '(37) 4141-0341',
        endereco: 'Rua das Obras, 123, Divinópolis MG',
        observacao: 'Empresa padrão para testes'
      }
    });
    console.log('Empresa padrão criada.');
  }

  // Criar grupo padrão se não existir
  const grupo = await prisma.tb_grupo.findFirst();
  if (!grupo) {
      await prisma.tb_grupo.create({
          data: {
              codigo: 'GR-0001',
              descricao: 'MATERIAIS BÁSICOS'
          }
      });
      console.log('Grupo padrão criado.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
