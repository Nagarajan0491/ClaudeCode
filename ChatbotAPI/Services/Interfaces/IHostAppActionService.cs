using ChatbotAPI.Data.Models;
using ChatbotAPI.DTOs;

namespace ChatbotAPI.Services.Interfaces;

public interface IHostAppActionService
{
    Task<IEnumerable<HostAppActionDto>> GetAllAsync(string? hostAppId, CancellationToken ct = default);
    Task<HostAppActionDto?> GetByIdAsync(int id, CancellationToken ct = default);
    Task<HostAppActionDto> RegisterAsync(RegisterHostAppActionRequest request, CancellationToken ct = default);
    Task<HostAppActionDto> UpdateAsync(int id, UpdateHostAppActionRequest request, CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, CancellationToken ct = default);
    Task<HostAppActionDto> ToggleActiveAsync(int id, CancellationToken ct = default);
    Task<HostAppActionExecuteResult> ExecuteAsync(int id, Dictionary<string, object>? parameters, CancellationToken ct = default);
    Task<IEnumerable<HostAppAction>> GetActiveActionsAsync(string? hostAppId, CancellationToken ct = default);
    Task<HostAppActionExecuteResult?> TryAutoInvokeAsync(string aiResponse, string? hostAppId, CancellationToken ct = default);
}
