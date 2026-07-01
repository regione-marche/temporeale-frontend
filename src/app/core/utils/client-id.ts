/*
 * SPDX-License-Identifier: EUPL-1.2
 * Copyright: 2026 Regione Marche
 */
import { ulid } from 'ulid';

const CLIENT_ID_KEY = 'temporeale_client_id';

export const getClientId = (): string => {
  let clientId = localStorage.getItem(CLIENT_ID_KEY);
  if (!clientId) {
    clientId = ulid();
    localStorage.setItem(CLIENT_ID_KEY, clientId);
  }
  return clientId;
};
