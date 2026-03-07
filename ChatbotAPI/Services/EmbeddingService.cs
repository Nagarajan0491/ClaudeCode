using System.Net.Http.Json;
using System.Text.Json;
using ChatbotAPI.Exceptions;
using ChatbotAPI.Services.Interfaces;

namespace ChatbotAPI.Services;

public class EmbeddingService : IEmbeddingService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<EmbeddingService> _logger;
    private readonly string? _apiKey;
    private readonly string _model;
    private readonly string _baseUrl;

    public EmbeddingService(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<EmbeddingService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _apiKey = configuration["Gemini:ApiKey"];
        _model = configuration["Gemini:EmbeddingModel"] ?? "text-embedding-005";
        var apiVersion = configuration["Gemini:EmbeddingApiVersion"] ?? "v1";
        _baseUrl = $"https://generativelanguage.googleapis.com/{apiVersion}";
    }

    public async Task<float[]> GenerateEmbeddingAsync(string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
            throw new EmbeddingException(
                "Embedding service is not configured. Set the GEMINI_API_KEY environment variable to enable RAG.");

        try
        {
            var client = _httpClientFactory.CreateClient();
            var url = $"{_baseUrl}/models/{_model}:embedContent?key={_apiKey}";

            var requestBody = new
            {
                model = $"models/{_model}",
                content = new { parts = new[] { new { text } } },
                outputDimensionality = 768
            };

            var response = await client.PostAsJsonAsync(url, requestBody, ct);
            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _logger.LogError("Gemini embedding API {Status}: {Body}", (int)response.StatusCode, errorBody);
            }
            response.EnsureSuccessStatusCode();

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
            var values = json.GetProperty("embedding").GetProperty("values");
            return values.EnumerateArray().Select(v => v.GetSingle()).ToArray();
        }
        catch (EmbeddingException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate embedding for text of length {Length}", text.Length);
            throw new EmbeddingException($"Failed to generate embedding: {ex.Message}", ex);
        }
    }
}
