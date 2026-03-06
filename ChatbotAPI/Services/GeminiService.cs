using ChatbotAPI.Exceptions;
using ChatbotAPI.Services.Interfaces;
using Microsoft.SemanticKernel.ChatCompletion;

namespace ChatbotAPI.Services;

public class GeminiService : IAIProvider
{
    private readonly IChatCompletionService _chatCompletion;

    public GeminiService(IChatCompletionService chatCompletion)
    {
        _chatCompletion = chatCompletion;
    }

    public async Task<string> GenerateResponseAsync(IEnumerable<ChatMessage> messages, string model,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var history = BuildChatHistory(messages);
            var result = await _chatCompletion.GetChatMessageContentAsync(history, cancellationToken: cancellationToken);
            return result.Content ?? string.Empty;
        }
        catch (Exception ex) when (ex is not GeminiConnectionException)
        {
            var statusCode = (ex as Microsoft.SemanticKernel.HttpOperationException)?.StatusCode;
            throw new GeminiConnectionException("Failed to get response from Gemini API.", ex, statusCode);
        }
    }

    public async IAsyncEnumerable<string> StreamResponseAsync(IEnumerable<ChatMessage> messages, string model,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        ChatHistory history;
        try
        {
            history = BuildChatHistory(messages);
        }
        catch (Exception ex)
        {
            throw new GeminiConnectionException("Failed to build chat history for Gemini.", ex);
        }

        IAsyncEnumerable<Microsoft.SemanticKernel.StreamingChatMessageContent> stream;
        try
        {
            stream = _chatCompletion.GetStreamingChatMessageContentsAsync(history, cancellationToken: cancellationToken);
        }
        catch (Exception ex)
        {
            throw new GeminiConnectionException("Failed to start streaming from Gemini API.", ex);
        }

        var enumerator = stream.WithCancellation(cancellationToken).GetAsyncEnumerator();
        try
        {
            while (true)
            {
                bool hasNext;
                try
                {
                    hasNext = await enumerator.MoveNextAsync();
                }
                catch (Exception ex) when (ex is not GeminiConnectionException)
                {
                    var statusCode = (ex as Microsoft.SemanticKernel.HttpOperationException)?.StatusCode;
                    throw new GeminiConnectionException("Failed to stream response from Gemini API.", ex, statusCode);
                }
                if (!hasNext) break;
                if (!string.IsNullOrEmpty(enumerator.Current.Content))
                    yield return enumerator.Current.Content;
            }
        }
        finally
        {
            await enumerator.DisposeAsync();
        }
    }

    private static ChatHistory BuildChatHistory(IEnumerable<ChatMessage> messages)
    {
        var history = new ChatHistory();
        foreach (var msg in messages)
        {
            switch (msg.Role.ToLowerInvariant())
            {
                case "system":
                    history.AddSystemMessage(msg.Content);
                    break;
                case "user":
                    history.AddUserMessage(msg.Content);
                    break;
                case "assistant":
                    history.AddAssistantMessage(msg.Content);
                    break;
            }
        }
        return history;
    }
}
