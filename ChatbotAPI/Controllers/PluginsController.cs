using ChatbotAPI.DTOs;
using ChatbotAPI.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ChatbotAPI.Controllers;

[ApiController]
[Route("api/plugins")]
public class PluginsController : ControllerBase
{
    private readonly IPluginService _pluginService;

    public PluginsController(IPluginService pluginService)
    {
        _pluginService = pluginService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<PluginDto>>> GetAll(CancellationToken ct)
    {
        var plugins = await _pluginService.GetAllAsync(ct);
        return Ok(plugins);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<PluginDto>> GetById(int id, CancellationToken ct)
    {
        var plugin = await _pluginService.GetByIdAsync(id, ct);
        return plugin is null ? NotFound() : Ok(plugin);
    }

    [HttpPost]
    public async Task<ActionResult<PluginDto>> Create([FromBody] CreatePluginRequest request, CancellationToken ct)
    {
        var plugin = await _pluginService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = plugin.Id }, plugin);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<PluginDto>> Update(int id, [FromBody] UpdatePluginRequest request, CancellationToken ct)
    {
        var plugin = await _pluginService.UpdateAsync(id, request, ct);
        return Ok(plugin);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        await _pluginService.DeleteAsync(id, ct);
        return NoContent();
    }

    [HttpPost("{id:int}/execute")]
    public async Task<ActionResult<PluginExecuteResult>> Execute(int id, [FromBody] ExecutePluginRequest request, CancellationToken ct)
    {
        var result = await _pluginService.ExecuteAsync(id, request.Parameters, ct);
        return Ok(result);
    }

    [HttpPatch("{id:int}/toggle")]
    public async Task<ActionResult<PluginDto>> Toggle(int id, CancellationToken ct)
    {
        var plugin = await _pluginService.ToggleActiveAsync(id, ct);
        return Ok(plugin);
    }
}
