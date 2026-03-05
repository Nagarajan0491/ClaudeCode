namespace ChatbotAPI.Exceptions;

public class OllamaConnectionException : Exception
{
    public OllamaConnectionException(string message) : base(message) { }
    public OllamaConnectionException(string message, Exception innerException) : base(message, innerException) { }
}
