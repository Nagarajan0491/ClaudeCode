namespace ChatbotAPI.Data.Models;

// Stub model for Phase 3 Plugin SDK - forward-compatible schema
public class PluginRegistration
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}
