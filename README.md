# Hawks Coach Hub - High-Performance Google Drive Interface

A modern, high-performance web application for Hawks Helsinki coaches to access training resources, drills, and tactical materials. Built with TypeScript, featuring **sub-5-second loading times** and intelligent caching.

## 🚀 Features

### ⚡ High Performance
- **5-second loading** (down from 30+ seconds)
- **Intelligent caching** with 5-minute TTL reduces API calls by 90%+
- **Parallel batch processing** of Google Drive API requests
- **Progressive loading indicators** with Finnish language support
- **Service account authentication** - no user login required

### 🏒 Coach-Focused Design
- **Practice session planning** - select and export training materials
- **Smart folder navigation** - hierarchy-based prioritization 
- **Coaching term filtering** - Finnish/English keywords get priority
- **Real-time search** with instant file filtering
- **Mobile-optimized** interface for field use
- **Hawks Helsinki branding** and Finnish localization

### 🔒 Enterprise Security
- **Service account authentication** - no OAuth complexity
- **Environment-based credentials** - secrets never in code
- **Read-only Google Drive access** 
- **Secure serverless deployment** on Vercel

## 🏗️ Architecture

```
Frontend (TypeScript + Vite)
    ↓
API Middleware (Vercel Serverless)
    ↓
Google Drive API (Service Account)
    ↓
Hawks Training Materials Folder
```

## 📁 Current File Structure

```
hawks-coach-hub/
├── index.html                     # Main HTML entry point
├── styles-minimal.css             # Optimized Hawks-themed CSS
├── package.json                   # Modern build toolchain
├── vite.config.ts                 # Vite build configuration
├── tsconfig.json                  # TypeScript configuration
├── vercel.json                    # Deployment configuration
│
├── api/
│   └── drive.js                   # Serverless function (Node.js)
│
├── src/
│   ├── main-service-account.ts    # Main application logic
│   ├── services/
│   │   └── drive-service-account.ts # API client
│   ├── components/
│   │   ├── file-display.ts        # File rendering
│   │   └── toast.ts               # User notifications
│   ├── types/
│   │   └── google-apis.ts         # TypeScript definitions
│   └── utils/
│       ├── dom.ts                 # DOM utilities
│       ├── search.ts              # Search functionality
│       └── config.ts              # Configuration
│
├── vite-api-proxy.js              # Development server proxy
├── PERFORMANCE.md                 # Performance documentation
└── .env.example                   # Environment template
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Google Cloud Project with Drive API enabled
- Service account with Drive access

### 1. Clone and Install
```bash
git clone https://github.com/mikkomakipaa/hawks-coach-hub.git
cd hawks-coach-hub
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
```

Edit `.env`:
```bash
# Google Service Account (JSON key content or file path)
GOOGLE_SERVICE_ACCOUNT_KEY="{\"type\":\"service_account\",...}"
# OR
GOOGLE_SERVICE_ACCOUNT_KEY_FILE="./path/to/key.json"

# Hawks folder ID (default provided)
HAWKS_FOLDER_ID="1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb"
```

### 3. Development
```bash
npm run dev
```

Visit `http://localhost:8000`

### 4. Production Deployment
```bash
npm run build
vercel deploy
```

## 🔧 Google Cloud Setup

### 1. Create Service Account
```bash
# Enable Drive API
gcloud services enable drive.googleapis.com

# Create service account
gcloud iam service-accounts create hawks-drive-reader \
    --display-name="Hawks Drive Reader"

# Create and download key
gcloud iam service-accounts keys create coach-hub-key.json \
    --iam-account=hawks-drive-reader@PROJECT_ID.iam.gserviceaccount.com
```

### 2. Share Google Drive Folder
1. Open [Hawks Training Materials Folder](https://drive.google.com/drive/folders/1ZF6AHx62MXfkgs7-xbrMxj4r9sdyKzUb)
2. Click "Share" → "Add people and groups"
3. Add service account email: `hawks-drive-reader@PROJECT_ID.iam.gserviceaccount.com`
4. Set permission to "Viewer"

## 📊 Performance Metrics

### Before Optimization
- **Load time**: 30+ seconds
- **User feedback**: None during loading
- **API calls**: 100+ sequential requests
- **Cache**: No caching system

### After Optimization  
- **Load time**: ~5 seconds (83% improvement)
- **User feedback**: Visual loading indicators with progress
- **API calls**: 60 parallel batch requests
- **Cache**: 5-minute intelligent caching (90%+ hit rate)
- **Subsequent loads**: <200ms (cached)

## 🛠️ Development Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production  
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checks
npm run test         # Run unit tests
```

## 🔒 Security & Privacy

- **Service account**: Eliminates OAuth complexity and security risks
- **Read-only access**: Cannot modify Google Drive content
- **No data storage**: All data served directly from Google Drive
- **Environment secrets**: Credentials managed via environment variables
- **CORS protection**: API restricted to authorized domains
- **No user tracking**: Privacy-focused design

## 📱 Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## 🤝 Contributing

1. Follow TypeScript strict mode
2. Use ESLint + Prettier for code formatting
3. Add tests for new functionality
4. Update performance documentation for optimizations

## 📄 License

MIT License - Customized for Hawks Helsinki coaching operations.

## 🏒 About Hawks Helsinki

Hawks Helsinki is a floorball club focused on providing quality sports experiences. This Coach Hub supports our coaching staff with fast, reliable access to training resources and tactical materials.

---

**Performance-optimized for coaching excellence** ⚡