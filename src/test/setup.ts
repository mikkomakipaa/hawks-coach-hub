import { vi } from 'vitest'

// Mock Google APIs
const mockGapi = {
  load: vi.fn((_api: string, options: any) => {
    if (options?.callback) options.callback()
  }),
  client: {
    init: vi.fn().mockResolvedValue(undefined),
    load: vi.fn().mockResolvedValue(undefined),
    getToken: vi.fn().mockReturnValue(null),
    setToken: vi.fn(),
    drive: {
      files: {
        list: vi.fn().mockResolvedValue({
          result: {
            files: [],
            nextPageToken: null
          }
        })
      }
    }
  }
}

const mockGoogle = {
  accounts: {
    oauth2: {
      initTokenClient: vi.fn().mockReturnValue({
        callback: null,
        requestAccessToken: vi.fn()
      }),
      revoke: vi.fn()
    }
  }
}

// Add to global scope
Object.defineProperty(window, 'gapi', {
  value: mockGapi,
  writable: true
})

Object.defineProperty(window, 'google', {
  value: mockGoogle,
  writable: true
})

// Mock DOM APIs
Object.defineProperty(window, 'requestAnimationFrame', {
  value: vi.fn((cb: FrameRequestCallback) => setTimeout(cb, 16)),
  writable: true
})

// Suppress console.log in tests unless explicitly testing logging
const originalLog = console.log
console.log = vi.fn((...args) => {
  if (process.env.VITEST_LOG === 'true') {
    originalLog(...args)
  }
})