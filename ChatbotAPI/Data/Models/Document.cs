namespace ChatbotAPI.Data.Models;

public class Document
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;       // max 255
    public string FileName { get; set; } = string.Empty;    // max 255
    public string FileType { get; set; } = string.Empty;    // "txt", "md"
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public int TotalChunks { get; set; }
    public ICollection<DocumentChunk> Chunks { get; set; } = [];
}
