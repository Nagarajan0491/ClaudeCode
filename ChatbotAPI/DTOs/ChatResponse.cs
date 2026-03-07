namespace ChatbotAPI.DTOs;

public class ChatResponse
{
    public int Id { get; set; }
    public int ConversationId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string Role { get; set; } = "assistant";
    public DateTime Timestamp { get; set; }
    public bool IsStreaming { get; set; } = false;
    public List<SourceReference>? Sources { get; set; }
}
