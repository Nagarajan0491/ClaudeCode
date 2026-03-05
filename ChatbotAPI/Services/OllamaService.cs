using System.Net.Http.Json;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using ChatbotAPI.Exceptions;
using ChatbotAPI.Services.Interfaces;

namespace ChatbotAPI.Services;

public class OllamaService : IAIProvider
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<OllamaService> _logger;
    private readonly string _baseUrl;

    public OllamaService(HttpClient httpClient, IConfiguration configuration, ILogger<OllamaService> logger)
    {
        _httpClient = httpClient;
        _logger = logger;
        _baseUrl = configuration["Ollama:BaseUrl"] ?? "http://localhost:11434";
        _httpClient.BaseAddress = new Uri(_baseUrl);
        _httpClient.Timeout = TimeSpan.FromMinutes(5);
    }

    public async Task<string> GenerateResponseAsync(IEnumerable<ChatMessage> messages, string model, CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new
            {
                model,
                messages = messages.Select(m => new { role = m.Role, content = m.Content }),
                stream = false
            };
            var response = await _httpClient.PostAsJsonAsync("/api/chat", request, cancellationToken);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            var result = JsonSerializer.Deserialize<OllamaChatResponse>(content,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            return result?.Message?.Content ?? string.Empty;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to connect to Ollama at {BaseUrl}", _baseUrl);
            throw new OllamaConnectionException($"Failed to connect to Ollama: {ex.Message}", ex);
        }
        catch (TaskCanceledException ex) when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogError(ex, "Ollama request timed out");
            throw new OllamaConnectionException("Ollama request timed out", ex);
        }
    }

    public async IAsyncEnumerable<string> StreamResponseAsync(IEnumerable<ChatMessage> messages, string model,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var requestObj = new
        {
            model,
            messages = messages.Select(m => new { role = m.Role, content = m.Content }),
            stream = true
        };
        var json = JsonSerializer.Serialize(requestObj);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        HttpResponseMessage response;
        try
        {
            response = await _httpClient.PostAsync("/api/chat", content, cancellationToken);
            response.EnsureSuccessStatusCode();
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to connect to Ollama for streaming");
            throw new OllamaConnectionException($"Failed to connect to Ollama: {ex.Message}", ex);
        }

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream);

        while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync(cancellationToken);
            if (string.IsNullOrEmpty(line)) continue;

            OllamaChatStreamResponse? chunk = null;
            try
            {
                chunk = JsonSerializer.Deserialize<OllamaChatStreamResponse>(line,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch (JsonException)
            {
                continue;
            }

            if (chunk?.Message?.Content is not null)
                yield return chunk.Message.Content;

            if (chunk?.Done == true)
                break;
        }
    }

    private record OllamaMessage(string Role, string Content);
    private record OllamaChatResponse(OllamaMessage Message, bool Done);
    private record OllamaChatStreamResponse(OllamaMessage? Message, bool Done);
}
