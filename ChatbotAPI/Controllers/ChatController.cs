using ChatbotAPI.DTOs;
using ChatbotAPI.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ChatbotAPI.Controllers;

[ApiController]
[Route("api/chat")]
public class ChatController : ControllerBase
{
    private readonly IChatService _chatService;
    private readonly ILogger<ChatController> _logger;

    public ChatController(IChatService chatService, ILogger<ChatController> logger)
    {
        _chatService = chatService;
        _logger = logger;
    }

    [HttpPost("send-message")]
    public async Task<ActionResult<ChatResponse>> SendMessage([FromBody] SendMessageRequest request, CancellationToken cancellationToken)
    {
        var response = await _chatService.SendMessageAsync(request, cancellationToken);
        return Ok(response);
    }

    [HttpGet("stream/{conversationId:int}")]
    public async Task StreamMessage(int conversationId, [FromQuery] string message, CancellationToken cancellationToken)
    {
        Response.Headers["Content-Type"] = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";

        await foreach (var chunk in _chatService.StreamMessageAsync(conversationId, message, cancellationToken))
        {
            var data = $"data: {System.Text.Json.JsonSerializer.Serialize(chunk)}\n\n";
            await Response.WriteAsync(data, cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
    }
}
