import { Controller, Post, Body, HttpCode, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtGuard } from './match.guard';

@Controller('auth')
export class AuthControler {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body('name') name: string) {
    if (!name) {
      throw new Error('Name is required');
    }

    const user = await this.authService.webLoginAsync(name);
    if (!user) {
      throw new Error('User not found');
    }

    const token = await this.authService.createToken(user.id, user.name);
    if (!token) {
      throw new Error('User not found');
    }

    return { ...user, token };
  }

  @Post('user')
  @HttpCode(200)
  @UseGuards(JwtGuard)
  async getUser(@Body('name') name: string) {
    if (!name) {
      throw new Error('Name is required');
    }

    const user = this.authService.getUserByName(name);
    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
}
