using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace List.Assignments.Models;

[Table("assignment_group_settings")]
public class AssignmentGroupSetting
{
    [Key]
    [Column("id")]
    public int Id { get; set; }

    [Required]
    [Column("assignment_id")]
    public int AssignmentId { get; set; }

    [ForeignKey(nameof(AssignmentId))]
    [JsonIgnore]
    public AssignmentModel Assignment { get; set; } = null!;

    [Required]
    [Column("group_id")]
    public int GroupId { get; set; }

    [Column("publish_start_time")]
    public DateTime? PublishStartTime { get; set; }

    [Column("upload_end_time")]
    public DateTime? UploadEndTime { get; set; }

    [Required]
    [Column("active")]
    public bool Active { get; set; } = true;
}
