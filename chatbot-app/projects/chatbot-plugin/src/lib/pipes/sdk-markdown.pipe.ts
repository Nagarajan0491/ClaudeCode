import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Pipe({
  name: 'sdkMarkdown',
  standalone: false
})
export class SdkMarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    if (!value) return '';
    const html = marked.parse(value) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
