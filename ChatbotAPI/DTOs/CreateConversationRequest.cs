using System.ComponentModel.DataAnnotations;

namespace ChatbotAPI.DTOs;

public class CreateConversationRequest
{
    [MaxLength(100)]
    public string? HostAppId { get; set; }

    [MaxLength(255)]
    public string? UserId { get; set; }
}
