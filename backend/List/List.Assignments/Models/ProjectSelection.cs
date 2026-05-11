using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using List.Tasks.Models;
using List.Users.Models;

namespace List.Assignments.Models;

[Table("project_selections")]
public class ProjectSelection
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("created")]
    public DateTime Created { get; set; } = DateTime.UtcNow;

    [Required]
    [Column("updated")]
    public DateTime Updated { get; set; } = DateTime.UtcNow;

    [Required]
    [Column("assignment_id")]
    public int AssignmentId { get; set; }

    [ForeignKey(nameof(AssignmentId))]
    public AssignmentModel Assignment { get; set; } = null!;

    [Required]
    [Column("task_id")]
    public int TaskId { get; set; }

    [ForeignKey(nameof(TaskId))]
    public TaskModel Task { get; set; } = null!;

    [Required]
    [Column("student_id")]
    public int StudentId { get; set; }

    [ForeignKey(nameof(StudentId))]
    public User Student { get; set; } = null!;
}
