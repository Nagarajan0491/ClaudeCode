namespace ChatbotAPI.Exceptions;

public class ConversationNotFoundException : KeyNotFoundException
{
    public ConversationNotFoundException(int id) : base($"Conversation with ID {id} was not found.") { }
}
