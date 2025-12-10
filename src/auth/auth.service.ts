import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegistroDto } from './dto/registro.dto';
import * as bcrypt from 'bcrypt';
import { JwtPayload } from './strategies/jwt.strategy';

/**
 * Resposta de autenticação
 */
export interface AuthResponse {
  access_token: string;
  usuario: {
    id: number;
    nome: string;
    email: string;
    papelGlobal: string;
    fotoPerfilUrl?: string | null;
  };
}

/**
 * Serviço de Autenticação
 *
 * Gerencia login, registro e geração de tokens JWT.
 *
 * @class AuthService
 *
 * @example
 * // Injetar no controller
 * constructor(private authService: AuthService) {}
 *
 * // Fazer login
 * const result = await this.authService.login(loginDto);
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Fazer login
   *
   * Valida credenciais e retorna token JWT.
   *
   * @param {LoginDto} loginDto - Credenciais de login
   * @returns {Promise<AuthResponse>} Token JWT e dados do usuário
   * @throws {UnauthorizedException} Se credenciais inválidas
   *
   * @example
   * const result = await authService.login({
   *   email: 'usuario@exemplo.com',
   *   senha: 'senha123'
   * });
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, senha } = loginDto;

    // Buscar usuário por email
    const usuario = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (!usuario) {
      this.logger.warn(`Tentativa de login com email inexistente: ${email}`);
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    // Usuários com login Google não têm senha
    if (!usuario.senhaHash) {
      this.logger.warn(`Tentativa de login com senha em conta Google: ${email}`);
      throw new UnauthorizedException('Esta conta usa login com Google');
    }

    // Validar senha
    const senhaValida = await this.comparePassword(senha, usuario.senhaHash);

    if (!senhaValida) {
      this.logger.warn(`Tentativa de login com senha incorreta: ${email}`);
      throw new UnauthorizedException('Email ou senha inválidos');
    }

    // Gerar token JWT
    const token = this.generateToken(usuario.id, usuario.email, usuario.papelGlobal);

    this.logger.log(`Login bem-sucedido: ${email}`);

    return {
      access_token: token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papelGlobal: usuario.papelGlobal,
        fotoPerfilUrl: usuario.fotoPerfilUrl,
      },
    };
  }

  /**
   * Registrar novo usuário
   *
   * Cria novo usuário com papel USUARIO por padrão.
   *
   * @param {RegistroDto} registroDto - Dados de registro
   * @returns {Promise<AuthResponse>} Token JWT e dados do usuário
   * @throws {ConflictException} Se email já cadastrado
   *
   * @example
   * const result = await authService.registro({
   *   nome: 'João Silva',
   *   email: 'joao@exemplo.com',
   *   senha: 'senha123'
   * });
   */
  async registro(registroDto: RegistroDto): Promise<AuthResponse> {
    const { nome, email, senha } = registroDto;

    // Verificar se email já existe
    const usuarioExistente = await this.prisma.usuario.findUnique({
      where: { email },
    });

    if (usuarioExistente) {
      this.logger.warn(`Tentativa de registro com email já existente: ${email}`);
      throw new ConflictException('Email já cadastrado');
    }

    // Hash da senha
    const senhaHash = await this.hashPassword(senha);

    // Criar usuário
    const usuario = await this.prisma.usuario.create({
      data: {
        nome,
        email,
        senhaHash,
        papelGlobal: 'USUARIO', // Papel padrão
      },
    });

    // Gerar token JWT
    const token = this.generateToken(usuario.id, usuario.email, usuario.papelGlobal);

    this.logger.log(`Novo usuário registrado: ${email}`);

    return {
      access_token: token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papelGlobal: usuario.papelGlobal,
        fotoPerfilUrl: usuario.fotoPerfilUrl,
      },
    };
  }

  /**
   * Gerar hash da senha
   *
   * @param {string} senha - Senha em texto plano
   * @returns {Promise<string>} Hash da senha
   * @private
   */
  private async hashPassword(senha: string): Promise<string> {
    return bcrypt.hash(senha, this.SALT_ROUNDS);
  }

  /**
   * Comparar senha com hash
   *
   * @param {string} senha - Senha em texto plano
   * @param {string} hash - Hash armazenado
   * @returns {Promise<boolean>} True se senha correta
   * @private
   */
  private async comparePassword(senha: string, hash: string): Promise<boolean> {
    return bcrypt.compare(senha, hash);
  }

  /**
   * Gerar token JWT
   *
   * @param {number} userId - ID do usuário
   * @param {string} email - Email do usuário
   * @param {string} papelGlobal - Papel global do usuário
   * @returns {string} Token JWT
   * @private
   */
  private generateToken(userId: number, email: string, papelGlobal: string): string {
    const payload: JwtPayload = {
      sub: userId,
      email,
      papelGlobal,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Login com Google OAuth2
   *
   * Implementa padrão findOrCreate:
   * - Se usuário já existe (por googleId ou email), faz login
   * - Se não existe, cria novo usuário com dados do Google
   *
   * @param {any} googleUser - Dados do usuário retornados pela GoogleStrategy
   * @returns {Promise<AuthResponse>} Token JWT e dados do usuário
   */
  async loginComGoogle(googleUser: any): Promise<AuthResponse> {
    const { googleId, email, nome, fotoPerfilUrl, emailVerificado } = googleUser;

    // Tentar encontrar usuário por googleId
    let usuario = await this.prisma.usuario.findUnique({
      where: { googleId },
    });

    // Se não encontrou por googleId, tentar por email
    if (!usuario) {
      usuario = await this.prisma.usuario.findUnique({
        where: { email },
      });

      // Se encontrou por email, vincular googleId
      if (usuario) {
        usuario = await this.prisma.usuario.update({
          where: { id: usuario.id },
          data: {
            googleId,
            emailVerificado: emailVerificado || usuario.emailVerificado,
            fotoPerfilUrl: fotoPerfilUrl || usuario.fotoPerfilUrl,
          },
        });

        this.logger.log(`Conta existente vinculada ao Google: ${email}`);
      }
    }

    // Se ainda não encontrou, criar novo usuário
    if (!usuario) {
      usuario = await this.prisma.usuario.create({
        data: {
          googleId,
          email,
          nome,
          fotoPerfilUrl,
          emailVerificado,
          senhaHash: null, // Login com Google não tem senha
        },
      });

      this.logger.log(`Nova conta criada via Google: ${email}`);
    } else {
      this.logger.log(`Login via Google: ${email}`);
    }

    // Gerar token JWT
    const token = this.generateToken(usuario.id, usuario.email, usuario.papelGlobal);

    return {
      access_token: token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        papelGlobal: usuario.papelGlobal,
        fotoPerfilUrl: usuario.fotoPerfilUrl,
      },
    };
  }

  /**
   * Validar token JWT (helper method)
   *
   * Útil para testes ou validações extras.
   *
   * @param {string} token - Token JWT
   * @returns {JwtPayload} Payload decodificado
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }
}
