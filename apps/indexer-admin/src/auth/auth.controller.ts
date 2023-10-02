import { ApiTags } from '@nestjs/swagger';
import { Controller } from '@nestjs/common';

import { AuthService } from './auth.service';

@ApiTags('contractInterfaces')
@Controller('contractInterfaces')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
