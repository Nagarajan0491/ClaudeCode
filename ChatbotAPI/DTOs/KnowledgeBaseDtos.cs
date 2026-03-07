namespace ChatbotAPI.DTOs;

public class DocumentDto
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileType { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; }
    public int TotalChunks { get; set; }
    public bool IsActive { get; set; }
}

public class ChunkSearchResult
{
    public int ChunkId { get; set; }
    public int DocumentId { get; set; }
    public string DocumentTitle { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public double Similarity { get; set; }
}

public class SearchRequest
{
    public string Query { get; set; } = string.Empty;
    public int? TopK { get; set; }
}

// Returned alongside AI response to identify grounding sources
public record SourceReference(int ChunkId, int DocumentId, string DocumentTitle, double Similarity);
