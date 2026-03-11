using System.ComponentModel.DataAnnotations;

namespace ChatbotAPI.DTOs;

public class SdkStreamRequest
{
    public int? ConversationId { get; set; }

    [Required, MinLength(1), MaxLength(10000)]
    public string Content { get; set; } = string.Empty;

    [MaxLength(20)]
    public string InputMethod { get; set; } = "text";

    public Dictionary<string, string>? HostContext { get; set; }
    public List<HostActionDescriptor>? HostActions { get; set; }
    public string? HostAppId { get; set; }
    [MaxLength(255)]
    public string? UserId { get; set; }
}
