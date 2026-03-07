namespace ChatbotAPI.Exceptions;

public class EmbeddingException : Exception
{
    public EmbeddingException(string message) : base(message) { }
    public EmbeddingException(string message, Exception inner) : base(message, inner) { }
}
