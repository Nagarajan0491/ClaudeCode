namespace ChatbotAPI.Exceptions;

public class GeminiConnectionException : Exception
{
    public GeminiConnectionException(string message) : base(message) { }
    public GeminiConnectionException(string message, Exception inner) : base(message, inner) { }
}
