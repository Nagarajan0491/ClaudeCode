namespace ChatbotAPI.Exceptions;

public class InvalidMessageException : Exception
{
    public InvalidMessageException(string message) : base(message) { }
}
