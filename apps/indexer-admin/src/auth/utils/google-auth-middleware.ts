import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { isEmail } from '@nestjs/class-validator';

@Injectable()
export class GoogleAuthMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const access_token = req.headers.accessToken;
    try {
      if (access_token === null) {
        throw new Error('Access token not provided.');
      }
      const response: any = await axios.get(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${access_token}`,
      );

      const email = response.data.email;

      if (isEmail(email) && email.endsWith('@dropps.io')) {
        // If the email is valid (from dropps)
        next();
      } else {
        throw new Error('Invalid email.');
      }
    } catch (error) {
      res.status(401).json({ message: 'Unauthorized', error: (error as Error).message });
    }
  }
}
