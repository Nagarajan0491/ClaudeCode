using ChatbotAPI.Data;
using ChatbotAPI.Data.Models;
using ChatbotAPI.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace ChatbotAPI.Services;

public class ConversationRepository : IConversationRepository
{
    private readonly ChatDbContext _context;
    private readonly ILogger<ConversationRepository> _logger;

    public ConversationRepository(ChatDbContext context, ILogger<ConversationRepository> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<Conversation>> GetAllAsync(CancellationToken cancellationToken = default)
    {
        return await _context.Conversations
            .OrderByDescending(c => c.UpdatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<Conversation?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _context.Conversations
            .Include(c => c.Messages.OrderBy(m => m.Timestamp))
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
    }

    public async Task<Conversation> CreateAsync(CancellationToken cancellationToken = default)
    {
        var conversation = new Conversation
        {
            Title = "New Conversation",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Conversations.Add(conversation);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Created conversation {Id}", conversation.Id);
        return conversation;
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken cancellationToken = default)
    {
        var conversation = await _context.Conversations.FindAsync(new object[] { id }, cancellationToken);
        if (conversation is null) return false;

        _context.Conversations.Remove(conversation);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Deleted conversation {Id}", id);
        return true;
    }

    public async Task<Conversation> UpdateTitleAsync(int id, string title, CancellationToken cancellationToken = default)
    {
        var conversation = await _context.Conversations.FindAsync(new object[] { id }, cancellationToken)
            ?? throw new KeyNotFoundException($"Conversation {id} not found");

        conversation.Title = title;
        conversation.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return conversation;
    }
}
