using System.Text;
using System.Text.Json;
using ChatbotAPI.Data;
using ChatbotAPI.Data.Models;
using ChatbotAPI.DTOs;
using ChatbotAPI.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ChatbotAPI.Services;

public class HostAppActionService : IHostAppActionService
{
    private readonly ChatDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<HostAppActionService> _logger;

    public HostAppActionService(ChatDbContext db, IHttpClientFactory httpClientFactory, ILogger<HostAppActionService> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<IEnumerable<HostAppActionDto>> GetAllAsync(string? hostAppId, CancellationToken ct = default)
    {
        var query = _db.HostAppActions.AsQueryable();
        if (!string.IsNullOrEmpty(hostAppId))
            query = query.Where(a => a.HostAppId == hostAppId);
        var actions = await query.OrderBy(a => a.Name).ToListAsync(ct);
        return actions.Select(MapToDto);
    }

    public async Task<HostAppActionDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var action = await _db.HostAppActions.FindAsync([id], ct);
        return action is null ? null : MapToDto(action);
    }

    public async Task<HostAppActionDto> RegisterAsync(RegisterHostAppActionRequest request, CancellationToken ct = default)
    {
        // Upsert by (Name, HostAppId) — idempotent startup registration
        var existing = await _db.HostAppActions
            .FirstOrDefaultAsync(a => a.Name == request.Name && a.HostAppId == request.HostAppId, ct);

        if (existing is not null)
        {
            existing.Description = request.Description;
            existing.EndpointUrl = request.EndpointUrl;
            existing.HttpMethod = request.HttpMethod;
            existing.ParameterSchema = request.ParameterSchema;
            existing.ResponseSchema = request.ResponseSchema;
            existing.AuthType = request.AuthType;
            if (request.AuthToken is not null)
                existing.AuthToken = request.AuthToken;
            existing.AuthHeaderName = request.AuthHeaderName;
            existing.FewShotExamples = request.FewShotExamples;
            existing.IsActive = request.IsActive;
            await _db.SaveChangesAsync(ct);
            return MapToDto(existing);
        }

        var action = new HostAppAction
        {
            Name = request.Name,
            Description = request.Description,
            EndpointUrl = request.EndpointUrl,
            HttpMethod = request.HttpMethod,
            ParameterSchema = request.ParameterSchema,
            ResponseSchema = request.ResponseSchema,
            AuthType = request.AuthType,
            AuthToken = request.AuthToken,
            AuthHeaderName = request.AuthHeaderName,
            HostAppId = request.HostAppId,
            FewShotExamples = request.FewShotExamples,
            IsActive = request.IsActive,
            RegisteredAt = DateTime.UtcNow
        };
        _db.HostAppActions.Add(action);
        await _db.SaveChangesAsync(ct);
        return MapToDto(action);
    }

    public async Task<HostAppActionDto> UpdateAsync(int id, UpdateHostAppActionRequest request, CancellationToken ct = default)
    {
        var action = await _db.HostAppActions.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"Host action {id} not found.");

