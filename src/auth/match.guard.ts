import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers['token']?.toString();
    if (!token) {
      return false;
    }

    const decoded = await this.jwtService.verifyAsync(token);
    if (!decoded) {
      return false;
    }

    const user = await this.userService.getUserLogin(decoded.name);
    if (!user) {
      return false;
    }

    request.user = user;

    return true;
  }
}
