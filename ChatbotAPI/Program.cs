using ChatbotAPI.Data;
using ChatbotAPI.Middleware;
using ChatbotAPI.Services;
using ChatbotAPI.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.SemanticKernel;
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
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAngular", policy =>
        policy.WithOrigins("http://localhost:4200")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

// Database
builder.Services.AddDbContext<ChatDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// AI provider — selected via AIProvider:Provider config key
var providerName = builder.Configuration.GetValue<string>("AIProvider:Provider", "Ollama");

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

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Middleware pipeline
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<LoggingMiddleware>();

app.UseCors("AllowAngular");
app.UseAuthorization();
app.MapControllers();

// Auto-create database schema
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ChatDbContext>();
    try
    {
        db.Database.EnsureCreated();
        Log.Information("Database schema verified/created successfully");
    }
    catch (Exception ex)
    {
        Log.Warning(ex, "Failed to initialize database. Ensure PostgreSQL is running.");
    }
}

app.Run();
