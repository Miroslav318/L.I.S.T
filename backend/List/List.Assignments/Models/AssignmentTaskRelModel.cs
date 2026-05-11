using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using List.Tasks.Models;

namespace List.Assignments.Models;

[Table("assignment_task_rel")]
public class AssignmentTaskRelModel
{
    [Key]
    [Column("task_id")]
    public int TaskId { get; set; }

    [ForeignKey(nameof(TaskId))]
    public TaskModel Task { get; set; } = null!;

    [Key]
    [Column("assignment_id")]
    public int AssignmentId { get; set; }

    [ForeignKey(nameof(AssignmentId))]
    public AssignmentModel Assignment { get; set; } = null!;

    [Required]
    [Column("points_total")]
    public double PointsTotal { get; set; }

    [Column("bonus")]
    public bool BonusTask { get; set; }

    [Column("project_selection_limit")]
    public int? ProjectSelectionLimit { get; set; }

    [Column("internal_comment")]
    public string? InternalComment { get; set; }
}
