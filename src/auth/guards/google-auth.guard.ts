import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard para autenticação com Google OAuth2
 *
 * Redireciona usuário para tela de login do Google.
 * Usa a GoogleStrategy automaticamente.
 *
 * @example
 * @Get('google')
 * @UseGuards(GoogleAuthGuard)
 * async googleLogin() {
 *   // Redireciona para Google
 * }
 */
@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {}
