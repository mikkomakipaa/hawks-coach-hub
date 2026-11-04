import { getStoredPlannerIdentity } from '@/services/planner-identity';
import type { PlannerApiErrorDetail, PlannerIdentityHeaders } from '@/types/planner';

type QueryValue = string | number | boolean | null | undefined;

export interface PlannerApiClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  getIdentityHeaders?: () => PlannerIdentityHeaders | null | undefined;
}

export interface PlannerRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH';
  query?: Record<string, QueryValue>;
  body?: unknown;
  headers?: Record<string, string>;
}

interface ErrorPayload {
  error?: {
    code?: string;
    message?: string;
    details?: PlannerApiErrorDetail[];
  };
}

export class PlannerApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: PlannerApiErrorDetail[];
  readonly retryable: boolean;

  constructor(status: number, code: string, message: string, details: PlannerApiErrorDetail[] = []) {
    super(message);
    this.name = 'PlannerApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryable = status >= 500;
  }
}

export class PlannerApiClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly getIdentityHeaders?: PlannerApiClientOptions['getIdentityHeaders'];

  constructor(options: PlannerApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || '';
    this.fetchImpl = options.fetchImpl || fetch;
    this.getIdentityHeaders = options.getIdentityHeaders ?? getStoredPlannerIdentity;
  }

  async request<T>(path: string, options: PlannerRequestOptions = {}): Promise<T> {
    const method = options.method || 'GET';
    const headers = new Headers({
      Accept: 'application/json',
      ...this.buildIdentityHeaders(),
      ...options.headers,
    });

    const init: RequestInit = { method, headers };

    if (options.body !== undefined) {
      headers.set('Content-Type', 'application/json');
      init.body = JSON.stringify(options.body);
    }

    const response = await this.fetchImpl(this.buildUrl(path, options.query), init);

    if (!response.ok) {
      throw await this.toApiError(response);
    }

    return response.json() as Promise<T>;
  }

  private buildUrl(path: string, query?: Record<string, QueryValue>): string {
    const url = new URL(`${this.baseUrl}${path}`, 'http://localhost');

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') {
          continue;
        }

        url.searchParams.set(key, String(value));
      }
    }

    return this.baseUrl ? `${url.pathname}${url.search}` : `${path}${url.search}`;
  }

  private buildIdentityHeaders(): Record<string, string> {
    const identity = this.getIdentityHeaders?.();
    if (!identity) {
      return {};
    }

    const headers: Record<string, string> = {
      'x-planner-user-id': identity.userId,
    };

    if (identity.email) {
      headers['x-planner-email'] = identity.email;
    }

    if (identity.role) {
      headers['x-planner-role'] = identity.role;
    }

    if (identity.displayName) {
      headers['x-planner-display-name'] = identity.displayName;
    }

    return headers;
  }

  private async toApiError(response: Response): Promise<PlannerApiError> {
    let payload: ErrorPayload | null = null;

    try {
      payload = (await response.json()) as ErrorPayload;
    } catch {
      payload = null;
    }

    const code = payload?.error?.code || 'HTTP_ERROR';
    const message = payload?.error?.message || `Request failed with status ${response.status}.`;
    const details = payload?.error?.details || [];

    return new PlannerApiError(response.status, code, message, details);
  }
}

export function isPlannerApiError(error: unknown): error is PlannerApiError {
  return error instanceof PlannerApiError;
}
