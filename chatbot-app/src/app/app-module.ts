import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Angular Material
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatOption } from '@angular/material/core';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

// Chatbot Plugin
import { ChatbotPluginModule, PLUGIN_CONFIG, PluginConfig } from 'chatbot-plugin'; // Adjust the import path as needed for naga reference

// Components
import { App } from './app';
import { ChatbotComponent } from './chatbot/components/chatbot/chatbot.component';
import { ConversationListComponent } from './chatbot/components/conversation-list/conversation-list.component';
import { MessageItemComponent } from './chatbot/components/message-item/message-item.component';
import { MessageInputComponent } from './chatbot/components/message-input/message-input.component';
import { TypingIndicatorComponent } from './chatbot/components/typing-indicator/typing-indicator.component';
import { VoiceSettingsComponent } from './chatbot/components/voice-settings/voice-settings.component';
import { PluginManagementComponent } from './chatbot/components/plugin-management/plugin-management.component';

// Interceptors
import { ErrorInterceptor } from './interceptors/error.interceptor';

// Environment
import { environment } from '../environments/environment'; // Adjust the import path as needed for naga reference

@NgModule({
  declarations: [
    App,
    ChatbotComponent,
    ConversationListComponent,
    MessageItemComponent,
    MessageInputComponent,
    TypingIndicatorComponent,
    VoiceSettingsComponent,
    PluginManagementComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule,
    MatChipsModule,
    MatOption,
    MatSlideToggle,
    MatProgressSpinner,
    ChatbotPluginModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
    {
      provide: PLUGIN_CONFIG,
      useValue: {
        apiUrl: environment.apiUrl,
        enableVoice: true,
        theme: 'floating',
        title: 'AI Assistant'
      } as PluginConfig
    }
  ],
  bootstrap: [App]
})
export class AppModule {}
