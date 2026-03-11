/**
 * Sample Integration: Using Chatbot Plugin in Your Angular Application
 * 
 * This file shows a complete example of integrating the chatbot plugin
 * into a new Angular application.
 */

// ============================================================================
// 1. app.module.ts (or app.config.ts for standalone)
// ============================================================================

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ChatbotPluginModule } from 'chatbot-plugin';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    ChatbotPluginModule.forRoot({   // forRoot() is required — provides all plugin services
      apiUrl: 'http://localhost:5112',
      enableVoice: true,
      enableHistory: true,  // Enable conversation history for logged-in users
      title: 'AI Assistant'
    })
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }


// ============================================================================
// 2. app.component.ts
// ============================================================================

import { Component, OnInit } from '@angular/core';
import { ActionRegistryService } from 'chatbot-plugin';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'My Application';

  constructor(private actionRegistry: ActionRegistryService) {}

  ngOnInit() {
    // Register custom actions that the chatbot can call
    this.registerChatbotActions();
  }

  private registerChatbotActions() {
    // Example: Get user information
    this.actionRegistry.register({
      actionId: 'get-user-info',
      handler: async () => {
        // Return user data from your application
        return {
          name: 'John Doe',
          email: 'john@example.com',
          accountType: 'Premium',
          memberSince: '2024-01-15'
        };
      }
    });

    // Example: Get current page context
    this.actionRegistry.register({
      actionId: 'get-page-context',
      handler: async () => {
        return {
          page: window.location.pathname,
          title: document.title
        };
      }
    });

    // Example: Perform an action in your app
    this.actionRegistry.register({
      actionId: 'navigate-to-support',
      handler: async () => {
        // Navigate to support page
        window.location.href = '/support';
        return { success: true, message: 'Navigating to support...' };
      }
    });
  }
}


// ============================================================================
// 3. app.component.html
// ============================================================================

/*
<div class="app-container">
  <header>
    <h1>{{ title }}</h1>
    <nav>
      <a href="/">Home</a>
      <a href="/about">About</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>

  <main>
    <router-outlet></router-outlet>
  </main>

  <footer>
    <p>&copy; 2026 My Application</p>
  </footer>

  <!-- Floating Chatbot Widget -->
  <chatbot-widget 
    [isFloating]="true"
    [title]="'AI Assistant'">
  </chatbot-widget>
</div>
*/


// ============================================================================
// 4. index.html (Add Material Icons)
// ============================================================================

/*
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>My Application</title>
  <base href="/">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  
  <!-- Material Icons (Required) -->
  <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
</head>
<body>
  <app-root></app-root>
</body>
</html>
*/


// ============================================================================
// 5. styles.css (Global Styles)
// ============================================================================

/*
@import '@angular/material/prebuilt-themes/indigo-pink.css';

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  background: #f5f5f5;
}

.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

header {
  background: white;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

main {
  flex: 1;
  padding: 20px;
}

footer {
  background: #333;
  color: white;
  text-align: center;
  padding: 20px;
}
*/


// ============================================================================
// 6. INLINE USAGE EXAMPLE (in a specific component/page)
// ============================================================================

/*
// support.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-support',
  template: `
    <div class="support-page">
      <h2>Customer Support</h2>
      <p>Chat with our AI assistant for instant help</p>
      
      <div class="chat-wrapper">
        <chatbot-widget 
          [isFloating]="false"
          [title]="'Support Chat'">
        </chatbot-widget>
      </div>
    </div>
  `,
  styles: [`
    .support-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    
    .chat-wrapper {
      margin-top: 30px;
      height: 600px;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
  `]
})
export class SupportComponent {}
*/


// ============================================================================
// 7. BACKEND API EXAMPLE (Expected Format)
// ============================================================================

/**
 * Your backend should have an endpoint like:
 * POST /api/chat
 * 
 * Request Body:
 * {
 *   "message": "User's message text",
 *   "conversationId": "optional-conversation-id"
 * }
 * 
 * Response:
 * {
 *   "response": "Bot's reply",
 *   "conversationId": "conv-123"
 * }
 * 
 * For streaming responses, use Server-Sent Events (SSE)
 */


// ============================================================================
// 8. INSTALLATION COMMANDS
// ============================================================================

/**
 * In your target application directory:
 * 
 * # Option 1: Install from built plugin
 * npm install /path/to/chatbot-app/dist/chatbot-plugin
 * 
 * # Option 2: Link for development
 * cd /path/to/chatbot-app/dist/chatbot-plugin
 * npm link
 * 
 * cd /path/to/your-app
 * npm link chatbot-plugin
 * 
 * # Install peer dependencies if needed
 * npm install @angular/material @angular/cdk @angular/forms
 */
