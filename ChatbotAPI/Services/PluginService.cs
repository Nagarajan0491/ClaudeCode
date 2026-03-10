using System.Text;
using System.Text.Json;
using ChatbotAPI.Data;
using ChatbotAPI.Data.Models;
using ChatbotAPI.DTOs;
using ChatbotAPI.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ChatbotAPI.Services;

public class PluginService : IPluginService
{
    private readonly ChatDbContext _db;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<PluginService> _logger;

    public PluginService(ChatDbContext db, IHttpClientFactory httpClientFactory, ILogger<PluginService> logger)
    {
        _db = db;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task<IEnumerable<PluginDto>> GetAllAsync(CancellationToken ct = default)
    {
        var plugins = await _db.PluginRegistrations.OrderBy(p => p.Name).ToListAsync(ct);
        return plugins.Select(MapToDto);
    }

    public async Task<PluginDto?> GetByIdAsync(int id, CancellationToken ct = default)
    {
        var plugin = await _db.PluginRegistrations.FindAsync([id], ct);
        return plugin is null ? null : MapToDto(plugin);
    }

    public async Task<PluginDto> CreateAsync(CreatePluginRequest request, CancellationToken ct = default)
    {
        var plugin = new PluginRegistration
        {
            Name = request.Name,
            Description = request.Description,
            EndpointUrl = request.EndpointUrl,
            HttpMethod = request.HttpMethod,
            AuthToken = request.AuthToken,
            ParameterSchema = request.ParameterSchema,
            IsActive = request.IsActive,
            RegisteredAt = DateTime.UtcNow
        };
        _db.PluginRegistrations.Add(plugin);
        await _db.SaveChangesAsync(ct);
        return MapToDto(plugin);
    }

    public async Task<PluginDto> UpdateAsync(int id, UpdatePluginRequest request, CancellationToken ct = default)
    {
        var plugin = await _db.PluginRegistrations.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"Plugin {id} not found.");
        plugin.Name = request.Name;
        plugin.Description = request.Description;
        plugin.EndpointUrl = request.EndpointUrl;
        plugin.HttpMethod = request.HttpMethod;
        if (request.AuthToken is not null)
            plugin.AuthToken = request.AuthToken;
        plugin.ParameterSchema = request.ParameterSchema;
        plugin.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);
        return MapToDto(plugin);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var plugin = await _db.PluginRegistrations.FindAsync([id], ct);
        if (plugin is null) return false;
        _db.PluginRegistrations.Remove(plugin);
        await _db.SaveChangesAsync(ct);
        return true;
    }

    public async Task<PluginDto> ToggleActiveAsync(int id, CancellationToken ct = default)
    {
        var plugin = await _db.PluginRegistrations.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"Plugin {id} not found.");
        plugin.IsActive = !plugin.IsActive;
        await _db.SaveChangesAsync(ct);
        return MapToDto(plugin);
    }

    public async Task<PluginExecuteResult> ExecuteAsync(int id, Dictionary<string, object>? parameters, CancellationToken ct = default)
    {
        var plugin = await _db.PluginRegistrations.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"Plugin {id} not found.");

        try
        {
            var client = _httpClientFactory.CreateClient();
            if (!string.IsNullOrEmpty(plugin.AuthToken))
                client.DefaultRequestHeaders.Authorization =
                    new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", plugin.AuthToken);

            HttpResponseMessage response;
            if (plugin.HttpMethod.Equals("GET", StringComparison.OrdinalIgnoreCase))
            {
                var url = plugin.EndpointUrl;
                if (parameters is { Count: > 0 })
                {
                    var qs = string.Join("&", parameters.Select(kv => $"{Uri.EscapeDataString(kv.Key)}={Uri.EscapeDataString(kv.Value?.ToString() ?? "")}"));
                    url = $"{url}?{qs}";
                }
                response = await client.GetAsync(url, ct);
            }
            else
            {
                var json = JsonSerializer.Serialize(parameters ?? new Dictionary<string, object>());
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                response = plugin.HttpMethod.Equals("PUT", StringComparison.OrdinalIgnoreCase)
                    ? await client.PutAsync(plugin.EndpointUrl, content, ct)
                    : await client.PostAsync(plugin.EndpointUrl, content, ct);
            }

            plugin.LastInvokedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            var body = await response.Content.ReadAsStringAsync(ct);
            return new PluginExecuteResult
            {
                Success = response.IsSuccessStatusCode,
                Output = body,
                StatusCode = (int)response.StatusCode
            };
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Plugin {Name} HTTP request failed", plugin.Name);
            return new PluginExecuteResult { Success = false, Error = ex.Message, StatusCode = 0 };
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogWarning(ex, "Plugin {Name} request timed out", plugin.Name);
            return new PluginExecuteResult { Success = false, Error = "Request timed out.", StatusCode = 0 };
        }
    }

    public async Task<IEnumerable<PluginRegistration>> GetActivePluginsAsync(CancellationToken ct = default)
    {
        return await _db.PluginRegistrations.Where(p => p.IsActive).OrderBy(p => p.Name).ToListAsync(ct);
    }

    public async Task<PluginExecuteResult?> TryAutoInvokeAsync(string aiResponse, CancellationToken ct = default)
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

        // Look for the plugin_call JSON pattern
        const string marker = "\"plugin_call\"";
        var markerIdx = text.IndexOf(marker, StringComparison.Ordinal);
        if (markerIdx < 0) return null;

        // Find the enclosing JSON object
        var start = text.LastIndexOf('{', markerIdx);
        if (start < 0) return null;

        try
        {
            // Find matching closing brace so trailing content doesn't break JsonDocument.Parse
            int depth = 0, end = -1;
            for (int i = start; i < text.Length; i++)
            {
                if (text[i] == '{') depth++;
                else if (text[i] == '}' && --depth == 0) { end = i; break; }
            }
            if (end < 0) return null;
            using var doc = JsonDocument.Parse(text[start..(end + 1)]);
            if (!doc.RootElement.TryGetProperty("plugin_call", out var callEl)) return null;
            if (!callEl.TryGetProperty("name", out var nameEl)) return null;
            var pluginName = nameEl.GetString();
            if (string.IsNullOrWhiteSpace(pluginName)) return null;

            Dictionary<string, object>? parameters = null;
            if (callEl.TryGetProperty("parameters", out var paramsEl))
            {
                parameters = new Dictionary<string, object>();
                foreach (var prop in paramsEl.EnumerateObject())
                    parameters[prop.Name] = prop.Value.ValueKind == JsonValueKind.String
                        ? prop.Value.GetString()!
                        : prop.Value.GetRawText();
            }

            var plugin = await _db.PluginRegistrations
                .FirstOrDefaultAsync(p => p.Name == pluginName && p.IsActive, ct);
            if (plugin is null)
            {
                _logger.LogWarning("AI requested plugin '{Name}' but it was not found or is inactive.", pluginName);
                return null;
            }

            _logger.LogInformation("Auto-invoking plugin '{Name}' based on AI response.", pluginName);
            return await ExecuteAsync(plugin.Id, parameters, ct);
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse plugin_call JSON from AI response.");
            return null;
        }
    }

    private static PluginDto MapToDto(PluginRegistration p) => new()
    {
        Id = p.Id,
        Name = p.Name,
        Description = p.Description,
        EndpointUrl = p.EndpointUrl,
        HttpMethod = p.HttpMethod,
        HasAuthToken = !string.IsNullOrEmpty(p.AuthToken),
        ParameterSchema = p.ParameterSchema,
        IsActive = p.IsActive,
        RegisteredAt = p.RegisteredAt,
        LastInvokedAt = p.LastInvokedAt
    };
}
