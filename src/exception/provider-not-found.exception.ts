import { isSymbol } from '@hemjs/notions';
import { PROVIDER_NOT_FOUND_MESSAGE } from '../messages';
import { RuntimeException } from './runtime.exception';

export class ProviderNotFoundException extends RuntimeException {
  constructor(token: string | symbol) {
    token = isSymbol(token) ? token.toString() : token;
    super(PROVIDER_NOT_FOUND_MESSAGE`${token}`);
  }
}
