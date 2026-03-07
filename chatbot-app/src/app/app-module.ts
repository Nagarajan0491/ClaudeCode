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
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatOption } from '@angular/material/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';

// Routing
import { AppRoutingModule } from './app-routing.module';

// Plugin SDK
import { ChatbotPluginModule } from 'chatbot-plugin';

// Components
import { App } from './app';
import { AdminPageComponent } from './admin/admin-page.component';
import { ChatbotComponent } from './chatbot/components/chatbot/chatbot.component';
import { ConversationListComponent } from './chatbot/components/conversation-list/conversation-list.component';
import { MessageItemComponent } from './chatbot/components/message-item/message-item.component';
import { MessageInputComponent } from './chatbot/components/message-input/message-input.component';
import { TypingIndicatorComponent } from './chatbot/components/typing-indicator/typing-indicator.component';
import { VoiceSettingsComponent } from './chatbot/components/voice-settings/voice-settings.component';
import { PluginManagementComponent } from './chatbot/components/plugin-management/plugin-management.component';
import { KnowledgeBaseManagementComponent } from './chatbot/components/knowledge-base-management/knowledge-base-management.component';

// Pipes
import { MarkdownPipe } from './chatbot/pipes/markdown.pipe';

// Interceptors
import { ErrorInterceptor } from './interceptors/error.interceptor';

// Environment
import { environment } from '../environments/environment';

@NgModule({
  declarations: [
    App,
    AdminPageComponent,
    ChatbotComponent,
    ConversationListComponent,
    MessageItemComponent,
    MessageInputComponent,
    TypingIndicatorComponent,
    VoiceSettingsComponent,
    PluginManagementComponent,
    KnowledgeBaseManagementComponent,
    MarkdownPipe
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    AppRoutingModule,
    ChatbotPluginModule.forRoot({
      apiUrl: environment.apiUrl,
      enableVoice: true,
      theme: 'inline',
      title: 'AI Assistant'
    }),
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatListModule,
    MatSnackBarModule,
    MatToolbarModule,
    MatSelectModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatTooltipModule,
    MatChipsModule,
    MatTableModule,
    MatSlideToggleModule,
    MatOption,
    MatProgressSpinner
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
  ],
  bootstrap: [App]
})
export class AppModule {}
