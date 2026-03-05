using Microsoft.AspNetCore.Mvc;

namespace ChatbotAPI.Controllers;

[ApiController]
[Route("api/health")]
public class HealthController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly ILogger<HealthController> _logger;

    public HealthController(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<HealthController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Check(CancellationToken cancellationToken)
    {
        var ollamaBaseUrl = _configuration["Ollama:BaseUrl"] ?? "http://localhost:11434";
        bool ollamaReachable = false;

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5);
            var response = await client.GetAsync($"{ollamaBaseUrl}/api/tags", cancellationToken);
            ollamaReachable = response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Ollama health check failed");
        }

        return Ok(new
        {
            status = ollamaReachable ? "healthy" : "degraded",
            ollamaReachable,
            timestamp = DateTime.UtcNow
        });
    }
}
