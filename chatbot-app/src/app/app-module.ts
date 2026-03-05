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

// Components
import { App } from './app';
import { ChatbotComponent } from './chatbot/components/chatbot/chatbot.component';
import { ConversationListComponent } from './chatbot/components/conversation-list/conversation-list.component';
import { MessageItemComponent } from './chatbot/components/message-item/message-item.component';
import { MessageInputComponent } from './chatbot/components/message-input/message-input.component';
import { TypingIndicatorComponent } from './chatbot/components/typing-indicator/typing-indicator.component';

// Interceptors
import { ErrorInterceptor } from './interceptors/error.interceptor';

@NgModule({
  declarations: [
    App,
    ChatbotComponent,
    ConversationListComponent,
    MessageItemComponent,
    MessageInputComponent,
    TypingIndicatorComponent
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
    MatToolbarModule
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
  ],
  bootstrap: [App]
})
export class AppModule {}
