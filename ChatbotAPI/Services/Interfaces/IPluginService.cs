using ChatbotAPI.Data.Models;
using ChatbotAPI.DTOs;

namespace ChatbotAPI.Services.Interfaces;

public interface IPluginService
{
    Task<IEnumerable<PluginDto>> GetAllAsync(CancellationToken ct = default);
    Task<PluginDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<PluginDto> CreateAsync(CreatePluginRequest request, CancellationToken ct = default);
    Task<PluginDto> UpdateAsync(int id, UpdatePluginRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, CancellationToken ct = default);
    Task<PluginDto> ToggleActiveAsync(int id, CancellationToken ct = default);
    Task<PluginExecuteResult> ExecuteAsync(int id, Dictionary<string, object>? parameters, CancellationToken ct = default);
    Task<IEnumerable<PluginRegistration>> GetActivePluginsAsync(CancellationToken ct = default);
    Task<PluginExecuteResult?> TryAutoInvokeAsync(string aiResponse, CancellationToken ct = default);
}
