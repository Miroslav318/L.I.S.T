using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace List.Courses.Models;

[Table("groups")]
public class CourseGroup
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Required]
    [Column("course_id")]
    public int CourseId { get; set; }

    [ForeignKey("CourseId")]
    public Course Course { get; set; } = null!;

    [Required]
    [Column("created")]
    public DateTime Created { get; set; } = DateTime.UtcNow;

    [Required]
    [Column("updated")]
    public DateTime Updated { get; set; } = DateTime.UtcNow;

    public ICollection<GroupRoom> Rooms { get; set; } = new List<GroupRoom>();
    public ICollection<Participant> Participants { get; set; } = new List<Participant>();
}
