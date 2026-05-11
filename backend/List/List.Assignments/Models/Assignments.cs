using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using List.TaskSets.Models;
using List.Courses.Models;
using List.Users.Models;

namespace List.Assignments.Models;

[Table("assignments")]
public class AssignmentModel
{
    [Key]
    public int Id { get; set; }

    [Required]
    [Column("created")]
    public DateTime Created { get; set; }

    [Required]
    [Column("updated")]
    public DateTime Updated { get; set; }

    [Column("name")]
    public string Name { get; set; }

    [Required]
    [Column("task_set_type_id")]
    public int TaskSetTypeId { get; set; }

    [ForeignKey(nameof(TaskSetTypeId))]
    public TaskSetType TaskSetType { get; set; } = null!;

    [Required]
    [Column("course_id")]
    public int CourseId { get; set; }

    [ForeignKey(nameof(CourseId))]
    public Course Course { get; set; } = null!;

    [Required]
    [Column("teacher_id")]
    public int TeacherId { get; set; }

    [ForeignKey(nameof(TeacherId))]
    public User Teacher { get; set; } = null!;

    [Required]
    [Column("published")]
    public bool Published { get; set; }

    [Column("publish_start_time")]
    public DateTime? PublishStartTime { get; set; }

    [Column("upload_end_time")]
    public DateTime? UploadEndTime { get; set; }

    [Column("project_selection_deadline")]
    public DateTime? ProjectSelectionDeadline { get; set; }

    [Column("instructions")]
    public string? Instructions { get; set; }

    [Column("points_override")]
    public double? PointsOverride { get; set; }

    [Column("internal_comment")]
    public string? InternalComment { get; set; }

    public CourseTaskSetRel CourseTaskSetRel { get; set; } = null!;

    [InverseProperty(nameof(SolutionModel.Assignment))]
    public ICollection<SolutionModel> Solutions { get; set; } = new List<SolutionModel>();

    [InverseProperty(nameof(AssignmentGroupSetting.Assignment))]
    public ICollection<AssignmentGroupSetting> GroupSettings { get; set; } = new List<AssignmentGroupSetting>();

    [InverseProperty(nameof(ProjectSelection.Assignment))]
    public ICollection<ProjectSelection> ProjectSelections { get; set; } = new List<ProjectSelection>();
}
