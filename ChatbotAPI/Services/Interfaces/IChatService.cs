using ChatbotAPI.DTOs;

namespace ChatbotAPI.Services.Interfaces;

public interface IChatService
{
    Task<ChatResponse> SendMessageAsync(SendMessageRequest request, CancellationToken cancellationToken = default);
    IAsyncEnumerable<string> StreamMessageAsync(int conversationId, string message, CancellationToken cancellationToken = default);
}
