# Toast Notification System

This project uses a consistent toast notification system with predefined styles.

## Usage

Import the toast functions from `../utils/toast`:

```typescript
import { showSuccessToast, showWarningToast, showErrorToast, showInfoToast } from "../utils/toast";
```

## Available Functions

### Success Toast (Green)
```typescript
showSuccessToast("Operation completed successfully!");
showSuccessToast("Custom message", 5000); // Custom duration in ms
```
- **Icon**: Green checkmark circle
- **Background**: Light green (#F0FDF4)
- **Border**: Green (#86EFAC)
- **Default Duration**: 3000ms

### Warning Toast (Yellow)
```typescript
showWarningToast("Please check your settings");
showWarningToast("Custom warning", 5000); // Custom duration in ms
```
- **Icon**: Yellow triangle with exclamation
- **Background**: Light yellow (#FFFBEB)
- **Border**: Yellow (#FCD34D)
- **Default Duration**: 4000ms

### Error Toast (Red)
```typescript
showErrorToast("Failed to save changes");
showErrorToast("Custom error", 5000); // Custom duration in ms
```
- **Icon**: Red X circle
- **Background**: Light red (#FEF2F2)
- **Border**: Red (#FCA5A5)
- **Default Duration**: 4000ms

### Info Toast (Blue)
```typescript
showInfoToast("Processing your request...");
showInfoToast("Custom info", 3000); // Custom duration in ms
```
- **Icon**: Blue circle with 'i'
- **Background**: Light blue (#EFF6FF)
- **Border**: Blue (#93C5FD)
- **Default Duration**: 3000ms

## Design Features

All toasts include:
- Rounded corners (12px border radius)
- Subtle shadow for depth
- Icon on the left
- Medium font weight (500)
- 14px font size
- Consistent padding (12px 16px)
- Smooth animations

## Examples

```typescript
// Success notification
showSuccessToast("Stream URL copied to clipboard!");

// Warning notification
showWarningToast("Connection unstable, stream quality may be affected");

// Error notification
showErrorToast("Failed to start stream. Please try again.");

// Info notification
showInfoToast("Connecting to stream server...");
```

## Migration from old toast

**Before:**
```typescript
toast.success("Message", {
  duration: 3000,
  style: { ... }
});
```

**After:**
```typescript
showSuccessToast("Message");
// or with custom duration
showSuccessToast("Message", 3000);
```
