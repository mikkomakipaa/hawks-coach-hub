/**
 * Application configuration
 */

export const CLIENT_ID = window.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';
export const API_KEY = window.GOOGLE_API_KEY || 'YOUR_GOOGLE_API_KEY_HERE';
export const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
export const SCOPES = 'https://www.googleapis.com/auth/drive.metadata.readonly';

export const AUTO_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
export const API_LOADING_TIMEOUT = 60; // 60 attempts (30 seconds)
export const API_LOADING_INTERVAL = 500; // 500ms

export const PAGINATION_SIZE = 1000;

export const isCredentialsConfigured = (): boolean => {
  return CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE' && API_KEY !== 'YOUR_GOOGLE_API_KEY_HERE';
};

export const validateAPIKey = (apiKey: string): boolean => {
  return Boolean(apiKey && apiKey.length >= 30 && apiKey.startsWith('AIza'));
};