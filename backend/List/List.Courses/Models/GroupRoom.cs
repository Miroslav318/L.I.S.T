using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace List.Courses.Models;

[Table("rooms")]
public class GroupRoom
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("group_id")]
    public int GroupId { get; set; }

    [ForeignKey("GroupId")]
    public CourseGroup Group { get; set; } = null!;

    [Required]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Column("time_begin")]
    public int TimeBegin { get; set; }

    [Required]
    [Column("time_end")]
    public int TimeEnd { get; set; }

    [Required]
    [Column("time_day")]
    public int TimeDay { get; set; }

    [Required]
    [Column("capacity")]
    public int Capacity { get; set; }

    [Column("teachers_plan")]
    public string? TeachersPlan { get; set; }

    [Required]
    [Column("created")]
    public DateTime Created { get; set; } = DateTime.UtcNow;

    [Required]
    [Column("updated")]
    public DateTime Updated { get; set; } = DateTime.UtcNow;
}
