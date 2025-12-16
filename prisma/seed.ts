import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Configurar conexão com PostgreSQL usando o adaptador
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL não está definida no .env');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');

  // Criar usuário MASTER
  const emailMaster = 'master@desbravaprovas.com';
  const senhaMaster = 'Master@123'; // IMPORTANTE: Trocar após primeiro login!
  const SALT_ROUNDS = 10;

  // Verificar se já existe
  const usuarioExistente = await prisma.usuario.findUnique({
    where: { email: emailMaster },
  });

  if (usuarioExistente) {
    console.log('⚠️  Usuário MASTER já existe no banco!');
    console.log(`   Email: ${emailMaster}`);
    return;
  }

  // Hash da senha
  const senhaHash = await bcrypt.hash(senhaMaster, SALT_ROUNDS);

  // Criar usuário MASTER
  const master = await prisma.usuario.create({
    data: {
      nome: 'Administrador Master',
      email: emailMaster,
      senhaHash,
      papelGlobal: 'MASTER',
      emailVerificado: true, // MASTER já vem verificado
    },
  });

  console.log('✅ Usuário MASTER criado com sucesso!');
  console.log('\n📧 Credenciais de acesso:');
  console.log(`   Email: ${emailMaster}`);
  console.log(`   Senha: ${senhaMaster}`);
  console.log('\n⚠️  IMPORTANTE: Altere a senha após o primeiro login!\n');
}

main()
  .catch((e) => {
    console.error('❌ Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
