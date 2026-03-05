namespace ChatbotAPI.Data.Models;

// Stub model for Phase 3 Plugin SDK - forward-compatible schema
public class DataSource
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ConnectionType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
}
