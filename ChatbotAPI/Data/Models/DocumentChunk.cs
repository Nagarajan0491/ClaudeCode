using Pgvector;

namespace ChatbotAPI.Data.Models;

public class DocumentChunk
{
    public int Id { get; set; }
    public int DocumentId { get; set; }
    public Document Document { get; set; } = null!;
    public string Content { get; set; } = string.Empty;
    public Vector Embedding { get; set; } = null!;   // pgvector type, 768-dim
    public int ChunkIndex { get; set; }
    public int TokenCount { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
