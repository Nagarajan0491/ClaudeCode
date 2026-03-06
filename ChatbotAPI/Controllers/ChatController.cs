using System.Text.Json;
using ChatbotAPI.DTOs;
using ChatbotAPI.Exceptions;
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
    public async Task StreamMessage(int conversationId, [FromQuery] string message, [FromQuery] string inputMethod = "text", CancellationToken cancellationToken = default)
    {
        Response.Headers["Content-Type"] = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";

        try
        {
            await foreach (var chunk in _chatService.StreamMessageAsync(conversationId, message, inputMethod, cancellationToken))
            {
                var data = $"data: {System.Text.Json.JsonSerializer.Serialize(chunk)}\n\n";
                await Response.WriteAsync(data, cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
            await Response.WriteAsync("data: \"[DONE]\"\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during SSE stream for conversation {ConversationId}", conversationId);
            var errorMsg = ex is GeminiConnectionException or OllamaConnectionException
                ? ex.Message
                : "An error occurred while generating the response.";
            var errorData = $"data: \"[STREAM_ERROR]:{errorMsg.Replace("\"", "\\\"")}\"\n\n";
            if (!Response.HasStarted)
                Response.StatusCode = 500;
            else
            {
                await Response.WriteAsync(errorData, cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
    }

    [HttpPost("stream-sdk")]
    public async Task StreamSdk(
        [FromBody] SdkStreamRequest request,
        CancellationToken cancellationToken)
    {
        Response.Headers["Content-Type"] = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";

        try
        {
            await foreach (var chunk in _chatService.StreamSdkMessageAsync(request, cancellationToken))
            {
                await Response.WriteAsync(
                    $"data: {JsonSerializer.Serialize(chunk)}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
            await Response.WriteAsync("data: \"[DONE]\"\n\n", cancellationToken);
            await Response.Body.FlushAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SDK stream error for conversation {Id}", request.ConversationId);
            var msg = ex is GeminiConnectionException or OllamaConnectionException
                ? ex.Message : "An error occurred.";
            if (!Response.HasStarted) Response.StatusCode = 500;
            else
            {
                await Response.WriteAsync(
                    $"data: \"[STREAM_ERROR]:{msg.Replace("\"", "\\\"")}\"\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
    }
}
