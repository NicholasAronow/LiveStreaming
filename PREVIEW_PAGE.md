# Stream Preview Page

A simple, shareable page to preview live streams in an iframe.

## How It Works

1. **User starts a stream** in the app (e.g., Stream Here platform)
2. **Preview URL becomes available** (HLS/WebRTC URL from Cloudflare)
3. **User clicks "Share" button** - this generates a shareable preview link
4. **Link is copied to clipboard** in the format: `/main/streampage/preview?url=ENCODED_PREVIEW_URL`
5. **Anyone with the link** can view the stream in a clean, minimal interface

## Usage

### For App Users (Automatic)

When streaming, simply click the **"Share"** button in the Stream Platform Hub. This will:
- Generate a shareable preview link automatically
- Copy it to your clipboard
- Show a success notification

Then share that link with anyone you want to watch your stream!

### Manual URL Format

You can also manually create preview links:

```
/main/streampage/preview?url=YOUR_STREAM_URL
```

**Example:**
```
https://webview.ngrok.dev/main/streampage/preview?url=https%3A%2F%2Fexample.com%2Fstream.m3u8
```

### URL Encoding

The stream URL **must be URL-encoded**. For example:
- Original URL: `https://example.com/stream.m3u8`
- Encoded URL: `https%3A%2F%2Fexample.com%2Fstream.m3u8`

JavaScript: `encodeURIComponent('https://example.com/stream.m3u8')`

## Features

- **Clean, minimal interface** - No distractions, just the stream
- **Live indicator badge** - Shows streaming status
- **Full-screen support** - Click to go fullscreen
- **Responsive design** - Works on mobile and desktop
- **Error handling** - Shows helpful messages for invalid URLs
- **Works with any embeddable URL**:
  - HLS streams (.m3u8)
  - DASH streams (.mpd)
  - WebRTC preview URLs
  - YouTube embed URLs
  - Twitch embed URLs
  - Any iframe-compatible stream

## Error States

The preview page handles three error states:

1. **No URL provided** - Shows message: "No Stream URL Provided"
2. **Invalid URL format** - Shows message: "Invalid Stream URL" (URL must start with http:// or https://)
3. **Failed to load stream** - Shows message: "Failed to Load Stream" (stream unavailable, embedding disabled, etc.)

## Example URLs to Test

### YouTube Video
```
/main/streampage/preview?url=https%3A%2F%2Fwww.youtube.com%2Fembed%2FdQw4w9WgXcQ
```

### Twitch Stream
```
/main/streampage/preview?url=https%3A%2F%2Fplayer.twitch.tv%2F%3Fchannel%3DUSERNAME%26parent%3Dlocalhost
```

### HLS Stream
```
/main/streampage/preview?url=https%3A%2F%2Fexample.com%2Fstream.m3u8
```

## Integration with Stream Platform Hub

The Share button in [StreamPlatformHub.tsx](src/frontend/src/pages/StreamPlatformHub.tsx:320) automatically:

1. Takes the current `previewUrl` (from Cloudflare managed stream)
2. URL-encodes it
3. Appends it to `/main/streampage/preview?url=`
4. Copies the full shareable link to clipboard

**Code snippet:**
```typescript
const encodedUrl = encodeURIComponent(previewUrl);
const baseUrl = window.location.origin;
const shareableLink = `${baseUrl}/main/streampage/preview?url=${encodedUrl}`;
```
