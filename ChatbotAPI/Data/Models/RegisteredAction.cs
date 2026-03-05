namespace ChatbotAPI.Data.Models;

// Stub model for Phase 4 Action Execution - forward-compatible schema
public class RegisteredAction
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ActionType { get; set; } = string.Empty;
    public string Configuration { get; set; } = "{}";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsEnabled { get; set; } = true;
}
