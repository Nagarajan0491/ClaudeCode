import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';

import { ChatbotWidgetComponent } from './components/chatbot-widget/chatbot-widget.component';
import { SdkMessageItemComponent } from './components/sdk-message-item/sdk-message-item.component';
import { SdkMessageInputComponent } from './components/sdk-message-input/sdk-message-input.component';
import { SdkTypingIndicatorComponent } from './components/sdk-typing-indicator/sdk-typing-indicator.component';

import { ActionRegistryService } from './services/action-registry.service';
import { SdkConversationService } from './services/sdk-conversation.service';
import { SdkChatService } from './services/sdk-chat.service';
import { SdkVoiceService } from './services/sdk-voice.service';

import { SdkMarkdownPipe } from './pipes/sdk-markdown.pipe';
import { PLUGIN_CONFIG } from './tokens/plugin-config.token';
import { PluginConfig } from './models/plugin-config.interface';

@NgModule({
  declarations: [
    ChatbotWidgetComponent,
    SdkMessageItemComponent,
    SdkMessageInputComponent,
    SdkTypingIndicatorComponent,
    SdkMarkdownPipe
  ],
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatSlideToggleModule,
    MatSelectModule
  ],
  exports: [ChatbotWidgetComponent]
})
export class ChatbotPluginModule {
  static forRoot(config: PluginConfig): ModuleWithProviders<ChatbotPluginModule> {
    return {
      ngModule: ChatbotPluginModule,
      providers: [
        { provide: PLUGIN_CONFIG, useValue: config },
        ActionRegistryService,
        SdkConversationService,
        SdkChatService,
        SdkVoiceService
      ]
    };
  }
}
