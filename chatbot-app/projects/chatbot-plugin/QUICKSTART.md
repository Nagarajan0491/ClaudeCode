# Quick Start Guide: Using Chatbot Plugin in Another Application

## Step 1: Build the Plugin

From the chatbot-app project root:

```bash
ng build chatbot-plugin
```

✅ **Output**: `dist/chatbot-plugin/`

---

## Step 2: Install in Your Application

### Method A: Local Link (Development)

```bash
# In chatbot-app directory
cd dist/chatbot-plugin
npm link

# In your target application directory
cd /path/to/your-app
npm link chatbot-plugin
```

### Method B: Direct File Install

```bash
# In your target application
npm install /path/to/chatbot-app/dist/chatbot-plugin
```

### Method C: Create Tarball

```bash
# In chatbot-app/dist/chatbot-plugin
npm pack
# Creates: chatbot-plugin-0.1.0.tgz

# In your target application
npm install /path/to/chatbot-plugin-0.1.0.tgz
```

---

## Step 3: Configure Your Application

### 3.1 Install Peer Dependencies (if not already installed)

```bash
npm install @angular/material @angular/cdk @angular/forms
```

### 3.2 Add Angular Material Theme

In your `styles.css`:

```css
@import '@angular/material/prebuilt-themes/indigo-pink.css';
```

### 3.3 Import Material Icons

In your `index.html` (inside `<head>`):

```html
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
```

---

## Step 4: Configure Module

### Option A: Standalone Component (Angular 14+)

```typescript
// app.config.ts or main.ts
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { ChatbotPluginModule, PLUGIN_CONFIG } from 'chatbot-plugin';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    provideHttpClient(),
    importProvidersFrom(ChatbotPluginModule),
    {
      provide: PLUGIN_CONFIG,
      useValue: {
        apiUrl: 'http://localhost:8000/api/chat',
        enableVoice: true,
        title: 'AI Assistant'
      }
    }
  ]
};
```

### Option B: NgModule (Traditional)

```typescript
// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { ChatbotPluginModule, PLUGIN_CONFIG } from 'chatbot-plugin';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ChatbotPluginModule
  ],
  providers: [
    {
      provide: PLUGIN_CONFIG,
      useValue: {
        apiUrl: 'http://localhost:8000/api/chat',
        enableVoice: true,
        title: 'Support Bot'
      }
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
```

---

## Step 5: Add Widget to Your Template

### Floating Widget (Recommended)

```html
<!-- app.component.html -->
<div class="app">
  <h1>My Application</h1>
  
  <!-- Your app content -->
  <router-outlet></router-outlet>
  
  <!-- Floating chatbot button -->
  <chatbot-widget 
    [isFloating]="true"
    [title]="'AI Assistant'">
  </chatbot-widget>
</div>
```

### Inline Widget

```html
<!-- support.component.html -->
<div class="support-page">
  <h2>Customer Support</h2>
  
  <div class="chat-container" style="height: 600px;">
    <chatbot-widget 
      [isFloating]="false"
      [title]="'Live Support'">
    </chatbot-widget>
  </div>
</div>
```

---

## Step 6: Run Your Application

```bash
npm start
# or
ng serve
```

Visit `http://localhost:4200` and you should see:
- A **floating purple gradient button** (bottom-right corner)
- Click it to open the chat widget
- Modern UI with message bubbles, voice controls, and more!

---

## Troubleshooting

### "Cannot find module 'chatbot-plugin'"

**Solution**: Make sure you linked/installed correctly
```bash
npm link chatbot-plugin
# or
npm install
```

### Material Icons Not Showing

**Solution**: Add to `index.html`:
```html
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
```

### No Animations

**Solution**: Import BrowserAnimationsModule:
```typescript
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
```

### Peer Dependency Warnings

**Solution**: Install required versions:
```bash
npm install @angular/material@^21.0.0 @angular/cdk@^21.0.0
```

---

## Advanced: Custom Actions

```typescript
// app.component.ts
import { Component, OnInit } from '@angular/core';
import { ActionRegistryService } from 'chatbot-plugin';

@Component({
  selector: 'app-root',
  template: `
    <chatbot-widget [isFloating]="true"></chatbot-widget>
  `
})
export class AppComponent implements OnInit {
  constructor(private actionRegistry: ActionRegistryService) {}

  ngOnInit() {
    // Register custom action for the bot to call
    this.actionRegistry.register({
      actionId: 'getUserData',
      handler: async () => {
        return {
          name: 'John Doe',
          email: 'john@example.com',
          plan: 'Premium'
        };
      }
    });
  }
}
```

---

## Next Steps

1. ✅ Configure your backend API endpoint
2. ✅ Customize colors and styling (optional)
3. ✅ Test voice features in Chrome/Edge
4. ✅ Deploy your application

For more details, see the full [README.md](README.md)
