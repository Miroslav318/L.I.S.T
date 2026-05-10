using List.Courses.Models;
using List.Tasks.Models;
using List.Tests.Models;
using List.Users.Models;
using Microsoft.EntityFrameworkCore;

namespace List.Tests.Data;

public class TestsDbContext(DbContextOptions<TestsDbContext> options) : DbContext(options)
{
    public DbSet<Test> Tests { get; set; }

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
        
        
        modelBuilder.Entity<CategoryModel>(entity =>
        {
            entity.ToTable("categories", t => t.ExcludeFromMigrations());
        });
        
        
        modelBuilder.Entity<Participant>(entity =>
        {
            entity.ToTable("participants", t => t.ExcludeFromMigrations());
            entity.Ignore(e => e.Group);
        });

        modelBuilder.Entity<Course>(entity =>
        {
            entity.Ignore(e => e.Groups);
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
    }
}
