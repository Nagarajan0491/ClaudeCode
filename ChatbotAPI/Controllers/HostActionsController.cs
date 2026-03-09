using ChatbotAPI.DTOs;
using ChatbotAPI.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ChatbotAPI.Controllers;

[ApiController]
[Route("api/host-actions")]
public class HostActionsController : ControllerBase
{
    private readonly IHostAppActionService _service;

    public HostActionsController(IHostAppActionService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<HostAppActionDto>>> GetAll([FromQuery] string? hostAppId, CancellationToken ct)
    {
        var actions = await _service.GetAllAsync(hostAppId, ct);
        return Ok(actions);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<HostAppActionDto>> GetById(int id, CancellationToken ct)
    {
        var action = await _service.GetByIdAsync(id, ct);
        return action is null ? NotFound() : Ok(action);
    }

    [HttpPost]
    public async Task<ActionResult<HostAppActionDto>> Create([FromBody] RegisterHostAppActionRequest request, CancellationToken ct)
    {
        var action = await _service.RegisterAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = action.Id }, action);
    }

    /// <summary>Register or update a host action by (Name, HostAppId) — idempotent, safe to call on app startup.</summary>
    [HttpPost("register")]
    public async Task<ActionResult<HostAppActionDto>> Register([FromBody] RegisterHostAppActionRequest request, CancellationToken ct)
    {
        var action = await _service.RegisterAsync(request, ct);
        return Ok(action);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<HostAppActionDto>> Update(int id, [FromBody] UpdateHostAppActionRequest request, CancellationToken ct)
    {
        var action = await _service.UpdateAsync(id, request, ct);
        return Ok(action);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await _service.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpPatch("{id:int}/toggle")]
    public async Task<ActionResult<HostAppActionDto>> Toggle(int id, CancellationToken ct)
    {
        var action = await _service.ToggleActiveAsync(id, ct);
        return Ok(action);
    }

    [HttpPost("{id:int}/execute")]
    public async Task<ActionResult<HostAppActionExecuteResult>> Execute(int id, [FromBody] ExecuteHostAppActionRequest request, CancellationToken ct)
    {
        var result = await _service.ExecuteAsync(id, request.Parameters, ct);
        return Ok(result);
    }
}
