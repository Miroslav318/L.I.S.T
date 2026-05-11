namespace List.Assignments.DTOs;

public class ProjectSelectionUpdateDto
{
    public int? TaskId { get; set; }
}

public class StudentProjectListItemDto
{
    public int AssignmentId { get; set; }
    public string AssignmentName { get; set; } = string.Empty;
    public string TaskSetTypeName { get; set; } = string.Empty;
    public string? TaskSetTypeIdentifier { get; set; }
    public int? SelectedTaskId { get; set; }
    public string? SelectedTaskName { get; set; }
    public int SolutionCount { get; set; }
    public DateTime? UploadEndTime { get; set; }
    public DateTime? ProjectSelectionDeadline { get; set; }
    public double? Points { get; set; }
    public double? MaxPoints { get; set; }
    public bool CanUpload { get; set; }
}

public class ProjectDetailDto
{
    public int AssignmentId { get; set; }
    public string AssignmentName { get; set; } = string.Empty;
    public string TaskSetTypeName { get; set; } = string.Empty;
    public string? Instructions { get; set; }
    public DateTime? UploadEndTime { get; set; }
    public DateTime? ProjectSelectionDeadline { get; set; }
    public int? SelectedTaskId { get; set; }
    public string? SelectedTaskName { get; set; }
    public bool CanSelect { get; set; }
    public bool CanUpload { get; set; }
    public bool HasSubmittedSolution { get; set; }
    public List<ProjectTopicDto> Topics { get; set; } = new();
}

public class ProjectTopicDto
{
    public int TaskId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Text { get; set; }
    public string? AuthorName { get; set; }
    public double PointsTotal { get; set; }
    public int? SelectionLimit { get; set; }
    public int SelectedCount { get; set; }
    public int? FreeSlots { get; set; }
    public bool IsFull { get; set; }
    public List<ProjectSelectedStudentDto> Students { get; set; } = new();
}

public class ProjectSelectedStudentDto
{
    public int StudentId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool HasSolution { get; set; }
}

public class TeacherProjectSelectionsDto
{
    public int AssignmentId { get; set; }
    public string AssignmentName { get; set; } = string.Empty;
    public List<ProjectTopicDto> Topics { get; set; } = new();
    public List<ProjectSelectedStudentDto> UnassignedStudents { get; set; } = new();
}
