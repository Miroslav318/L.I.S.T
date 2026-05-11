using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using List.TaskSets.Models;
using List.Courses.Models;
using List.Users.Models;

namespace List.Assignments.Models;

public class AssignmentTaskRelDto
{
	public int TaskId { get; set; }
	public int AssignmentId { get; set; }
	public double PointsTotal { get; set; }
	public bool BonusTask { get; set; }
	public int? ProjectSelectionLimit { get; set; }
	public string? InternalComment { get; set; }

	public TaskDto Task { get; set; } = null!;
}

public class TaskDto
{
	public int Id { get; set; }
	public string Name { get; set; } = null!;
	public string? Text { get; set; }
	public string? InternalComment { get; set; }
	public int AuthorId { get; set; }
	public string? Fullname { get; set; }
}
