import { Injectable } from '@nestjs/common';

@Injectable()
export class AuthService {
  googleLogin(req) {
    if (!req.user) {
      return 'No user found from Google';
    }
    return {
      message: 'User information',
      user: req.user,
    };
  }
}
