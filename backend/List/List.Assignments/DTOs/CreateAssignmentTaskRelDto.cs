namespace List.Assignments.DTOs;

public class CreateAssignmentTaskRelDto
{
    public int AssignmentId { get; set; }
    public int TaskId { get; set; }
    public double PointsTotal { get; set; }
    public bool BonusTask { get; set; }
    public int? ProjectSelectionLimit { get; set; }
    public string? InternalComment { get; set; }
}
