namespace ChatbotAPI.Data.Models;

public class PluginRegistration
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public string EndpointUrl { get; set; } = string.Empty;
    public string HttpMethod { get; set; } = "POST";
    public string? AuthToken { get; set; }
    public string ParameterSchema { get; set; } = "{}";
    public DateTime? LastInvokedAt { get; set; }
}
