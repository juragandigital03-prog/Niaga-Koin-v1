import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function contextWithUser(user: { role: string } | undefined) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows access when no roles are required (public/authenticated-only route)', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(contextWithUser({ role: 'user' }))).toBe(true);
  });

  it('allows access when the user has one of the required roles', () => {
    const reflector = { getAllAndOverride: () => ['admin'] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(contextWithUser({ role: 'admin' }))).toBe(true);
  });

  it('throws ForbiddenException (403) for a non-admin hitting an admin-only route — FR-AUTH-004', () => {
    const reflector = { getAllAndOverride: () => ['admin'] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(contextWithUser({ role: 'user' }))).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when there is no authenticated user at all', () => {
    const reflector = { getAllAndOverride: () => ['admin'] } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(ForbiddenException);
  });
});
