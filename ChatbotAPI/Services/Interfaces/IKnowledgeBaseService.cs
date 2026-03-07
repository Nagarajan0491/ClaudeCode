using ChatbotAPI.DTOs;

namespace ChatbotAPI.Services.Interfaces;

public interface IKnowledgeBaseService
{
    Task<DocumentDto> IngestAsync(string title, string fileName, string content, CancellationToken ct = default);
    Task<IEnumerable<DocumentDto>> GetAllAsync(CancellationToken ct = default);
    Task<bool> DeleteAsync(int id, CancellationToken ct = default);
    Task<IEnumerable<ChunkSearchResult>> SearchAsync(string query, int topK = 3, CancellationToken ct = default);
}
