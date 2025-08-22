// Google Drive API Types
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  parents?: string[];
}

export interface DriveFolder {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  parents?: string[];
  fileCount?: number;
  files?: DriveFile[];
}

export interface DriveFilesListResponse {
  files?: DriveFile[];
  nextPageToken?: string;
}

export interface GapiResponse<T> {
  result: T;
}

// Google Identity Services Types
export interface TokenResponse {
  access_token: string;
  error?: string;
}

export interface TokenClient {
  // eslint-disable-next-line no-unused-vars
  callback: ((response: TokenResponse) => void) | null;
  // eslint-disable-next-line no-unused-vars
  requestAccessToken: (options?: { prompt?: string }) => void;
}

// Application Types
export interface FileCategory {
  'Floorball Drills': DriveFile[];
  'Tactics & Strategy': DriveFile[];
  'Training Plans': DriveFile[];
  'Video Resources': DriveFile[];
  'Diagrams & Images': DriveFile[];
  Documents: DriveFile[];
  Other: DriveFile[];
}

export type CategoryName = keyof FileCategory;

export type StatusType = 'info' | 'success' | 'error' | 'loading' | 'warning';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

// GAPI types (basic)
interface Gapi {
  // eslint-disable-next-line no-unused-vars
  load: (
    // eslint-disable-next-line no-unused-vars
    api: string,
    // eslint-disable-next-line no-unused-vars
    options: { callback?: () => void; onerror?: (error: any) => void }
  ) => void;
  client: {
    // eslint-disable-next-line no-unused-vars
    init: (config: {
      apiKey: string;
      discoveryDocs?: string[];
    }) => Promise<void>;
    // eslint-disable-next-line no-unused-vars
    load: (api: string, version: string) => Promise<void>;
    getToken: () => { access_token: string } | null;
    // eslint-disable-next-line no-unused-vars
    setToken: (token: string | { access_token: string } | null) => void;
    drive: {
      files: {
        // eslint-disable-next-line no-unused-vars
        list: (params: {
          pageSize?: number;
          pageToken?: string | null;
          fields?: string;
          orderBy?: string;
          q?: string;
        }) => Promise<GapiResponse<DriveFilesListResponse>>;
      };
    };
  };
}

interface GoogleAccounts {
  accounts: {
    oauth2: {
      // eslint-disable-next-line no-unused-vars
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: string;
      }) => TokenClient;
      // eslint-disable-next-line no-unused-vars
      revoke: (token: string) => void;
    };
  };
}

// Global window extensions
declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    gapi: Gapi;
    google: GoogleAccounts;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_API_KEY?: string;
    gapiLoaded?: boolean;
    gisLoaded?: boolean;
  }

  // eslint-disable-next-line no-unused-vars
  const gapi: Gapi;
  // eslint-disable-next-line no-unused-vars
  const google: GoogleAccounts;
}
