namespace ChatbotAPI.DTOs;

public class HostAppActionDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string EndpointUrl { get; set; } = string.Empty;
    public string HttpMethod { get; set; } = "GET";
    public string ParameterSchema { get; set; } = "{}";
    public string? ResponseSchema { get; set; }
    public string? AuthType { get; set; }
    public bool HasAuthToken { get; set; }
    public string? AuthHeaderName { get; set; }
    public string? HostAppId { get; set; }
    public string? FewShotExamples { get; set; }
    public bool IsActive { get; set; }
    public DateTime RegisteredAt { get; set; }
    public DateTime? LastInvokedAt { get; set; }
    public int InvocationCount { get; set; }
}

public class RegisterHostAppActionRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string EndpointUrl { get; set; } = string.Empty;
    public string HttpMethod { get; set; } = "GET";
    public string ParameterSchema { get; set; } = "{}";
    public string? ResponseSchema { get; set; }
    public string? AuthType { get; set; }
    public string? AuthToken { get; set; }
    public string? AuthHeaderName { get; set; }
    public string? HostAppId { get; set; }
    public string? FewShotExamples { get; set; }
    public bool IsActive { get; set; } = true;
}

public class UpdateHostAppActionRequest : RegisterHostAppActionRequest { }

public class ExecuteHostAppActionRequest
{
    public Dictionary<string, object>? Parameters { get; set; }
}

public class HostAppActionExecuteResult
{
    public bool Success { get; set; }
    public string? Output { get; set; }
    public string? Error { get; set; }
    public int StatusCode { get; set; }
    public string? ActionName { get; set; }
}
