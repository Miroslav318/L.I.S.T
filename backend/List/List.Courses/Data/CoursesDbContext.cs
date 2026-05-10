
using Microsoft.EntityFrameworkCore;
using List.Courses.Models;
using List.Users.Models;

namespace List.Courses.Data;

public class CoursesDbContext(DbContextOptions<CoursesDbContext> options) : DbContext(options)
{
    public DbSet<Period> Periods { get; set; }
    public DbSet<Course> Courses { get; set; }
    public DbSet<Participant> Participants { get; set; }
    public DbSet<CourseGroup> Groups { get; set; }
    public DbSet<GroupRoom> Rooms { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("Users");
            entity.HasKey(e => e.Id);
            entity.ToTable("Users", t => t.ExcludeFromMigrations());
        });


        modelBuilder.Entity<Course>()
                .HasOne(c => c.Period)
                .WithMany(p => p.Courses)
                .HasForeignKey(c => c.PeriodId)
                .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Course>()
            .HasOne(c => c.Teacher)
            .WithMany()
            .HasForeignKey(c => c.TeacherId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Participant>(entity =>
        {
            entity.ToTable("participants");

            entity.HasKey(e => e.Id);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Course)
                .WithMany(c => c.Participants)
                .HasForeignKey(e => e.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Group)
                .WithMany(g => g.Participants)
                .HasForeignKey(e => e.GroupId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => new { e.UserId, e.CourseId }).IsUnique();
        });

        modelBuilder.Entity<CourseGroup>(entity =>
        {
            entity.ToTable("groups");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Name)
                .HasColumnName("name")
                .IsRequired();

            entity.Property(e => e.CourseId).HasColumnName("course_id").IsRequired();
            entity.Property(e => e.Created).HasColumnName("created").IsRequired();
            entity.Property(e => e.Updated).HasColumnName("updated").IsRequired();

            entity.HasOne(e => e.Course)
                .WithMany(c => c.Groups)
                .HasForeignKey(e => e.CourseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.CourseId, e.Name }).IsUnique();
        });

        modelBuilder.Entity<GroupRoom>(entity =>
        {
            entity.ToTable("rooms");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.GroupId).HasColumnName("group_id").IsRequired();
            entity.Property(e => e.Name).HasColumnName("name").IsRequired();
            entity.Property(e => e.TimeBegin).HasColumnName("time_begin").IsRequired();
            entity.Property(e => e.TimeEnd).HasColumnName("time_end").IsRequired();
            entity.Property(e => e.TimeDay).HasColumnName("time_day").IsRequired();
            entity.Property(e => e.Capacity).HasColumnName("capacity").IsRequired();
            entity.Property(e => e.TeachersPlan).HasColumnName("teachers_plan");
            entity.Property(e => e.Created).HasColumnName("created").IsRequired();
            entity.Property(e => e.Updated).HasColumnName("updated").IsRequired();

            entity.HasOne(e => e.Group)
                .WithMany(g => g.Rooms)
                .HasForeignKey(e => e.GroupId)
                .OnDelete(DeleteBehavior.Cascade);
        });

    }

}
