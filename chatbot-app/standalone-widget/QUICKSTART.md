# 🚀 Quick Start - Using Chatbot Widget in Angular 9

## 3-Minute Setup

### 1. Copy the Widget File

Copy this file to your Angular 9 project:
```
dist/chatbot-widget.min.js
→
your-angular-9-app/src/assets/js/chatbot-widget.min.js
```

### 2. Edit angular.json

```json
"scripts": [
  "src/assets/js/chatbot-widget.min.js"
]
```

### 3. Edit app.module.ts

```typescript
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

@NgModule({
  // ...
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
```

### 4. Use in Any Template

```html
<chatbot-widget 
  api-url="http://localhost:8000/api/chat"
  title="AI Assistant">
</chatbot-widget>
```

### 5. Run Your App

```bash
ng serve
```

**Done!** 🎉 You'll see a purple chatbot button in the bottom-right corner.

---

## Files

- **dist/chatbot-widget.min.js** - Production-ready (18 KB)
- **dist/chatbot-widget.js** - Unminified for debugging (22 KB)
- **demo.html** - Live demo
- **ANGULAR9_GUIDE.md** - Complete integration guide
- **README.md** - Full documentation

---

## Widget Attributes

```html
<!-- All attributes are optional -->
<chatbot-widget 
  api-url="http://localhost:8000/api/chat"  <!-- Your API -->
  title="Support Bot"                        <!-- Title -->
  floating="true"                            <!-- floating or inline -->
  enable-voice="true">                       <!-- Voice features -->
</chatbot-widget>
```

---

## Test Locally

```bash
# View demo
cd standalone-widget
npm run serve
# Open: http://localhost:8080/demo.html
```

---

## Production Ready

✅ Zero dependencies  
✅ Works with Angular 9+, React, Vue, or vanilla JS  
✅ Modern ChatGPT-style UI  
✅ Voice input & text-to-speech  
✅ Only 18 KB minified  
✅ Shadow DOM (isolated styles)  

---

## Need Help?

See **ANGULAR9_GUIDE.md** for detailed setup and troubleshooting.
