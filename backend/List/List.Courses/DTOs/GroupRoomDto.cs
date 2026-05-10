namespace List.Courses.DTOs;

public class GroupRoomDto
{
    public int Id { get; set; }
    public int GroupId { get; set; }
    public string Name { get; set; } = string.Empty;
    public int TimeBegin { get; set; }
    public int TimeEnd { get; set; }
    public int TimeDay { get; set; }
    public int Capacity { get; set; }
    public string? TeachersPlan { get; set; }
}
