namespace List.Assignments.DTOs;

public class AssignmentGroupSettingDto
{
    public int? Id { get; set; }
    public int GroupId { get; set; }
    public DateTime? PublishStartTime { get; set; }
    public DateTime? UploadEndTime { get; set; }
    public bool Active { get; set; } = true;
}
