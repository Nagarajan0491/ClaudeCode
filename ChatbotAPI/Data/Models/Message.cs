using System.ComponentModel.DataAnnotations;

namespace ChatbotAPI.Data.Models;

public class Message
{
    public int Id { get; set; }
    public int ConversationId { get; set; }

    [MaxLength(20)]
    public string Role { get; set; } = "user"; // "user" or "assistant"

    public string Content { get; set; } = string.Empty;

    [MaxLength(20)]
    public string InputMethod { get; set; } = "text"; // "text" or "voice"

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public Conversation Conversation { get; set; } = null!;
}
