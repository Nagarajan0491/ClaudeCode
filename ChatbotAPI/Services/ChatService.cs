using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
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
    private readonly IPluginService _pluginService;
    private readonly IRAGService _ragService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<ChatService> _logger;

    public ChatService(
        IAIProvider aiProvider,
        IConversationRepository conversationRepository,
        IMessageRepository messageRepository,
        IPluginService pluginService,
        IRAGService ragService,
        IConfiguration configuration,
        ILogger<ChatService> logger)
    {
        _aiProvider = aiProvider;
        _conversationRepository = conversationRepository;
        _messageRepository = messageRepository;
        _pluginService = pluginService;
        _ragService = ragService;
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

        // RAG: retrieve context before building system prompt
        var ragResult = await _ragService.RetrieveContextAsync(request.Content, cancellationToken);

        // Build system prompt with plugin awareness and RAG context
        var activePlugins = (await _pluginService.GetActivePluginsAsync(cancellationToken)).ToList();
        var systemPrompt = BuildSystemPrompt(activePlugins, request.HostContext, request.HostActions, ragResult.ContextBlock);

        var historyLimit = _configuration.GetValue<int>("AIProvider:HistoryLimit", 10);
        var messages = new List<ChatMessage> { new("system", systemPrompt) };
        foreach (var msg in conversation.Messages.OrderBy(m => m.Timestamp).TakeLast(historyLimit))
            messages.Add(new ChatMessage(msg.Role, msg.Content));
        messages.Add(new ChatMessage("user", request.Content));

        var model = _configuration["AIProvider:DefaultModel"] ?? "phi3:mini";

        _logger.LogInformation("Sending message to model {Model} model for conversation {ConversationId}",
            model, request.ConversationId);

        var aiResponse = await _aiProvider.GenerateResponseAsync(messages, model, cancellationToken);

        // Auto-invoke plugin if AI signalled a plugin_call
        var pluginResult = await _pluginService.TryAutoInvokeAsync(aiResponse, cancellationToken);
        if (pluginResult != null)
        {
            messages.Add(new ChatMessage("assistant", aiResponse));
            messages.Add(new ChatMessage("user", pluginResult.Success
                ? $"Plugin result: {pluginResult.Output}"
                : $"Plugin call failed: {pluginResult.Error}. Please respond helpfully."));
            aiResponse = await _aiProvider.GenerateResponseAsync(messages, model, cancellationToken);
        }

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
            Timestamp = assistantMessage.Timestamp,
            Sources = ragResult.Sources.Count > 0 ? ragResult.Sources.ToList() : null
        };
    }

    public async IAsyncEnumerable<string> StreamMessageAsync(int conversationId, string message, string inputMethod = "text",
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(message))
            throw new InvalidMessageException("Message content cannot be empty.");

        var conversation = await _conversationRepository.GetByIdAsync(conversationId, cancellationToken)
            ?? throw new ConversationNotFoundException(conversationId);

        // Save user message
        var userMessage = new Message
        {
            ConversationId = conversationId,
            Role = "user",
            Content = message,
            InputMethod = inputMethod,
            Timestamp = DateTime.UtcNow
        };
        await _messageRepository.AddAsync(userMessage, cancellationToken);

        // RAG: retrieve context before streaming
        var ragResult = await _ragService.RetrieveContextAsync(message, cancellationToken);

        var activePlugins = (await _pluginService.GetActivePluginsAsync(cancellationToken)).ToList();
        var systemPrompt = BuildSystemPrompt(activePlugins, ragContextBlock: ragResult.ContextBlock);

        var historyLimit = _configuration.GetValue<int>("AIProvider:HistoryLimit", 10);
        var chatMessages = new List<ChatMessage> { new("system", systemPrompt) };
        foreach (var msg in conversation.Messages.OrderBy(m => m.Timestamp).TakeLast(historyLimit))
            chatMessages.Add(new ChatMessage(msg.Role, msg.Content));
        chatMessages.Add(new ChatMessage("user", message));

        var model = _configuration["AIProvider:DefaultModel"] ?? "phi3:mini";

        _logger.LogInformation("Streaming message to model {Model} for conversation {ConversationId}", model, conversationId);

        var fullResponse = new StringBuilder();
        await foreach (var chunk in _aiProvider.StreamResponseAsync(chatMessages, model, cancellationToken))
        {
            fullResponse.Append(chunk);
            yield return chunk;
        }

        // Save assistant message after all chunks are streamed
        var assistantContent = fullResponse.ToString();
        var assistantMessage = new Message
        {
            ConversationId = conversationId,
            Role = "assistant",
            Content = assistantContent,
            InputMethod = "text",
            Timestamp = DateTime.UtcNow
        };
        await _messageRepository.AddAsync(assistantMessage, cancellationToken);

        // Auto-title on first message
        if (!conversation.Messages.Any())
        {
            try
            {
                var titleMessages = new List<ChatMessage>
                {
                    new("system", "Generate a concise, descriptive title of 3 to 7 words for a chat conversation based on the user message and AI response provided. Return only the title text with no quotes and no trailing punctuation."),
                    new("user", $"User: {message}\n\nAssistant: {assistantContent}")
                };
                var generatedTitle = await _aiProvider.GenerateResponseAsync(titleMessages, model, cancellationToken);
                generatedTitle = generatedTitle.Trim().Trim('"').TrimEnd('.').Trim();
                var finalTitle = !string.IsNullOrWhiteSpace(generatedTitle)
                    ? (generatedTitle.Length > 100 ? generatedTitle[..100] : generatedTitle)
                    : (message.Length > 50 ? message[..50] + "..." : message);
                await _conversationRepository.UpdateTitleAsync(conversationId, finalTitle, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to generate AI title for conversation {Id}, falling back to truncation", conversationId);
                var title = message.Length > 50 ? message[..50] + "..." : message;
                await _conversationRepository.UpdateTitleAsync(conversationId, title, cancellationToken);
            }
        }

        // Emit sources sentinel for frontend to pick up
        if (ragResult.Sources.Count > 0)
            yield return $"[SOURCES]:{JsonSerializer.Serialize(ragResult.Sources)}";
    }

    public async IAsyncEnumerable<string> StreamSdkMessageAsync(
        SdkStreamRequest request,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Content))
            throw new InvalidMessageException("Message content cannot be empty.");

        var conversation = await _conversationRepository.GetByIdAsync(request.ConversationId, cancellationToken)
            ?? throw new ConversationNotFoundException(request.ConversationId);

        var userMessage = new Message
        {
            ConversationId = request.ConversationId,
            Role = "user",
            Content = request.Content,
            InputMethod = request.InputMethod,
            Timestamp = DateTime.UtcNow
        };
        await _messageRepository.AddAsync(userMessage, cancellationToken);

        // RAG: retrieve context before streaming
        var ragResult = await _ragService.RetrieveContextAsync(request.Content, cancellationToken);

        var activePlugins = (await _pluginService.GetActivePluginsAsync(cancellationToken)).ToList();
        var systemPrompt = BuildSystemPrompt(activePlugins, request.HostContext, request.HostActions, ragResult.ContextBlock);

        var historyLimit = _configuration.GetValue<int>("AIProvider:HistoryLimit", 10);
        var chatMessages = new List<ChatMessage> { new("system", systemPrompt) };
        foreach (var msg in conversation.Messages.OrderBy(m => m.Timestamp).TakeLast(historyLimit))
            chatMessages.Add(new ChatMessage(msg.Role, msg.Content));
        chatMessages.Add(new ChatMessage("user", request.Content));

        var model = _configuration["AIProvider:DefaultModel"] ?? "phi3:mini";

        _logger.LogInformation("SDK streaming message to model {Model} for conversation {ConversationId}", model, request.ConversationId);

        var fullResponse = new StringBuilder();
        await foreach (var chunk in _aiProvider.StreamResponseAsync(chatMessages, model, cancellationToken))
        {
            fullResponse.Append(chunk);
            yield return chunk;
        }

        var assistantContent = fullResponse.ToString();
        var assistantMessage = new Message
        {
            ConversationId = request.ConversationId,
            Role = "assistant",
            Content = assistantContent,
            InputMethod = "text",
            Timestamp = DateTime.UtcNow
        };
        await _messageRepository.AddAsync(assistantMessage, cancellationToken);

        if (!conversation.Messages.Any())
        {
            try
            {
                var titleMessages = new List<ChatMessage>
                {
                    new("system", "Generate a concise, descriptive title of 3 to 7 words for a chat conversation based on the user message and AI response provided. Return only the title text with no quotes and no trailing punctuation."),
                    new("user", $"User: {request.Content}\n\nAssistant: {assistantContent}")
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
                _logger.LogWarning(ex, "Failed to generate AI title for conversation {Id}", request.ConversationId);
                var title = request.Content.Length > 50 ? request.Content[..50] + "..." : request.Content;
                await _conversationRepository.UpdateTitleAsync(request.ConversationId, title, cancellationToken);
            }
        }

        // Emit sources sentinel for SDK frontend
        if (ragResult.Sources.Count > 0)
            yield return $"[SOURCES]:{JsonSerializer.Serialize(ragResult.Sources)}";
    }

    private static string BuildSystemPrompt(
        List<PluginRegistration> activePlugins,
        Dictionary<string, string>? hostContext = null,
        List<HostActionDescriptor>? hostActions = null,
        string? ragContextBlock = null)
    {
        var sb = new StringBuilder("You are a helpful AI assistant. Be concise, accurate, and friendly.");

        if (!string.IsNullOrWhiteSpace(ragContextBlock))
        {
            sb.AppendLine();
            sb.AppendLine();
            sb.Append(ragContextBlock.TrimEnd());
            sb.AppendLine();
            sb.Append("Use the above knowledge base context to answer accurately when relevant. If the context doesn't cover the question, answer from your general knowledge.");
        }

        if (hostContext is { Count: > 0 })
        {
            sb.AppendLine("\n\nCurrent context provided by the host application:");
            foreach (var (k, v) in hostContext)
                sb.AppendLine($"  {k} = {v}");
            sb.Append("Use this context to give personalised, relevant answers.");
        }

        if (hostActions is { Count: > 0 })
        {
            sb.AppendLine("\n\nYou have access to the following host actions (run in the user's browser):");
            foreach (var a in hostActions)
                sb.AppendLine($"- {a.Name}: {a.Description} (params schema: {a.ParameterSchema})");
            sb.AppendLine("\nIf a host action is needed, respond ONLY with this JSON (no other text):");
            sb.Append("{\"action_call\": {\"name\": \"<name>\", \"parameters\": {<params>}}}");
            sb.AppendLine("\nOtherwise respond normally.");
        }

        if (activePlugins.Count > 0)
        {
            sb.AppendLine();
            sb.AppendLine();
            sb.AppendLine("You have access to the following plugins:");
            foreach (var p in activePlugins)
                sb.AppendLine($"- {p.Name}: {p.Description} (params schema: {p.ParameterSchema})");
            sb.AppendLine();
            sb.Append("If the user's request clearly requires a plugin, respond ONLY with this JSON (no other text): ");
            sb.Append("{\"plugin_call\": {\"name\": \"<name>\", \"parameters\": {<params>}}}");
            sb.AppendLine();
            sb.Append("Otherwise respond normally.");
        }

        return sb.ToString();
    }
}
