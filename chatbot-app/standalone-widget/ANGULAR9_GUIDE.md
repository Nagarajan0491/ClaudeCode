# Angular 9 Integration Guide for Chatbot Widget

Complete step-by-step guide for integrating the standalone chatbot widget into your Angular 9 application.

## Why This Works

This widget is built as a **Web Component** (Custom Element), which means it's framework-independent. Angular 9 fully supports Web Components, making integration seamless.

---

## Prerequisites

- Angular 9 project (works with Angular 9, 10, 11, 12+)
- Backend API endpoint for chat

---

## Installation Steps

### Step 1: Add Widget File to Your Project

Copy `chatbot-widget.min.js` to your Angular project:

```
src/
  assets/
    js/
      chatbot-widget.min.js  <-- Place file here
```

---

### Step 2: Configure angular.json

Add the script to your build configuration:

**File: `angular.json`**

```json
{
  "projects": {
    "your-app-name": {
      "architect": {
        "build": {
          "options": {
            "assets": [
              "src/favicon.ico",
              "src/assets"
            ],
            "styles": [
              "src/styles.css"
            ],
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

**Important:** Replace `"your-app-name"` with your actual project name from angular.json.

---

### Step 3: Enable Custom Elements Schema

Tell Angular to allow custom HTML elements:

**File: `src/app/app.module.ts`**

```typescript
import { BrowserModule } from '@angular/platform-browser';
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]  // <-- Add this line
})
export class AppModule { }
```

**Key change:** Add `CUSTOM_ELEMENTS_SCHEMA` to the `schemas` array.

---

### Step 4: Use the Widget in Your Template

#### Option A: Floating Widget (Recommended)

Add to your main app component:

**File: `src/app/app.component.html`**

```html
<div class="app-container">
  <!-- Your existing app content -->
  <nav>
    <a routerLink="/">Home</a>
    <a routerLink="/about">About</a>
    <a routerLink="/contact">Contact</a>
  </nav>
  
  <router-outlet></router-outlet>
  
  <!-- Chatbot Widget - Floating Button -->
  <chatbot-widget 
    api-url="http://localhost:8000/api/chat"
    title="Support Chat"
    floating="true"
    enable-voice="true">
  </chatbot-widget>
</div>
```

#### Option B: Inline/Embedded Widget

Embed in a specific page/component:

**File: `src/app/support/support.component.html`**

```html
<div class="support-page">
  <h1>Customer Support</h1>
  <p>Chat with our AI assistant</p>
  
  <div class="chat-container">
    <chatbot-widget 
      api-url="http://localhost:8000/api/chat"
      title="Live Support"
      floating="false">
    </chatbot-widget>
  </div>
</div>
```

**File: `src/app/support/support.component.css`**

```css
.support-page {
  padding: 20px;
}

.chat-container {
  height: 600px;
  margin-top: 30px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

---

### Step 5: Add TypeScript Declarations (Optional)

To avoid TypeScript errors, create a declaration file:

**File: `src/typings.d.ts`** (create new file)

```typescript
// Custom element declarations
declare namespace JSX {
  interface IntrinsicElements {
    'chatbot-widget': ChatbotWidgetAttributes;
  }
}

interface ChatbotWidgetAttributes {
  'api-url'?: string;
  'title'?: string;
  'floating'?: string | boolean;
  'enable-voice'?: string | boolean;
}
```

Then reference it in `tsconfig.app.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/app",
    "types": []
  },
  "files": [
    "src/main.ts",
    "src/polyfills.ts",
    "src/typings.d.ts"
  ],
  "include": [
    "src/**/*.d.ts"
  ]
}
```

---

## Configuration Options

| Attribute | Type | Default | Description |
|-----------|------|---------|-------------|
| `api-url` | string | `http://localhost:8000/api/chat` | Your backend chat API endpoint |
| `title` | string | `'AI Assistant'` | Chat widget header title |
| `floating` | boolean | `true` | Show as floating button (`true`) or inline (`false`) |
| `enable-voice` | boolean | `true` | Enable voice input/output features |

### Examples

**Basic Floating Bot:**
```html
<chatbot-widget api-url="https://api.myapp.com/chat"></chatbot-widget>
```

**Custom Title:**
```html
<chatbot-widget 
  api-url="https://api.myapp.com/chat"
  title="Customer Service">
</chatbot-widget>
```

**Inline Without Voice:**
```html
<div style="height: 500px;">
  <chatbot-widget 
    api-url="https://api.myapp.com/chat"
    floating="false"
    enable-voice="false">
  </chatbot-widget>
</div>
```

---

## Programmatic Control (Advanced)

Access the widget from your TypeScript component:

**File: `src/app/app.component.ts`**

```typescript
import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  
  ngOnInit() {
    // Wait for widget to be ready
    setTimeout(() => {
      const widget = document.querySelector('chatbot-widget');
      
      if (widget) {
        // Access widget methods
        console.log('Chatbot widget loaded');
        
        // Example: Open widget programmatically
        // (widget as any).togglePanel();
      }
    }, 1000);
  }
}
```

---

## Backend API Requirements

Your backend should handle POST requests:

**Endpoint:** POST `/api/chat`

**Request Body:**
```json
{
  "message": "User's message",
  "conversationId": "optional-id"
}
```

**Response:**
```json
{
  "response": "Bot's reply",
  "conversationId": "conv-123"
}
```

### Example Express.js Backend

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/chat', (req, res) => {
  const { message, conversationId } = req.body;
  
  // Your AI logic here
  const response = `You said: ${message}`;
  
  res.json({
    response: response,
    conversationId: conversationId || 'new-conversation-id'
  });
});

