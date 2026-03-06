using System.Net;
using System.Text.Json;
using ChatbotAPI.Exceptions;

namespace ChatbotAPI.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        var (statusCode, message) = ex switch
        {
            OllamaConnectionException => (HttpStatusCode.ServiceUnavailable, ex.Message),
            GeminiConnectionException gce
                when gce.InnerStatusCode is System.Net.HttpStatusCode.Forbidden
                  or System.Net.HttpStatusCode.Unauthorized
                => (HttpStatusCode.Unauthorized,
                    "Gemini API key is invalid or not authorized. Check the Gemini:ApiKey setting."),

            GeminiConnectionException => (HttpStatusCode.ServiceUnavailable, ex.Message),
            ConversationNotFoundException => (HttpStatusCode.NotFound, ex.Message),
            InvalidMessageException => (HttpStatusCode.BadRequest, ex.Message),
            KeyNotFoundException => (HttpStatusCode.NotFound, ex.Message),
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred.")
        };

        if (statusCode == HttpStatusCode.InternalServerError)
            _logger.LogError(ex, "Unhandled exception: {Message}", ex.Message);
        else
            _logger.LogWarning(ex, "Handled exception: {Message}", ex.Message);

        context.Response.StatusCode = (int)statusCode;
        context.Response.ContentType = "application/json";

        var response = new { error = message, statusCode = (int)statusCode };
        await context.Response.WriteAsync(JsonSerializer.Serialize(response));
    }
}
