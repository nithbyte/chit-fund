import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import * as argon2 from '@node-rs/argon2';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaMock: any;
  let jwtMock: any;

  beforeEach(() => {
    prismaMock = {
      user: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
    };
    jwtMock = {
      sign: vi.fn().mockReturnValue('mock_jwt_token_durga_2026'),
    };

    authService = new AuthService(prismaMock, jwtMock);
  });

  it('should authenticate Durga with correct credentials and return JWT token', async () => {
    const password = 'Durga@Chit2026!';
    const passwordHash = await argon2.hash(password);

    prismaMock.user.findFirst.mockResolvedValue({
      id: 'mock-uuid-durga',
      username: 'durga',
      email: 'durga@durgachitfund.com',
      fullName: 'Durga Devi',
      passwordHash,
      role: 'OWNER',
      isActive: true,
      phone: '+919848011223',
    });

    const result = await authService.login({
      username: 'durga',
      password: 'Durga@Chit2026!',
    });

    expect(result).toBeDefined();
    expect(result.accessToken).toBe('mock_jwt_token_durga_2026');
    expect(result.user.username).toBe('durga');
    expect(result.user.role).toBe('OWNER');
    expect(jwtMock.sign).toHaveBeenCalledWith({
      sub: 'mock-uuid-durga',
      username: 'durga',
      role: 'OWNER',
    });
  });

  it('should throw UnauthorizedException when password is invalid', async () => {
    const passwordHash = await argon2.hash('CorrectPassword123');

    prismaMock.user.findFirst.mockResolvedValue({
      id: 'mock-uuid-durga',
      username: 'durga',
      email: 'durga@durgachitfund.com',
      fullName: 'Durga Devi',
      passwordHash,
      role: 'OWNER',
      isActive: true,
    });

    await expect(
      authService.login({
        username: 'durga',
        password: 'WrongPassword!',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when user does not exist', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);

    await expect(
      authService.login({
        username: 'nonexistent',
        password: 'SomePassword123',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
