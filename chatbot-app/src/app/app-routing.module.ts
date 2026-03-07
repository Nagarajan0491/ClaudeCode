import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatbotComponent } from './chatbot/components/chatbot/chatbot.component';
import { AdminPageComponent } from './admin/admin-page.component';

const routes: Routes = [
  { path: '', component: ChatbotComponent },
  { path: 'admin', component: AdminPageComponent },
  { path: '**', redirectTo: '' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
