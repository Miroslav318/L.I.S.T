namespace List.Courses.DTOs;

public class CourseGroupDto
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int ParticipantCount { get; set; }
    public int Capacity { get; set; }
    public List<GroupRoomDto> Rooms { get; set; } = new();
}
