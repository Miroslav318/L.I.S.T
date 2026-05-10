namespace List.Courses.DTOs;

public class ParticipantGroupUpdateDto
{
    public int CourseId { get; set; }
    public int UserId { get; set; }
    public int? GroupId { get; set; }
}
