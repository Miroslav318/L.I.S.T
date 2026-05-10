namespace List.Courses.DTOs;

public class ParticipantManualCreateDto
{
    public int CourseId { get; set; }
    public string Email { get; set; } = string.Empty;
    public int? GroupId { get; set; }
    public bool Allowed { get; set; } = true;
}
