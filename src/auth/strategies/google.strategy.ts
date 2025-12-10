import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

/**
 * Perfil do usuário retornado pelo Google
 */
export interface GoogleProfile {
  id: string;
  displayName: string;
  emails: Array<{ value: string; verified: boolean }>;
  photos: Array<{ value: string }>;
}

/**
 * Strategy de autenticação Google OAuth2
 *
 * Permite login com conta Google.
 * Cria usuário automaticamente se não existir (findOrCreate pattern).
 *
 * @class GoogleStrategy
 * @extends {PassportStrategy}
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private configService: ConfigService) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') || 'dummy-client-id',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') || 'dummy-client-secret',
      callbackURL: configService.get<string>('GOOGLE_CALLBACK_URL') || 'http://localhost:3000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  /**
   * Validação do perfil do Google
   *
   * Executado após autenticação bem-sucedida com Google.
   * Retorna dados do usuário que serão processados no AuthService.
   *
   * @param {string} accessToken - Token de acesso do Google
   * @param {string} refreshToken - Token de refresh do Google
   * @param {GoogleProfile} profile - Perfil do usuário no Google
   * @param {VerifyCallback} done - Callback do Passport
   */
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, displayName, emails, photos } = profile;

    const user = {
      googleId: id,
      email: emails[0].value,
      nome: displayName,
      fotoPerfilUrl: photos[0]?.value || null,
      emailVerificado: emails[0].verified,
    };

    done(null, user);
  }
}
