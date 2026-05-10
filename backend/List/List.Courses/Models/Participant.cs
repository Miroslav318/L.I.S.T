using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using List.Users.Models;

namespace List.Courses.Models;

[Table("participants")]
public class Participant
{
	[Key]
	[Column("id")]
	public int Id { get; set; }

	[Required]
	[Column("user_id")]
	public int UserId { get; set; }

	[ForeignKey("UserId")]
	public User User { get; set; } = null!;

	[Required]
	[Column("course_id")]
	public int CourseId { get; set; }

	[ForeignKey("CourseId")]
	public Course Course { get; set; } = null!;

	[Required]
	[Column("created")]
	public DateTime Created { get; set; } = DateTime.UtcNow;

    [Required]
    [Column("allowed")]
    public bool Allowed { get; set; } = false;

    [Column("group_id")]
    public int? GroupId { get; set; }

    [ForeignKey("GroupId")]
    public CourseGroup? Group { get; set; }
}
