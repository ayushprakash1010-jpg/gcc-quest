import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '@gcc-quest/shared-types';

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If the data is already paginated (has meta), return it directly mapped
        if (data && typeof data === 'object' && 'meta' in data && 'data' in data) {
          return {
            ...data,
            timestamp: new Date().toISOString(),
          } as any;
        }

        return {
          data,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
