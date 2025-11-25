# React Frontend for LiveStream

This directory contains the React-based frontend for the LiveStream application, which replaces the EJS webview with a modern React implementation.

## Project Structure

```
src/frontend/
├── src/
│   ├── components/          # React components
│   │   ├── StatusBar.tsx    # Status indicator and battery display
│   │   ├── PlatformSelector.tsx  # Platform selection buttons
│   │   ├── StreamConfig.tsx # Stream configuration inputs
│   │   ├── VideoDisplay.tsx # Video preview container
│   │   └── StatusLogs.tsx   # Stream status logs
│   ├── hooks/
│   │   └── useStreamStatus.ts  # SSE hook for real-time updates
│   ├── types/
│   │   └── index.ts         # TypeScript type definitions
│   ├── App.tsx              # Main application component
│   ├── main.tsx             # Application entry point
│   └── utils.ts             # Utility functions
├── index.html               # HTML template
├── package.json             # Dependencies
├── vite.config.ts          # Vite configuration
└── tsconfig.json           # TypeScript configuration

## Setup

### 1. Install Dependencies

```bash
cd src/frontend
npm install
# or
bun install
```

### 2. Development Mode

Run the development server with hot module replacement:

```bash
npm run dev
# or
bun run dev
```

The dev server will run on `http://localhost:5173` and proxy API requests to `http://localhost:3000`.

### 3. Build for Production

Build the React app for production:

```bash
npm run build
# or
bun run build
```

This will generate optimized files in `../../public/react/` directory.

## Usage

### Development Workflow

1. **Start the backend server** (in the root directory):
   ```bash
   bun run dev
   ```

2. **Start the React dev server** (in this directory):
   ```bash
   cd src/frontend
   npm run dev
   ```

3. Access the React webview at: `http://localhost:5173`

### Production Workflow

1. **Build the React app**:
   ```bash
   cd src/frontend
   npm run build
   ```

2. **Start the backend server** (in the root directory):
   ```bash
   bun start
   ```

3. Access the React webview at: `http://localhost:3000/webview-react`

## Routes

- **EJS Version (Original)**: `/webview` - Uses the EJS template
- **React Version (New)**: `/webview-react` - Uses the React SPA

Both versions connect to the same backend APIs and SSE endpoints.

## Features

### Components

- **StatusBar**: Displays stream status, battery level, and play/stop button
- **PlatformSelector**: Platform selection (Here, YouTube, Twitch, Instagram, Other)
- **StreamConfig**: Configuration inputs for stream keys and RTMP URLs
- **VideoDisplay**: Shows stream preview for managed streams
- **StatusLogs**: Displays real-time logs for unmanaged streams

### Real-time Updates

The app uses Server-Sent Events (SSE) via the `useStreamStatus` hook to receive:
- Stream status updates
- Battery level changes
- Error notifications
- Session state changes

### Stream Types

- **Managed Streaming**: Cloudflare-managed streams with HLS/DASH output
- **Unmanaged Streaming**: Direct RTMP streaming to external platforms

## API Endpoints Used

- `GET /stream-status` - SSE endpoint for real-time updates
- `POST /api/stream/managed/start` - Start managed stream
- `POST /api/stream/managed/stop` - Stop managed stream
- `POST /api/stream/unmanaged/start` - Start unmanaged RTMP stream
- `POST /api/stream/unmanaged/stop` - Stop unmanaged RTMP stream
- `GET /api/stream/check` - Check for existing streams

## Styling

The React app reuses the existing CSS from `public/css/style.css` to maintain consistent styling with the EJS version.

## TypeScript

All components are written in TypeScript with strict type checking enabled. Type definitions are located in `src/types/index.ts`.

## Migration Notes

The React version maintains feature parity with the EJS version:
- ✅ All platform configurations
- ✅ Stream key management with show/hide toggle
- ✅ Real-time status updates via SSE
- ✅ Battery indicator
- ✅ Stream preview for managed streams
- ✅ Status logs for unmanaged streams
- ✅ Error handling and user feedback

The original EJS webview remains unchanged and functional at `/webview`.
