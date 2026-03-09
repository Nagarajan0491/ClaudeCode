using ChatbotAPI.Data.Models;
using Microsoft.EntityFrameworkCore;

namespace ChatbotAPI.Data;

public class ChatDbContext : DbContext
{
    public ChatDbContext(DbContextOptions<ChatDbContext> options) : base(options) { }

    public DbSet<Conversation> Conversations => Set<Conversation>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<PluginRegistration> PluginRegistrations => Set<PluginRegistration>();
    public DbSet<DataSource> DataSources => Set<DataSource>();
    public DbSet<RegisteredAction> RegisteredActions => Set<RegisteredAction>();
    public DbSet<Document> Documents => Set<Document>();
    public DbSet<DocumentChunk> DocumentChunks => Set<DocumentChunk>();
    public DbSet<HostAppAction> HostAppActions => Set<HostAppAction>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.HasPostgresExtension("vector");

        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Role).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Content).IsRequired();
            entity.Property(e => e.InputMethod).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Timestamp).IsRequired();

            entity.HasOne(e => e.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(e => e.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PluginRegistration>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.HasIndex(e => e.Name).IsUnique().HasDatabaseName("IX_PluginRegistrations_Name");
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.EndpointUrl).HasMaxLength(2000).IsRequired();
            entity.Property(e => e.HttpMethod).HasMaxLength(10).HasDefaultValue("POST");
            entity.Property(e => e.ParameterSchema).HasDefaultValue("{}");
        });

        modelBuilder.Entity<Document>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.FileName).HasMaxLength(255).IsRequired();
            entity.Property(e => e.FileType).HasMaxLength(10).IsRequired();
        });

        modelBuilder.Entity<DocumentChunk>(entity =>
        {
            entity.HasKey(e => e.Id);
            // Embedding is a pgvector type — ignored by EF Core 8 (no native mapping);
            // the column is created via raw SQL in Program.cs and written/read via ADO.NET.
            entity.Ignore(e => e.Embedding);
            entity.HasOne(e => e.Document)
                .WithMany(d => d.Chunks)
                .HasForeignKey(e => e.DocumentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<HostAppAction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.EndpointUrl).HasMaxLength(2000).IsRequired();
            entity.Property(e => e.HttpMethod).HasMaxLength(10).HasDefaultValue("GET");
            entity.Property(e => e.ParameterSchema).HasDefaultValue("{}");
            entity.Property(e => e.AuthType).HasMaxLength(20);
            entity.Property(e => e.AuthHeaderName).HasMaxLength(100);
            entity.Property(e => e.HostAppId).HasMaxLength(100);
            entity.HasIndex(e => new { e.Name, e.HostAppId })
                .IsUnique()
                .HasDatabaseName("IX_HostAppActions_Name_HostAppId");
        });
    }
}
