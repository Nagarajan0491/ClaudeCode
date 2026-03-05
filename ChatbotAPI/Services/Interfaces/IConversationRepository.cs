using ChatbotAPI.Data.Models;

namespace ChatbotAPI.Services.Interfaces;

public interface IConversationRepository
{
    Task<IEnumerable<Conversation>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<Conversation?> GetByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Conversation> CreateAsync(CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default);
    Task<Conversation> UpdateTitleAsync(int id, string title, CancellationToken cancellationToken = default);
}
