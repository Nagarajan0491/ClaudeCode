using ChatbotAPI.DTOs;
using ChatbotAPI.Exceptions;
using ChatbotAPI.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ChatbotAPI.Controllers;

[ApiController]
[Route("api/conversations")]
public class ConversationController : ControllerBase
{
    private readonly IConversationRepository _conversationRepository;
    private readonly ILogger<ConversationController> _logger;

    public ConversationController(IConversationRepository conversationRepository, ILogger<ConversationController> logger)
    {
        _conversationRepository = conversationRepository;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ConversationDto>>> GetAll(CancellationToken cancellationToken)
    {
        var conversations = await _conversationRepository.GetAllAsync(cancellationToken);
        var dtos = conversations.Select(c => new ConversationDto
        {
            Id = c.Id,
            Title = c.Title,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt,
            MessageCount = c.Messages.Count
        });
        return Ok(dtos);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ConversationDto>> GetById(int id, CancellationToken cancellationToken)
    {
        var conversation = await _conversationRepository.GetByIdAsync(id, cancellationToken);
        if (conversation is null)
            throw new ConversationNotFoundException(id);

        var dto = new ConversationDto
        {
            Id = conversation.Id,
            Title = conversation.Title,
            CreatedAt = conversation.CreatedAt,
            UpdatedAt = conversation.UpdatedAt,
            MessageCount = conversation.Messages.Count,
            Messages = conversation.Messages.Select(m => new MessageDto
            {
                Id = m.Id,
                ConversationId = m.ConversationId,
                Role = m.Role,
                Content = m.Content,
                InputMethod = m.InputMethod,
                Timestamp = m.Timestamp
            }).ToList()
        };

        return Ok(dto);
    }

    [HttpPost]
    public async Task<ActionResult<ConversationDto>> Create(CancellationToken cancellationToken)
    {
        var conversation = await _conversationRepository.CreateAsync(cancellationToken);
        var dto = new ConversationDto
        {
            Id = conversation.Id,
            Title = conversation.Title,
            CreatedAt = conversation.CreatedAt,
            UpdatedAt = conversation.UpdatedAt,
            MessageCount = 0
        };
        return CreatedAtAction(nameof(GetById), new { id = conversation.Id }, dto);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var deleted = await _conversationRepository.DeleteAsync(id, cancellationToken);
        if (!deleted)
            throw new ConversationNotFoundException(id);

        return NoContent();
    }

    [HttpPut("{id:int}/title")]
    public async Task<ActionResult<ConversationDto>> UpdateTitle(
        int id, [FromBody] UpdateTitleRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        var conversation = await _conversationRepository.UpdateTitleAsync(id, request.Title.Trim(), cancellationToken);
        return Ok(new ConversationDto
        {
            Id = conversation.Id,
            Title = conversation.Title,
            CreatedAt = conversation.CreatedAt,
            UpdatedAt = conversation.UpdatedAt,
            MessageCount = conversation.Messages?.Count ?? 0
        });
    }
}
