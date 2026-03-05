using System.ComponentModel.DataAnnotations;

namespace ChatbotAPI.Data.Models;

public class Conversation
{
    public int Id { get; set; }

    [MaxLength(255)]
    public string Title { get; set; } = "New Conversation";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<Message> Messages { get; set; } = new();
}
