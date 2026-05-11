// List.Assignments/DTOs/AssignmentTaskRelSlimDto.cs
namespace List.Assignments.DTOs
{
    public class AssignmentTaskRelSlimDto
    {
        public int TaskId { get; set; }
        public TaskSlim Task { get; set; } = null!;

        public int AssignmentId { get; set; }

        public double PointsTotal { get; set; }
        public bool BonusTask { get; set; }
        public int? ProjectSelectionLimit { get; set; }
        public string InternalComment { get; set; } = "";

        public class TaskSlim
        {
            public int Id { get; set; }
            public string Name { get; set; } = "";
            public string Text { get; set; } = "";
            public string InternalComment { get; set; } = "";
            public string AuthorName { get; set; } = "";
        }
    }
}
