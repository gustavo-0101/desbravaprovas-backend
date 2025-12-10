import {
  Injectable,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUsuarioDto, AlterarSenhaDto } from './dto';
import * as bcrypt from 'bcrypt';
import sharp from 'sharp';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class UsuariosService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lista todos os usuários com paginação
   */
  async listarTodos(pagina: number = 1, limite: number = 10) {
    const skip = (pagina - 1) * limite;

    const [usuarios, total] = await Promise.all([
      this.prisma.usuario.findMany({
        skip,
        take: limite,
        orderBy: { criadoEm: 'desc' },
        select: {
          id: true,
          nome: true,
          email: true,
          papelGlobal: true,
          fotoPerfilUrl: true,
          emailVerificado: true,
          criadoEm: true,
          atualizadoEm: true,
        },
      }),
      this.prisma.usuario.count(),
    ]);

    return {
      dados: usuarios,
      paginacao: {
        paginaAtual: pagina,
        itensPorPagina: limite,
        totalItens: total,
        totalPaginas: Math.ceil(total / limite),
      },
    };
  }

  /**
   * Busca usuário por ID
   */
  async buscarPorId(id: number) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        papelGlobal: true,
        fotoPerfilUrl: true,
        emailVerificado: true,
        googleId: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    return usuario;
  }

  /**
   * Busca usuário por email (com senhaHash, para uso interno)
   */
  async buscarPorEmail(email: string) {
    return this.prisma.usuario.findUnique({
      where: { email },
    });
  }

  /**
   * Atualiza dados do usuário
   */
  async atualizar(id: number, dto: UpdateUsuarioDto) {
    // Verificar se usuário existe
    await this.buscarPorId(id);

    // Se está tentando atualizar o email, verificar se já não existe
    if (dto.email) {
      const usuarioExistente = await this.prisma.usuario.findUnique({
        where: { email: dto.email },
      });

      if (usuarioExistente && usuarioExistente.id !== id) {
        throw new ConflictException('Este email já está em uso');
      }

      // Se alterar email, marcar como não verificado
      const usuario = await this.prisma.usuario.update({
        where: { id },
        data: {
          ...dto,
          emailVerificado: false,
          tokenVerificacao: null,
        },
        select: {
          id: true,
          nome: true,
          email: true,
          papelGlobal: true,
          fotoPerfilUrl: true,
          emailVerificado: true,
          criadoEm: true,
          atualizadoEm: true,
        },
      });

      return usuario;
    }

    // Atualização sem mudar email
    const usuario = await this.prisma.usuario.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        nome: true,
        email: true,
        papelGlobal: true,
        fotoPerfilUrl: true,
        emailVerificado: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    return usuario;
  }

  /**
   * Altera a senha do usuário
   */
  async alterarSenha(id: number, dto: AlterarSenhaDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id },
    });

    if (!usuario) {
      throw new NotFoundException(`Usuário com ID ${id} não encontrado`);
    }

    // Usuários que usam login com Google não têm senha
    if (!usuario.senhaHash) {
      throw new UnauthorizedException(
        'Usuários que fazem login com Google não possuem senha',
      );
    }

    // Verificar se a senha atual está correta
    const senhaValida = await bcrypt.compare(
      dto.senhaAtual,
      usuario.senhaHash,
    );

    if (!senhaValida) {
      throw new UnauthorizedException('Senha atual incorreta');
    }

    // Hash da nova senha
    const novaSenhaHash = await bcrypt.hash(dto.novaSenha, 10);

    // Atualizar senha
    await this.prisma.usuario.update({
      where: { id },
      data: { senhaHash: novaSenhaHash },
    });

    return { message: 'Senha alterada com sucesso' };
  }

  /**
   * Deleta usuário (soft delete futuro)
   */
  async deletar(id: number) {
    await this.buscarPorId(id);

    await this.prisma.usuario.delete({
      where: { id },
    });

    return { message: 'Usuário deletado com sucesso' };
  }

  /**
   * Atualiza foto de perfil do usuário
   */
  async atualizarFotoPerfil(id: number, file: Express.Multer.File) {
    // Verificar se usuário existe
    const usuario = await this.buscarPorId(id);

    // Validar tipo de arquivo
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!tiposPermitidos.includes(file.mimetype)) {
      throw new BadRequestException(
        'Formato de arquivo inválido. Use JPG ou PNG',
      );
    }

    // Validar tamanho (5MB)
    const tamanhoMaximo = 5 * 1024 * 1024; // 5MB
    if (file.size > tamanhoMaximo) {
      throw new BadRequestException(
        'Arquivo muito grande. Tamanho máximo: 5MB',
      );
    }

    // Criar pasta se não existir
    const uploadsDir = path.join(process.cwd(), 'uploads', 'profiles');
    await fs.mkdir(uploadsDir, { recursive: true });

    // Gerar nome único do arquivo
    const nomeArquivo = `${id}-${Date.now()}.jpg`;
    const caminhoCompleto = path.join(uploadsDir, nomeArquivo);

    // Processar imagem: resize para 300x300 e converter para JPG
    await sharp(file.buffer)
      .resize(300, 300, {
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: 90 })
      .toFile(caminhoCompleto);

    // Deletar foto anterior se existir
    if (usuario.fotoPerfilUrl) {
      const caminhoAntigo = path.join(process.cwd(), usuario.fotoPerfilUrl);
      try {
        await fs.unlink(caminhoAntigo);
      } catch (error) {
        // Ignorar se arquivo não existir
      }
    }

    // Atualizar URL no banco
    const fotoPerfilUrl = `/uploads/profiles/${nomeArquivo}`;
    const usuarioAtualizado = await this.prisma.usuario.update({
      where: { id },
      data: { fotoPerfilUrl },
      select: {
        id: true,
        nome: true,
        email: true,
        papelGlobal: true,
        fotoPerfilUrl: true,
        emailVerificado: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    return usuarioAtualizado;
  }
}
