import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const config = { get: () => 'test-secret' } as any;
  const strategy = new JwtStrategy(config);

  it('accepts a token with purpose=access and maps sub/role to the request user', () => {
    const result = strategy.validate({ sub: 'user-1', role: 'user', purpose: 'access' });
    expect(result).toEqual({ id: 'user-1', role: 'user' });
  });

  it('rejects a token that is not purpose=access — e.g. a registration token reused as an access token', () => {
    expect(() =>
      strategy.validate({ sub: 'user-1', purpose: 'registration' } as any),
    ).toThrow(UnauthorizedException);
  });
});
