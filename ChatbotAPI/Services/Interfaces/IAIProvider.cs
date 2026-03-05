namespace ChatbotAPI.Services.Interfaces;

public record ChatMessage(string Role, string Content);

public interface IAIProvider
{
    Task<string> GenerateResponseAsync(IEnumerable<ChatMessage> messages, string model, CancellationToken cancellationToken = default);
    IAsyncEnumerable<string> StreamResponseAsync(IEnumerable<ChatMessage> messages, string model, CancellationToken cancellationToken = default);
}
