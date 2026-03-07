using ChatbotAPI.Data;
using ChatbotAPI.Data.Models;
using ChatbotAPI.DTOs;
using ChatbotAPI.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Pgvector;

namespace ChatbotAPI.Services;

public class KnowledgeBaseService : IKnowledgeBaseService
{
    private readonly ChatDbContext _context;
    private readonly IEmbeddingService _embeddingService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<KnowledgeBaseService> _logger;

    public KnowledgeBaseService(
        ChatDbContext context,
        IEmbeddingService embeddingService,
        IConfiguration configuration,
        ILogger<KnowledgeBaseService> logger)
    {
        _context = context;
        _embeddingService = embeddingService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<DocumentDto> IngestAsync(string title, string fileName, string content, CancellationToken ct = default)
    {
        var chunkSize = _configuration.GetValue<int>("RAG:ChunkSize", 500);
        var chunkOverlap = _configuration.GetValue<int>("RAG:ChunkOverlap", 50);
        var fileType = Path.GetExtension(fileName).TrimStart('.').ToLowerInvariant();

        var textChunks = ChunkText(content, chunkSize, chunkOverlap);

        var document = new Document
        {
            Title = title,
            FileName = fileName,
            FileType = fileType,
            TotalChunks = textChunks.Count,
            UploadedAt = DateTime.UtcNow
        };
        _context.Documents.Add(document);
        await _context.SaveChangesAsync(ct);

        // Insert chunks via raw ADO.NET so Npgsql handles the Vector type natively.
        // EF Core 8 cannot map pgvector's Vector type without Pgvector.EntityFrameworkCore (which targets EF Core 9+).
        var connection = _context.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open)
            await _context.Database.OpenConnectionAsync(ct);

        for (var i = 0; i < textChunks.Count; i++)
        {
            var chunk = textChunks[i];
            var embedding = await _embeddingService.GenerateEmbeddingAsync(chunk, ct);
            var wordCount = chunk.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;

            await using var cmd = connection.CreateCommand();
            cmd.CommandText = """
                INSERT INTO "DocumentChunks" ("DocumentId", "Content", "Embedding", "ChunkIndex", "TokenCount", "CreatedAt")
                VALUES ($1, $2, $3, $4, $5, $6)
                """;
            cmd.Parameters.Add(new Npgsql.NpgsqlParameter { Value = document.Id });
            cmd.Parameters.Add(new Npgsql.NpgsqlParameter { Value = chunk });
            cmd.Parameters.Add(new Npgsql.NpgsqlParameter { Value = new Vector(embedding) });
            cmd.Parameters.Add(new Npgsql.NpgsqlParameter { Value = i });
            cmd.Parameters.Add(new Npgsql.NpgsqlParameter { Value = wordCount });
            cmd.Parameters.Add(new Npgsql.NpgsqlParameter { Value = DateTime.UtcNow });
            await cmd.ExecuteNonQueryAsync(ct);
        }

        _logger.LogInformation("Ingested document '{Title}' with {ChunkCount} chunks", title, textChunks.Count);
        return ToDto(document);
    }

    public async Task<IEnumerable<DocumentDto>> GetAllAsync(CancellationToken ct = default)
    {
        var docs = await _context.Documents.OrderByDescending(d => d.UploadedAt).ToListAsync(ct);
        return docs.Select(ToDto);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct = default)
    {
        var doc = await _context.Documents.FindAsync([id], ct);
        if (doc is null) return false;
        _context.Documents.Remove(doc);
        await _context.SaveChangesAsync(ct);
        return true;
    }

    public async Task<IEnumerable<ChunkSearchResult>> SearchAsync(string query, int topK = 3, CancellationToken ct = default)
    {
        var embedding = await _embeddingService.GenerateEmbeddingAsync(query, ct);
        var vectorStr = $"[{string.Join(",", embedding)}]";

        var results = new List<ChunkSearchResult>();

        var connection = _context.Database.GetDbConnection();
        if (connection.State != System.Data.ConnectionState.Open)
            await _context.Database.OpenConnectionAsync(ct);

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = $"""
            SELECT
                dc."Id",
                dc."DocumentId",
                d."Title",
                dc."Content",
                (dc."Embedding" <=> '{vectorStr}'::vector) AS distance
            FROM "DocumentChunks" dc
            JOIN "Documents" d ON dc."DocumentId" = d."Id"
            WHERE d."IsActive" = true
            ORDER BY distance
            LIMIT {topK}
            """;

        await using var reader = await cmd.ExecuteReaderAsync(ct);
        while (await reader.ReadAsync(ct))
        {
            results.Add(new ChunkSearchResult
            {
                ChunkId = reader.GetInt32(0),
                DocumentId = reader.GetInt32(1),
                DocumentTitle = reader.GetString(2),
                Content = reader.GetString(3),
                Similarity = 1.0 - reader.GetDouble(4)
            });
        }

        return results;
    }

    private static List<string> ChunkText(string content, int chunkSize, int chunkOverlap)
    {
        var words = content.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var chunks = new List<string>();
        var stride = Math.Max(1, chunkSize - chunkOverlap);
        for (var i = 0; i < words.Length; i += stride)
        {
            var end = Math.Min(i + chunkSize, words.Length);
            chunks.Add(string.Join(" ", words[i..end]));
            if (end >= words.Length) break;
        }
        return chunks;
    }

    private static DocumentDto ToDto(Document d) => new()
    {
        Id = d.Id,
        Title = d.Title,
        FileName = d.FileName,
        FileType = d.FileType,
        UploadedAt = d.UploadedAt,
        TotalChunks = d.TotalChunks,
        IsActive = d.IsActive
    };
}
