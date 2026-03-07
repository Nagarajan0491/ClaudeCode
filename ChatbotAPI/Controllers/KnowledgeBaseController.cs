using System.Text;
using ChatbotAPI.DTOs;
using ChatbotAPI.Services.Interfaces;
using DocumentFormat.OpenXml.Packaging;
using Microsoft.AspNetCore.Mvc;
using UglyToad.PdfPig;

namespace ChatbotAPI.Controllers;

[ApiController]
[Route("api/knowledge-base")]
public class KnowledgeBaseController : ControllerBase
{
    private readonly IKnowledgeBaseService _knowledgeBaseService;
    private readonly ILogger<KnowledgeBaseController> _logger;

    public KnowledgeBaseController(IKnowledgeBaseService knowledgeBaseService, ILogger<KnowledgeBaseController> logger)
    {
        _knowledgeBaseService = knowledgeBaseService;
        _logger = logger;
    }

    [HttpPost("upload")]
    public async Task<ActionResult<DocumentDto>> Upload(
        IFormFile file,
        [FromForm] string? title = null,
        CancellationToken cancellationToken = default)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file provided.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (ext != ".txt" && ext != ".md" && ext != ".pdf" && ext != ".pptx")
            return BadRequest("Only .txt, .md, .pdf, and .pptx files are supported.");

        string content;
        using var stream = file.OpenReadStream();
        content = ext switch
        {
            ".pdf"  => ExtractPdfText(stream),
            ".pptx" => ExtractPptxText(stream),
            _       => await new StreamReader(stream).ReadToEndAsync(cancellationToken)
        };

        if (string.IsNullOrWhiteSpace(content))
            return BadRequest("File content is empty.");

        var docTitle = !string.IsNullOrWhiteSpace(title)
            ? title
            : Path.GetFileNameWithoutExtension(file.FileName);

        var dto = await _knowledgeBaseService.IngestAsync(docTitle, file.FileName, content, cancellationToken);
        return StatusCode(201, dto);
    }

    private static string ExtractPdfText(Stream stream)
    {
        var sb = new StringBuilder();
        using var pdf = PdfDocument.Open(stream);
        foreach (var page in pdf.GetPages())
            sb.AppendLine(string.Join(" ", page.GetWords().Select(w => w.Text)));
        return sb.ToString();
    }

    private static string ExtractPptxText(Stream stream)
    {
        var sb = new StringBuilder();
        using var presentation = PresentationDocument.Open(stream, false);
        var slideParts = presentation.PresentationPart?.SlideParts;
        if (slideParts != null)
        {
            foreach (var slide in slideParts)
            {
                if (slide.Slide is null) continue;
                var texts = slide.Slide
                    .Descendants<DocumentFormat.OpenXml.Drawing.Text>()
                    .Select(t => t.Text)
                    .Where(t => !string.IsNullOrWhiteSpace(t));
                sb.AppendLine(string.Join(" ", texts));
            }
        }
        return sb.ToString();
    }

    [HttpGet("documents")]
    public async Task<ActionResult<IEnumerable<DocumentDto>>> GetDocuments(CancellationToken cancellationToken = default)
    {
        var docs = await _knowledgeBaseService.GetAllAsync(cancellationToken);
        return Ok(docs);
    }

    [HttpDelete("documents/{id:int}")]
    public async Task<IActionResult> DeleteDocument(int id, CancellationToken cancellationToken = default)
    {
        var deleted = await _knowledgeBaseService.DeleteAsync(id, cancellationToken);
        if (!deleted) return NotFound();
        return NoContent();
    }

    [HttpPost("search")]
    public async Task<ActionResult<IEnumerable<ChunkSearchResult>>> Search(
        [FromBody] SearchRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
            return BadRequest("Query cannot be empty.");

        var results = await _knowledgeBaseService.SearchAsync(
            request.Query, request.TopK ?? 3, cancellationToken);
        return Ok(results);
    }
}
