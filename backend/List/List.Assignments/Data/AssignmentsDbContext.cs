using Microsoft.EntityFrameworkCore;
using List.Assignments.Models;
using List.Tasks.Models;
using List.Courses.Models;
using List.TaskSets.Models;
using List.Users.Models;

namespace List.Assignments.Data;

public class AssignmentsDbContext(DbContextOptions<AssignmentsDbContext> options) : DbContext(options)
{
    public DbSet<AssignmentModel> Assignments { get; set; }
    public DbSet<AssignmentTaskRelModel> AssignmentTaskRels { get; set; }
    public DbSet<AssignmentGroupSetting> AssignmentGroupSettings { get; set; }
    public DbSet<SolutionModel> Solutions { get; set; }
    public DbSet<SolutionVersionModel> SolutionVersions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<TaskModel>(entity =>
        {
            entity.ToTable("tasks", t => t.ExcludeFromMigrations());
        });

        modelBuilder.Entity<TaskCategoryRel>(entity =>
        {
            entity.ToTable("task_category_rel", t => t.ExcludeFromMigrations());
            entity.HasKey(x => new { x.TaskId, x.CategoryId });
        });

        modelBuilder.Entity<TaskSetType>(entity =>
        {
            entity.ToTable("task_set_types", t => t.ExcludeFromMigrations());
        });

        modelBuilder.Entity<CategoryModel>(entity =>
        {
            entity.ToTable("categories", t => t.ExcludeFromMigrations());
        });

        modelBuilder.Entity<Course>(entity =>
        {
            entity.ToTable("Courses", t => t.ExcludeFromMigrations());
            entity.Ignore(e => e.Groups);
        });

        modelBuilder.Entity<Participant>(entity =>
        {
            entity.ToTable("participants", t => t.ExcludeFromMigrations());
            entity.Ignore(e => e.Group);
        });

        modelBuilder.Ignore<CourseGroup>();
        modelBuilder.Ignore<GroupRoom>();

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users", t => t.ExcludeFromMigrations());
            entity.HasKey(e => e.Id);
        });

        modelBuilder.Entity<Period>(entity =>
        {
            entity.ToTable("Periods", t => t.ExcludeFromMigrations());
        });

        modelBuilder.Entity<CourseTaskSetRel>(entity =>
        {
            entity.ToTable("course_task_set_rel", t => t.ExcludeFromMigrations());
        });

        // Relacia Assignment ↔ AssignmentTaskRel
        modelBuilder.Entity<AssignmentTaskRelModel>()
            .HasOne(r => r.Assignment)
            .WithMany()
            .HasForeignKey(r => r.AssignmentId)
            .OnDelete(DeleteBehavior.Cascade);

        // Relacia Task ↔ AssignmentTaskRel
        modelBuilder.Entity<AssignmentTaskRelModel>()
            .HasOne(r => r.Task)
            .WithMany()
            .HasForeignKey(r => r.TaskId)
            .OnDelete(DeleteBehavior.Restrict);

        // Composite Key (TaskId + AssignmentId)
        modelBuilder.Entity<AssignmentTaskRelModel>()
            .HasKey(r => new { r.TaskId, r.AssignmentId });

        // Relacia Assignment ↔ TaskSetType
        modelBuilder.Entity<AssignmentModel>()
            .HasOne(a => a.TaskSetType)
            .WithMany()
            .HasForeignKey(a => a.TaskSetTypeId)
            .OnDelete(DeleteBehavior.Restrict);

        // Relacia Assignment ↔ Course
        modelBuilder.Entity<AssignmentModel>()
            .HasOne(a => a.Course)
            .WithMany()
            .HasForeignKey(a => a.CourseId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AssignmentModel>()
            .HasOne(a => a.Teacher)
            .WithMany()
            .HasForeignKey(a => a.TeacherId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AssignmentModel>()
            .HasOne(a => a.CourseTaskSetRel)
            .WithMany() // ak nechceš navigáciu naspäť
            .HasForeignKey(a => new { a.CourseId, a.TaskSetTypeId })
            .HasPrincipalKey(c => new { c.CourseId, c.TaskSetTypeId })
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<AssignmentGroupSetting>(entity =>
        {
            entity.ToTable("assignment_group_settings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.AssignmentId).HasColumnName("assignment_id").IsRequired();
            entity.Property(e => e.GroupId).HasColumnName("group_id").IsRequired();
            entity.Property(e => e.PublishStartTime).HasColumnName("publish_start_time");
            entity.Property(e => e.UploadEndTime).HasColumnName("upload_end_time");
            entity.Property(e => e.Active).HasColumnName("active").IsRequired();

            entity.HasOne(e => e.Assignment)
                .WithMany(a => a.GroupSettings)
                .HasForeignKey(e => e.AssignmentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.AssignmentId, e.GroupId }).IsUnique();
        });

        modelBuilder.Entity<SolutionModel>()
            .HasOne(s => s.Assignment)
            .WithMany(a => a.Solutions)
            .HasForeignKey(s => s.AssignmentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SolutionModel>()
            .HasOne(s => s.Student)
            .WithMany()
            .HasForeignKey(s => s.StudentId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<SolutionModel>()
            .HasOne(s => s.Teacher)
            .WithMany()
            .HasForeignKey(s => s.TeacherId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<SolutionModel>()
            .HasMany(s => s.Versions)
            .WithOne(v => v.Solution)
            .HasForeignKey(v => v.SolutionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<SolutionVersionModel>()
            .HasKey(v => v.Id);
    }
}
