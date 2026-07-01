/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { HttpInterceptorFn } from '@angular/common/http';
import { getClientId } from '../utils/client-id';

export const clientIdInterceptor: HttpInterceptorFn = (req, next) => {
  const clientId = getClientId();
  
  const modifiedReq = req.clone({
    setHeaders: {
      'X-Client-Id': clientId
    }
  });
  
  return next(modifiedReq);
};
