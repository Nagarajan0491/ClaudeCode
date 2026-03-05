using ChatbotAPI.Data.Models;

namespace ChatbotAPI.Services.Interfaces;

public interface IMessageRepository
{
    Task<IEnumerable<Message>> GetByConversationIdAsync(int conversationId, CancellationToken cancellationToken = default);
    Task<Message> AddAsync(Message message, CancellationToken cancellationToken = default);
}
