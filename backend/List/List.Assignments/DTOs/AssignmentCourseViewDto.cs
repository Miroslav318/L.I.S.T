namespace List.Assignments.DTOs;

public class AssignmentCourseViewDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public int TaskSetTypeId { get; set; }
    public string TaskSetTypeName { get; set; } = string.Empty;
    public string? TaskSetTypeIdentifier { get; set; }
    public DateTime? PublishStartTime { get; set; }
    public DateTime? UploadEndTime { get; set; }
    public double? PointsOverride { get; set; }
    public bool Published { get; set; }
    public int? GroupId { get; set; }
}