app.listen(8000, () => {
  console.log('Chat API running on port 8000');
});
```

---

## Running Your App

```bash
# Install dependencies (if needed)
npm install

# Serve your Angular 9 app
ng serve

# Open in browser
# http://localhost:4200
```

You should see the purple chatbot button in the bottom-right corner! 🎉

---

## Troubleshooting

### Issue: "Unrecognized element 'chatbot-widget'"

**Solution:** Make sure you added `CUSTOM_ELEMENTS_SCHEMA` to `app.module.ts`:

```typescript
schemas: [CUSTOM_ELEMENTS_SCHEMA]
```

---

### Issue: Widget not appearing

**Solutions:**

1. **Check script is loaded:** Open browser DevTools → Network tab → Look for `chatbot-widget.min.js`

2. **Check console for errors:** Open DevTools → Console tab

3. **Verify file path:** Make sure `chatbot-widget.min.js` is in `src/assets/js/`

4. **Clear build cache:**
   ```bash
   rm -rf dist/
   ng serve
   ```

---

### Issue: CORS errors when sending messages

**Solution:** Configure your backend to allow CORS:

```javascript
// Express.js example
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
```

---

### Issue: TypeScript errors about 'chatbot-widget'

**Solution:** Create `src/typings.d.ts` (see Step 5 above)

---

### Issue: Voice features not working

**Causes:**
- Voice only works in Chrome/Edge
- Requires HTTPS (except localhost)
- User must grant microphone permission

**Solution:** 
- Test in Chrome
- Click "Allow" when prompted for microphone access
- For production, use HTTPS

---

## Multiple Widgets on Same Page

You can have multiple chatbot widgets with different configurations:

```html
<!-- Sales bot -->
<chatbot-widget 
  api-url="https://api.myapp.com/sales"
  title="Sales Assistant">
</chatbot-widget>

<!-- Support bot on different page -->
<chatbot-widget 
  api-url="https://api.myapp.com/support"
  title="Tech Support">
</chatbot-widget>
```

---

## Production Build

When building for production:

```bash
ng build --prod
```

The widget will be automatically included in your production bundle.

---

## File Size Impact

Adding the chatbot widget increases your bundle size by:
- **Unminified:** ~18 KB
- **Minified:** ~10 KB
- **Gzipped:** ~4 KB

This is minimal impact for the functionality provided!

---

## Next Steps

1. ✅ Integrate widget into your Angular 9 app
2. ✅ Configure your backend API
3. ✅ Customize title and appearance
4. ✅ Test voice features
5. ✅ Deploy to production

---

## Need Help?

If you encounter issues:

1. Check browser console for errors
2. Verify your backend API is running
3. Test in Chrome (best browser support)
4. Review the demo.html example

---

## Summary Checklist

- [ ] Copy `chatbot-widget.min.js` to `src/assets/js/`
- [ ] Add script to `angular.json` → `scripts` array
- [ ] Add `CUSTOM_ELEMENTS_SCHEMA` to `app.module.ts`
- [ ] Add `<chatbot-widget>` tag to template
- [ ] Configure `api-url` attribute
- [ ] Run `ng serve` and test
- [ ] Configure backend CORS if needed

**That's it!** Your Angular 9 app now has a modern AI chatbot. 🚀
