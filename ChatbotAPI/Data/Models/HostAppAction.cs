namespace ChatbotAPI.Data.Models;

public class HostAppAction
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string EndpointUrl { get; set; } = string.Empty;
    public string HttpMethod { get; set; } = "GET";
    public string ParameterSchema { get; set; } = "{}";
    public string? ResponseSchema { get; set; }
    public string? AuthType { get; set; }        // "Bearer" | "ApiKey" | "Basic" | null
    public string? AuthToken { get; set; }
    public string? AuthHeaderName { get; set; }  // for ApiKey type
    public string? HostAppId { get; set; }
    public string? FewShotExamples { get; set; } // JSON: [{userQuery, parametersFilled}]
    public bool IsActive { get; set; } = true;
    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastInvokedAt { get; set; }
    public int InvocationCount { get; set; } = 0;
}
