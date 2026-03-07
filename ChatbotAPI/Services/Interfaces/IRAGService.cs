using ChatbotAPI.DTOs;

namespace ChatbotAPI.Services.Interfaces;

public record RAGResult(string ContextBlock, IReadOnlyList<SourceReference> Sources);

public interface IRAGService
{
    Task<RAGResult> RetrieveContextAsync(string query, CancellationToken ct = default);
}
