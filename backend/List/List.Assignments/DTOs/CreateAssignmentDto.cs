namespace List.Assignments.DTOs;

public class CreateAssignmentDto
{
    public string Name { get; set; }
    public int TaskSetTypeId { get; set; }
    public int CourseId { get; set; }
    public int TeacherId { get; set; }
    public bool Published { get; set; }
    public DateTime? PublishStartTime { get; set; }
    public DateTime? UploadEndTime { get; set; }
    public string? Instructions { get; set; }
    public double? PointsOverride { get; set; }
    public string? InternalComment { get; set; }
    public List<AssignmentGroupSettingDto> GroupSettings { get; set; } = new();
}
