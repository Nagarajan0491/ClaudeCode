using System.Text;
using ChatbotAPI.DTOs;
using ChatbotAPI.Services.Interfaces;

namespace ChatbotAPI.Services;

public class RAGService : IRAGService
{
    private readonly IKnowledgeBaseService _knowledgeBaseService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<RAGService> _logger;

    public RAGService(
        IKnowledgeBaseService knowledgeBaseService,
        IConfiguration configuration,
        ILogger<RAGService> logger)
    {
        _knowledgeBaseService = knowledgeBaseService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<RAGResult> RetrieveContextAsync(string query, CancellationToken ct = default)
    {
        var enabled = _configuration.GetValue<bool>("RAG:Enabled", true);
        if (!enabled)
            return new RAGResult(string.Empty, []);

        var topK = _configuration.GetValue<int>("RAG:TopK", 3);
        var threshold = _configuration.GetValue<double>("RAG:SimilarityThreshold", 0.0);

        try
        {
            var chunks = (await _knowledgeBaseService.SearchAsync(query, topK, ct)).ToList();
            var filtered = chunks.Where(c => c.Similarity >= threshold).ToList();

            if (filtered.Count == 0)
                return new RAGResult(string.Empty, []);

            var sb = new StringBuilder();
            sb.AppendLine("--- Knowledge Base Context ---");
            foreach (var chunk in filtered)
            {
                sb.AppendLine($"[Source: {chunk.DocumentTitle}]");
                sb.AppendLine(chunk.Content);
                sb.AppendLine("---");
            }

            var sources = filtered
                .Select(c => new SourceReference(c.ChunkId, c.DocumentId, c.DocumentTitle, c.Similarity))
                .ToList();

            _logger.LogInformation("RAG retrieved {Count} chunks for query", filtered.Count);
            return new RAGResult(sb.ToString(), sources);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "RAG retrieval failed — continuing without context");
            return new RAGResult(string.Empty, []);
        }
    }
}
