import { BaseService2 } from './base-service-2';
import { isAppError } from './throw-app-error';

export abstract class BaseErrorService extends BaseService2 {
  protected isAppErrorLike(error: Error): boolean {
    return isAppError(error); // Add other checks as needed
  }
}
