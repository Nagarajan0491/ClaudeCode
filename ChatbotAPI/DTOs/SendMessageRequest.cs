using System.ComponentModel.DataAnnotations;

namespace ChatbotAPI.DTOs;

public class SendMessageRequest
{
    [Required]
    public int ConversationId { get; set; }

    [Required]
    [MinLength(1)]
    [MaxLength(10000)]
    public string Content { get; set; } = string.Empty;

    [MaxLength(20)]
    public string InputMethod { get; set; } = "text";

    public Dictionary<string, string>? HostContext { get; set; }
    public List<HostActionDescriptor>? HostActions { get; set; }
}

public class HostActionDescriptor
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ParameterSchema { get; set; } = "{}";
}
