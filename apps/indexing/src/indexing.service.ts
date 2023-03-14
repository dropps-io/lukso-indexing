import { Injectable } from '@nestjs/common';

@Injectable()
export class IndexingService {
  getHello(): string {
    return 'Hello World!';
  }
}
