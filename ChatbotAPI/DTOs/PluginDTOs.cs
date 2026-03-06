namespace ChatbotAPI.DTOs;

public class PluginDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string EndpointUrl { get; set; } = string.Empty;
    public string HttpMethod { get; set; } = "POST";
    public bool HasAuthToken { get; set; }
    public string ParameterSchema { get; set; } = "{}";
    public bool IsActive { get; set; }
    public DateTime RegisteredAt { get; set; }
    public DateTime? LastInvokedAt { get; set; }
}

public class CreatePluginRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string EndpointUrl { get; set; } = string.Empty;
    public string HttpMethod { get; set; } = "POST";
    public string? AuthToken { get; set; }
    public string ParameterSchema { get; set; } = "{}";
    public bool IsActive { get; set; } = true;
}

public class UpdatePluginRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string EndpointUrl { get; set; } = string.Empty;
    public string HttpMethod { get; set; } = "POST";
    public string? AuthToken { get; set; }
    public string ParameterSchema { get; set; } = "{}";
    public bool IsActive { get; set; } = true;
}

public class ExecutePluginRequest
{
    public Dictionary<string, object>? Parameters { get; set; }
}

public class PluginExecuteResult
{
    public bool Success { get; set; }
    public string? Output { get; set; }
    public string? Error { get; set; }
    public int StatusCode { get; set; }
}
