import { BaseService } from './base-service';
import { isAppError } from './throw-app-error';

export abstract class BaseErrorService extends BaseService {
  protected isAppErrorLike(error: Error): boolean {
    return isAppError(error); // Add other checks as needed
  }
}
