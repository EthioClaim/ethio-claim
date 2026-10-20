import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';
export function Roles(...roles: string[]) {
  return (target: any, key?: any, descriptor?: any) => {
    Reflect.defineMetadata(ROLES_KEY, roles, descriptor ? descriptor.value : target);
    return descriptor || target;
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
    if (!requiredRoles || requiredRoles.length === 0) return true;
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) throw new ForbiddenException('Access denied');
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(`Role ${user.role} is not allowed. Required: ${requiredRoles.join(', ')}`);
    }
    return true;
  }
}
