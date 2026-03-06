# Standalone Chatbot Widget

A framework-agnostic chatbot widget that works with **any** application:
- ✅ Angular 9+ (or any Angular version)
- ✅ React
- ✅ Vue
- ✅ Plain HTML/JavaScript
- ✅ Any other framework

## Features

- 🎨 Modern ChatGPT-inspired UI
- 💬 Floating button or inline embed
- 🎤 Voice input (Speech-to-Text)
- 🔊 Text-to-Speech
- 📱 Fully responsive
- 🚫 **Zero dependencies** - pure vanilla JavaScript
- 🔌 Works in Shadow DOM (isolated styles)

## Quick Start

### 1. Include the Script

```html
<!-- In your HTML file -->
<script src="chatbot-widget.min.js"></script>
```

### 2. Add the Widget

```html
<!-- Floating chat button (bottom-right corner) -->
<chatbot-widget 
  api-url="http://localhost:8000/api/chat"
  title="AI Assistant"
  floating="true"
  enable-voice="true">
</chatbot-widget>
```

That's it! 🎉

---

## Installation Options

### Option A: Direct Script Tag (Simplest)

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <!-- Your app content -->
  
  <!-- Chatbot widget -->
  <script src="path/to/chatbot-widget.min.js"></script>
  <chatbot-widget api-url="http://localhost:8000/api/chat"></chatbot-widget>
</body>
</html>
```

### Option B: CDN (if hosted)

```html
<script src="https://your-cdn.com/chatbot-widget.min.js"></script>
<chatbot-widget api-url="https://api.example.com/chat"></chatbot-widget>
```

### Option C: ES Module

```javascript
import './chatbot-widget.js';

// Use in your template/JSX
<chatbot-widget api-url="http://localhost:8000/api/chat"></chatbot-widget>
```

---

## Usage in Angular 9+

### Step 1: Copy the Widget File

Copy `dist/chatbot-widget.min.js` to your Angular project:
```
src/assets/js/chatbot-widget.min.js
```

### Step 2: Add Script to angular.json

```json
{
  "projects": {
    "your-app": {
      "architect": {
        "build": {
          "options": {
            "scripts": [
              "src/assets/js/chatbot-widget.min.js"
            ]
          }
        }
      }
    }
  }
}
```

### Step 3: Enable Custom Elements

In `app.module.ts`:

```typescript
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({
  // ... other config
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { }
```

### Step 4: Use in Any Component

```html
<!-- app.component.html -->
<div class="app">
  <h1>My Angular 9 App</h1>
  
  <!-- Your content -->
  <router-outlet></router-outlet>
  
  <!-- Floating chatbot -->
  <chatbot-widget 
    api-url="http://localhost:8000/api/chat"
    title="Support Bot"
    floating="true">
  </chatbot-widget>
</div>
```

### Step 5: TypeScript Declaration (Optional)

Create `src/typings.d.ts`:

```typescript
declare namespace JSX {
  interface IntrinsicElements {
    'chatbot-widget': any;
  }
}
```

---

## Configuration Attributes

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `api-url` | string | `http://localhost:8000/api/chat` | Backend API endpoint |
| `title` | string | `'AI Assistant'` | Widget header title |
| `floating` | boolean | `true` | Show as floating button or inline |
| `enable-voice` | boolean | `true` | Enable voice features |

### Examples

**Floating Bot (default)**
```html
<chatbot-widget 
  api-url="https://api.example.com/chat"
  title="Customer Support">
</chatbot-widget>
```

**Inline/Embedded Bot**
```html
<div style="width: 100%; height: 600px;">
  <chatbot-widget 
    api-url="https://api.example.com/chat"
    title="Help Desk"
    floating="false">
  </chatbot-widget>
</div>
```

**Without Voice Features**
```html
<chatbot-widget 
  api-url="https://api.example.com/chat"
  enable-voice="false">
</chatbot-widget>
```

---

## API Backend Requirements

Your backend endpoint should accept POST requests:

**Request:**
```json
{
  "message": "User's message text",
  "conversationId": "optional-conversation-id"
}
```

**Response:**
```json
{
  "response": "Bot's reply text",
  "conversationId": "conversation-id"
}
```

---

## Browser Support

- ✅ Chrome 53+ (full features)
- ✅ Firefox 63+
- ✅ Safari 10.1+
- ✅ Edge 79+
- ⚠️ IE11 (with polyfills)

**Voice features require:**
- Chrome/Edge (Web Speech API)
- Safari 14+ (limited)

---

## Advanced Usage

### Programmatic Control

```javascript
// Get widget reference
const widget = document.querySelector('chatbot-widget');

// Access methods (after custom element is defined)
widget.togglePanel();      // Open/close widget
widget.sendMessage();      // Send current message
widget.stopSpeaking();     // Stop TTS
```

### Custom Styling

The widget uses Shadow DOM, so styles are isolated. To override:

```html
<style>
  chatbot-widget {
    /* Position adjustments */
    --fab-bottom: 20px;
    --fab-right: 20px;
  }
</style>
```

### Multiple Widgets

```html
<!-- Sales bot -->
<chatbot-widget 
  id="sales-bot"
  api-url="https://api.example.com/sales"
  title="Sales Assistant">
</chatbot-widget>

<!-- Support bot -->
<chatbot-widget 
  id="support-bot"
  api-url="https://api.example.com/support"
  title="Tech Support">
</chatbot-widget>
```

---

## React Example

```jsx
import React from 'react';
import './chatbot-widget.js';

function App() {
  return (
    <div className="app">
      <h1>My React App</h1>
      
      {/* Use the web component */}
      <chatbot-widget 
        api-url="http://localhost:8000/api/chat"
        title="AI Helper"
        floating="true">
      </chatbot-widget>
    </div>
  );
}

export default App;
```

---

## Vue Example

```vue
<template>
  <div id="app">
    <h1>My Vue App</h1>
    
    <!-- Use the web component -->
    <chatbot-widget 
      api-url="http://localhost:8000/api/chat"
      title="AI Helper"
      :floating="true">
    </chatbot-widget>
  </div>
</template>

<script>
import './chatbot-widget.js';

export default {
  name: 'App'
}
</script>
```

In `main.js`:
```javascript
import Vue from 'vue';

// Ignore custom element
Vue.config.ignoredElements = ['chatbot-widget'];
```

---

## Troubleshooting

### Widget not showing
- Check browser console for errors
- Verify script is loaded: `console.log(customElements.get('chatbot-widget'))`
- Ensure API URL is correct

### CORS errors
- Configure your backend to allow CORS
- Add appropriate headers: `Access-Control-Allow-Origin`

### Voice not working
- Voice features require HTTPS (except localhost)
- Check browser support
- Allow microphone permissions

---

## Development

Build the widget:
```bash
npm install
npm run build
```

Test locally:
```bash
npm run serve
# Open http://localhost:8080/demo.html
```

---

## File Size

- **Unminified:** ~18 KB
- **Minified:** ~10 KB
- **Gzipped:** ~4 KB

Zero external dependencies! 🎉

---

## License

MIT

---

## Support

For issues, please check:
1. Browser console for errors
2. API endpoint is reachable
3. Custom elements are supported in your browser
