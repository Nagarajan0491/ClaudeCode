using ChatbotAPI.Data;
using ChatbotAPI.Middleware;
using ChatbotAPI.Services;
using ChatbotAPI.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
using Npgsql;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Serilog
builder.Host.UseSerilog((context, config) =>
    config.ReadFrom.Configuration(context.Configuration)
          .WriteTo.Console());

// Controllers + Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS for Angular frontend
var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? ["http://localhost:4200"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// Database — use NpgsqlDataSourceBuilder to register pgvector type mapping
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")!;
var dataSourceBuilder = new NpgsqlDataSourceBuilder(connectionString);
dataSourceBuilder.UseVector();
var npgsqlDataSource = dataSourceBuilder.Build();

builder.Services.AddDbContext<ChatDbContext>(options =>
    options.UseNpgsql(npgsqlDataSource));

// AI provider — selected via AIProvider:Provider config key
var providerName = builder.Configuration.GetValue<string>("AIProvider:Provider", "Ollama");

// Allow GEMINI_API_KEY environment variable to supply the key.
// Check all three scopes so it works whether set at process, user, or machine level.
var geminiEnvKey =
    Environment.GetEnvironmentVariable("GEMINI_API_KEY", EnvironmentVariableTarget.Process) ??
    Environment.GetEnvironmentVariable("GEMINI_API_KEY", EnvironmentVariableTarget.User) ??
    Environment.GetEnvironmentVariable("GEMINI_API_KEY", EnvironmentVariableTarget.Machine);
if (!string.IsNullOrEmpty(geminiEnvKey))
    builder.Configuration["Gemini:ApiKey"] = geminiEnvKey;

if (providerName.Equals("Gemini", StringComparison.OrdinalIgnoreCase))
{
    var apiKey = builder.Configuration.GetValue<string>("Gemini:ApiKey");
    if (string.IsNullOrWhiteSpace(apiKey))
        throw new InvalidOperationException("Gemini:ApiKey must be configured when AIProvider:Provider = Gemini");

    var model = builder.Configuration.GetValue<string>("AIProvider:DefaultModel", "gemini-2.5-flash")!;
    builder.Services.AddGoogleAIGeminiChatCompletion(model, apiKey);
    builder.Services.AddScoped<IAIProvider, GeminiService>();
}
else  // default: Ollama
{
    builder.Services.AddHttpClient<OllamaService>();
    builder.Services.AddScoped<IAIProvider, OllamaService>();
}

builder.Services.AddHttpClient();

// Application services
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<IConversationRepository, ConversationRepository>();
builder.Services.AddScoped<IMessageRepository, MessageRepository>();
builder.Services.AddScoped<IPluginService, PluginService>();
builder.Services.AddScoped<IEmbeddingService, EmbeddingService>();
builder.Services.AddScoped<IKnowledgeBaseService, KnowledgeBaseService>();
builder.Services.AddScoped<IRAGService, RAGService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Middleware pipeline
app.UseMiddleware<LoggingMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseCors("AllowAngular");
app.UseAuthorization();
app.MapControllers();

// Auto-create database schema
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ChatDbContext>();
    try
    {
        db.Database.ExecuteSqlRaw("CREATE EXTENSION IF NOT EXISTS vector");
        db.Database.EnsureCreated();
        // EF Core 8 cannot map Vector natively — add the column outside EF Core's model
        db.Database.ExecuteSqlRaw(
            "ALTER TABLE \"DocumentChunks\" ADD COLUMN IF NOT EXISTS \"Embedding\" vector(768)");
        Log.Information("Database schema verified/created successfully");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Failed to initialize database. Ensure PostgreSQL is running.");
    }
}

app.Run();
