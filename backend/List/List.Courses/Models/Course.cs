using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using List.Users.Models;

namespace List.Courses.Models;

public class Course
{
    [Key]
    public int Id { get; set; }

    [Required]
    [Column("name")]
    public string Name { get; set; } = string.Empty;

    [Column("period_id")]
    public int? PeriodId { get; set; }
    public Period Period { get; set; } = null!;

    [Required]
    [Column("capacity")]
    public int Capacity { get; set; }

    [Column("group_change_deadline")]
    public DateTime? GroupChangeDeadline { get; set; }

    [Column("enrollment_limit")]
    public DateTime? EnrollmentLimit { get; set; }

    [Required]
    [Column("hidden")]
    public bool HiddenInList { get; set; }

    [Required]
    [Column("auto_accept_students")]
    public bool AutoAcceptStudents { get; set; }

    [Column("teacher_id")]
    public int TeacherId { get; set; }

    [ForeignKey("TeacherId")]
    public User Teacher { get; set; } = null!;

    [Column("image_url")]
    public string? ImageUrl { get; set; }

    [Column("description")]
    public string? Description { get; set; }


    public ICollection<Participant> Participants { get; set; } = new List<Participant>();
    public ICollection<CourseGroup> Groups { get; set; } = new List<CourseGroup>();
}
