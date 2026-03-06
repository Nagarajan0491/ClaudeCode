using System.Runtime.CompilerServices;
using ChatbotAPI.Data.Models;
using ChatbotAPI.DTOs;
using ChatbotAPI.Exceptions;
using ChatbotAPI.Services.Interfaces;

namespace ChatbotAPI.Services;

public class ChatService : IChatService
{
    private readonly IAIProvider _aiProvider;
    private readonly IConversationRepository _conversationRepository;
    private readonly IMessageRepository _messageRepository;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ChatService> _logger;

    public ChatService(
        IAIProvider aiProvider,
        IConversationRepository conversationRepository,
        IMessageRepository messageRepository,
        IConfiguration configuration,
        ILogger<ChatService> logger)
    {
        _aiProvider = aiProvider;
        _conversationRepository = conversationRepository;
        _messageRepository = messageRepository;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<ChatResponse> SendMessageAsync(SendMessageRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
            throw new InvalidMessageException("Message content cannot be empty.");

        var conversation = await _conversationRepository.GetByIdAsync(request.ConversationId, cancellationToken)
            ?? throw new ConversationNotFoundException(request.ConversationId);

        // Save user message
        var userMessage = new Message
        {
            ConversationId = request.ConversationId,
            Role = "user",
            Content = request.Content,
            InputMethod = request.InputMethod,
            Timestamp = DateTime.UtcNow
        };
        await _messageRepository.AddAsync(userMessage, cancellationToken);

        // Build message list for Ollama /api/chat (cap history to last 10 messages to avoid growing slowness)
        var historyLimit = _configuration.GetValue<int>("AIProvider:HistoryLimit", 10);
        var messages = new List<ChatMessage>
        {
            new("system", "You are a helpful AI assistant. Be concise, accurate, and friendly.")
        };
        foreach (var msg in conversation.Messages.OrderBy(m => m.Timestamp).TakeLast(historyLimit))
            messages.Add(new ChatMessage(msg.Role, msg.Content));
        messages.Add(new ChatMessage("user", request.Content));

        var model = _configuration["AIProvider:DefaultModel"] ?? "phi3:mini";

        _logger.LogInformation("Sending message to model {Model} model for conversation {ConversationId}",
            model, request.ConversationId);

        var aiResponse = await _aiProvider.GenerateResponseAsync(messages, model, cancellationToken);

        // Save assistant message
        var assistantMessage = new Message
        {
            ConversationId = request.ConversationId,
            Role = "assistant",
            Content = aiResponse,
            InputMethod = "text",
            Timestamp = DateTime.UtcNow
        };
        await _messageRepository.AddAsync(assistantMessage, cancellationToken);

        // Auto-title on first message using AI
        if (!conversation.Messages.Any())
        {
            try
            {
                var titleMessages = new List<ChatMessage>
                {
                    new("system", "Generate a concise, descriptive title of 3 to 7 words for a chat conversation based on the user message and AI response provided. Return only the title text with no quotes and no trailing punctuation."),
                    new("user", $"User: {request.Content}\n\nAssistant: {aiResponse}")
                };
                var generatedTitle = await _aiProvider.GenerateResponseAsync(titleMessages, model, cancellationToken);
                generatedTitle = generatedTitle.Trim().Trim('"').TrimEnd('.').Trim();
                var finalTitle = !string.IsNullOrWhiteSpace(generatedTitle)
                    ? (generatedTitle.Length > 100 ? generatedTitle[..100] : generatedTitle)
                    : (request.Content.Length > 50 ? request.Content[..50] + "..." : request.Content);
                await _conversationRepository.UpdateTitleAsync(request.ConversationId, finalTitle, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to generate AI title for conversation {Id}, falling back to truncation", request.ConversationId);
                var title = request.Content.Length > 50 ? request.Content[..50] + "..." : request.Content;
                await _conversationRepository.UpdateTitleAsync(request.ConversationId, title, cancellationToken);
            }
        }

        return new ChatResponse
        {
            Id = assistantMessage.Id,
            ConversationId = request.ConversationId,
            Content = aiResponse,
            Role = "assistant",
            Timestamp = assistantMessage.Timestamp
        };
    }

    public async IAsyncEnumerable<string> StreamMessageAsync(int conversationId, string message,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var conversation = await _conversationRepository.GetByIdAsync(conversationId, cancellationToken)
            ?? throw new ConversationNotFoundException(conversationId);

        var historyLimit = _configuration.GetValue<int>("AIProvider:HistoryLimit", 10);
        var messages = new List<ChatMessage>
        {
            new("system", "You are a helpful AI assistant. Be concise, accurate, and friendly.")
        };
        foreach (var msg in conversation.Messages.OrderBy(m => m.Timestamp).TakeLast(historyLimit))
            messages.Add(new ChatMessage(msg.Role, msg.Content));
        messages.Add(new ChatMessage("user", message));

        var model = _configuration["AIProvider:DefaultModel"] ?? "phi3:mini";

        await foreach (var chunk in _aiProvider.StreamResponseAsync(messages, model, cancellationToken))
        {
            yield return chunk;
        }
    }

}
