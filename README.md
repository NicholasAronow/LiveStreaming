<p align="center">
  <img src="https://imagedelivery.net/nrc8B2Lk8UIoyW7fY8uHVg/ea6c9dc1-eef0-4401-6201-88259fcc9600/square" alt="Mentra Streamer" width="120" height="120" />
</p>

<h1 align="center">Livestreamer</h1>

<p align="center">
  <strong>Live streaming companion for smart glasses</strong>
</p>

<p align="center">
  Stream to your audience with real-time transcription and interactive tools.<br/>
  See your chat. Share what you see. All from your glasses.
</p>

<p align="center">
  <a href="https://apps.mentra.glass/package/com.mentra.streamer">Install from Mentra App Store</a>
</p>

---

## What It Does

Mentra Streamer turns your smart glasses into a live streaming hub. It connects your glasses to your stream, providing real-time transcription, interactive tools, and a web dashboard for managing your broadcast.

- **Live transcription** — Real-time speech-to-text displayed on your HUD
- **Web dashboard** — Control and monitor your stream from any browser
- **Interactive tools** — Trigger actions via voice commands during your stream
- **Multi-user sessions** — Supports multiple concurrent streamers

## Getting Started

### Prerequisites

1. Install MentraOS: [get.mentraglass.com](https://get.mentraglass.com)
2. Install Bun: [bun.sh](https://bun.sh/docs/installation)
3. Set up ngrok: `brew install ngrok` and create a [static URL](https://dashboard.ngrok.com/)

### Register Your App

1. Go to [console.mentra.glass](https://console.mentra.glass/)
2. Sign in and click "Create App"
3. Set a unique package name (e.g., `com.yourName.streamer`)
4. Enter your ngrok URL as "Public URL"
5. Add **microphone** permission

### Run It

```bash
# Install
git clone <repo-url>
cd Livestreamer
bun install
cp .env.example .env

# Configure .env with your credentials
# PORT, PACKAGE_NAME, MENTRAOS_API_KEY (required)

# Start
bun run dev

# Expose via ngrok
ngrok http --url=<YOUR_NGROK_URL> 3000
```

## Documentation

- [MentraOS Docs](https://docs.mentra.glass)
- [Developer Console](https://console.mentra.glass)

## License

MIT
