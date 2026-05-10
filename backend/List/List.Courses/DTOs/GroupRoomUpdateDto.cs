namespace List.Courses.DTOs;

public class GroupRoomUpdateDto
{
    public string Name { get; set; } = string.Empty;
    public int TimeBegin { get; set; }
    public int TimeEnd { get; set; }
    public int TimeDay { get; set; }
    public int Capacity { get; set; }
    public string? TeachersPlan { get; set; }
}