        action.Name = request.Name;
        action.Description = request.Description;
        action.EndpointUrl = request.EndpointUrl;
        action.HttpMethod = request.HttpMethod;
        action.ParameterSchema = request.ParameterSchema;
        action.ResponseSchema = request.ResponseSchema;
        action.AuthType = request.AuthType;
        if (request.AuthToken is not null)
            action.AuthToken = request.AuthToken;
        action.AuthHeaderName = request.AuthHeaderName;
        action.HostAppId = request.HostAppId;
        action.FewShotExamples = request.FewShotExamples;
        action.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);
        return MapToDto(action);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var action = await _db.HostAppActions.FindAsync([id], ct);
        if (action is null) return false;
        _db.HostAppActions.Remove(action);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<HostAppActionDto> ToggleActiveAsync(int id, CancellationToken ct = default)
    {
        var action = await _db.HostAppActions.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"Host action {id} not found.");
        action.IsActive = !action.IsActive;
        await _db.SaveChangesAsync(ct);
        return MapToDto(action);
    }

    public async Task<HostAppActionExecuteResult> ExecuteAsync(int id, Dictionary<string, object>? parameters, CancellationToken ct = default)
    {
        var action = await _db.HostAppActions.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"Host action {id} not found.");

        try
        {
            var client = _httpClientFactory.CreateClient();
            ApplyAuth(client, action);

            HttpResponseMessage response;
            if (action.HttpMethod.Equals("GET", StringComparison.OrdinalIgnoreCase))
            {
                var url = action.EndpointUrl;
                var remaining = new Dictionary<string, object>(parameters ?? new Dictionary<string, object>());
                // Substitute {param} placeholders in the URL path
                foreach (var key in remaining.Keys.ToList())
                {
                    var placeholder = $"{{{key}}}";
                    if (url.Contains(placeholder, StringComparison.OrdinalIgnoreCase))
                    {
                        url = url.Replace(placeholder, Uri.EscapeDataString(remaining[key]?.ToString() ?? ""), StringComparison.OrdinalIgnoreCase);
                        remaining.Remove(key);
                    }
                }
                // Append any remaining parameters as query string
                if (remaining.Count > 0)
                {
                    var qs = string.Join("&", remaining.Select(kv =>
                        $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value?.ToString() ?? "")}"));
                    url = $"{url}?{qs}";
                }
                response = await client.GetAsync(url, ct);
            }
            else
            {
                var postUrl = action.EndpointUrl;
                var bodyParams = new Dictionary<string, object>(parameters ?? new Dictionary<string, object>());
                // Substitute {param} placeholders in the URL path
                foreach (var key in bodyParams.Keys.ToList())
                {
                    var placeholder = $"{{{key}}}";
                    if (postUrl.Contains(placeholder, StringComparison.OrdinalIgnoreCase))
                    {
                        postUrl = postUrl.Replace(placeholder, Uri.EscapeDataString(bodyParams[key]?.ToString() ?? ""), StringComparison.OrdinalIgnoreCase);
                        bodyParams.Remove(key);
                    }
                }
                var json = JsonSerializer.Serialize(bodyParams);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                response = action.HttpMethod.Equals("PUT", StringComparison.OrdinalIgnoreCase)
                    ? await client.PutAsync(postUrl, content, ct)
                    : await client.PostAsync(postUrl, content, ct);
            }

            action.LastInvokedAt = DateTime.UtcNow;
            action.InvocationCount++;
            await _db.SaveChangesAsync(ct);

            var body = await response.Content.ReadAsStringAsync(ct);
            if (!response.IsSuccessStatusCode)
                _logger.LogWarning("Host action '{Name}' returned HTTP {Status}: {Body}", action.Name, (int)response.StatusCode, body);
            return new HostAppActionExecuteResult
            {
                Success = response.IsSuccessStatusCode,
                Output = body,
                Error = response.IsSuccessStatusCode ? null : $"HTTP {(int)response.StatusCode}: {body}",
                StatusCode = (int)response.StatusCode,
                ActionName = action.Name
            };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Host action {Name} HTTP request failed", action.Name);
            return new HostAppActionExecuteResult { Success = false, Error = ex.Message, StatusCode = 0, ActionName = action.Name };
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogWarning(ex, "Host action {Name} request timed out", action.Name);
            return new HostAppActionExecuteResult { Success = false, Error = "Request timed out.", StatusCode = 0, ActionName = action.Name };
        }
    }

    public async Task<IEnumerable<HostAppAction>> GetActiveActionsAsync(string? hostAppId, CancellationToken ct = default)
    {
        var query = _db.HostAppActions.Where(a => a.IsActive);
        if (!string.IsNullOrEmpty(hostAppId))
            query = query.Where(a => a.HostAppId == hostAppId);
        return await query.OrderBy(a => a.Name).ToListAsync(ct);
    }

    public async Task<HostAppActionExecuteResult?> TryAutoInvokeAsync(string aiResponse, string? hostAppId, CancellationToken ct = default)
    {
        // Strip markdown code fences if present
        var text = aiResponse.Trim();
        if (text.StartsWith("```"))
        {
            var firstNewline = text.IndexOf('\n');
            if (firstNewline >= 0)
                text = text[(firstNewline + 1)..];
            if (text.EndsWith("```"))
                text = text[..^3].TrimEnd();
        }

        const string marker = "\"host_action_call\"";
        var markerIdx = text.IndexOf(marker, StringComparison.Ordinal);
        if (markerIdx < 0) return null;

        var start = text.LastIndexOf('{', markerIdx);
        if (start < 0) return null;

        try
        {
            int depth = 0, end = -1;
            for (int i = start; i < text.Length; i++)
            {
                if (text[i] == '{') depth++;
                else if (text[i] == '}' && --depth == 0) { end = i; break; }
            }
            if (end < 0) return null;
            using var doc = JsonDocument.Parse(text[start..(end + 1)]);
            if (!doc.RootElement.TryGetProperty("host_action_call", out var callEl)) return null;
            if (!callEl.TryGetProperty("name", out var nameEl)) return null;
            var actionName = nameEl.GetString();
            if (string.IsNullOrWhiteSpace(actionName)) return null;

            Dictionary<string, object>? parameters = null;
            if (callEl.TryGetProperty("parameters", out var paramsEl))
            {
                parameters = new Dictionary<string, object>();
                foreach (var prop in paramsEl.EnumerateObject())
                    parameters[prop.Name] = prop.Value.ValueKind == JsonValueKind.String
                        ? prop.Value.GetString()!
                        : prop.Value.GetRawText();
            }

            var query = _db.HostAppActions.Where(a => a.Name == actionName && a.IsActive);
            if (!string.IsNullOrEmpty(hostAppId))
                query = query.Where(a => a.HostAppId == hostAppId);
            var action = await query.FirstOrDefaultAsync(ct);

            if (action is null)
            {
                _logger.LogWarning("AI requested host action '{Name}' (hostAppId={HostAppId}) but it was not found or is inactive.", actionName, hostAppId);
                return null;
            }

            _logger.LogInformation("Auto-invoking host action '{Name}' based on AI response.", actionName);
            return await ExecuteAsync(action.Id, parameters, ct);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse host_action_call JSON from AI response.");
            return null;
        }
    }

    private static void ApplyAuth(HttpClient client, HostAppAction action)
    {
        if (string.IsNullOrEmpty(action.AuthToken) || string.IsNullOrEmpty(action.AuthType)) return;

        switch (action.AuthType)
        {
            case "Bearer":
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", action.AuthToken);
                break;
            case "Basic":
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue(
                        "Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes(action.AuthToken)));
                break;
            case "ApiKey":
                var headerName = !string.IsNullOrEmpty(action.AuthHeaderName)
                    ? action.AuthHeaderName
                    : "X-Api-Key";
                client.DefaultRequestHeaders.TryAddWithoutValidation(headerName, action.AuthToken);
                break;
        }
    }

    private static HostAppActionDto MapToDto(HostAppAction a) => new()
    {
        Id = a.Id,
        Name = a.Name,
        Description = a.Description,
        EndpointUrl = a.EndpointUrl,
        HttpMethod = a.HttpMethod,
        ParameterSchema = a.ParameterSchema,
        ResponseSchema = a.ResponseSchema,
        AuthType = a.AuthType,
        HasAuthToken = !string.IsNullOrEmpty(a.AuthToken),
        AuthHeaderName = a.AuthHeaderName,
        HostAppId = a.HostAppId,
        FewShotExamples = a.FewShotExamples,
        IsActive = a.IsActive,
        RegisteredAt = a.RegisteredAt,
        LastInvokedAt = a.LastInvokedAt,
        InvocationCount = a.InvocationCount
    };
}
