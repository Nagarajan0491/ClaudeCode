using System.Net;

namespace ChatbotAPI.Exceptions;

public class GeminiConnectionException : Exception
{
    public HttpStatusCode? InnerStatusCode { get; }

    public GeminiConnectionException(string message) : base(message) { }
    public GeminiConnectionException(string message, Exception inner) : base(message, inner) { }
    public GeminiConnectionException(string message, Exception inner, HttpStatusCode? statusCode)
        : base(message, inner)
    {
        InnerStatusCode = statusCode;
    }
}
