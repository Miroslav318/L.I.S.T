using List.Assignments.Data;
using List.Assignments.DTOs;
using List.Assignments.Models;
using List.Common.Models;
using List.Courses.Data;
using Microsoft.EntityFrameworkCore;

namespace List.Assignments.Services;

public class AssignmentService : IAssignmentService
{
    private readonly AssignmentsDbContext _dbContext;
    private readonly CoursesDbContext _coursesDbContext;

    public AssignmentService(AssignmentsDbContext dbContext, CoursesDbContext coursesDbContext)
    {
        _dbContext = dbContext;
        _coursesDbContext = coursesDbContext;
    }

    public async Task<List<AssignmentModel>> GetAllAsync()
    {
        return await _dbContext.Assignments
            .Include(a => a.TaskSetType)
            .Include(a => a.Course)
            .Include(a => a.GroupSettings)
            .ToListAsync();
    }

    public async Task<AssignmentModel?> GetByIdAsync(int id)
    {
        return await _dbContext.Assignments
            .Include(a => a.TaskSetType)
            .Include(a => a.Course)
            .Include(a => a.GroupSettings)
            .FirstOrDefaultAsync(a => a.Id == id);
    }

    public async Task<AssignmentNameDto?> GetAssignmentNameAsync(int assignmentId)
    {
        return await _dbContext.Assignments
            .AsNoTracking()
            .Where(a => a.Id == assignmentId)
            .Select(a => new AssignmentNameDto
            {
                Id = a.Id,
                Name = a.Name,
            })
            .FirstOrDefaultAsync();
    }

    public async Task<PagedResult<AssignmentModel>> GetFilteredAsync(AssignmentFilterDto filter)
    {
        var query = _dbContext.Assignments
            .Include(a => a.Course)
            .Include(a => a.TaskSetType)
            .Include(a => a.Teacher)
            .Include(a => a.GroupSettings)
            .AsQueryable();

        if (filter.UserId.HasValue)
            query = query.Where(a => a.TeacherId == filter.UserId);

        if (!string.IsNullOrWhiteSpace(filter.Name))
            query = query.Where(a => a.Name.ToLower().Contains(filter.Name.ToLower()));

        if (filter.CourseId.HasValue)
            query = query.Where(a => a.CourseId == filter.CourseId);

        var totalCount = await query.CountAsync();

        query = filter.Sort?.ToLower() switch
        {
            "id" => filter.Desc ? query.OrderByDescending(a => a.Id) : query.OrderBy(a => a.Id),
            "course" => filter.Desc ? query.OrderByDescending(a => a.Course.Name) : query.OrderBy(a => a.Course.Name),
            "teacher" => filter.Desc ? query.OrderByDescending(a => a.Teacher.Email) : query.OrderBy(a => a.Teacher.Email),
            "created" => filter.Desc ? query.OrderByDescending(a => a.Created) : query.OrderBy(a => a.Created),
            "updated" => filter.Desc ? query.OrderByDescending(a => a.Updated) : query.OrderBy(a => a.Updated),
            _ => query.OrderByDescending(a => a.Created)
        };

        var skip = (filter.Page - 1) * filter.PageSize;
        var items = await query.Skip(skip).Take(filter.PageSize).ToListAsync();

        return new PagedResult<AssignmentModel>
        {
            Items = items,
            TotalCount = totalCount
        };
    }

    public async Task<AssignmentModel> CreateAsync(CreateAssignmentDto assignmentDto, int teacherId)
    {
        var assignment = new AssignmentModel
        {
            Created = DateTime.UtcNow,
            Updated = DateTime.UtcNow,
            Name = assignmentDto.Name,
            TaskSetTypeId = assignmentDto.TaskSetTypeId,
            CourseId = assignmentDto.CourseId,
            Published = assignmentDto.Published,
            PublishStartTime = assignmentDto.PublishStartTime?.ToUniversalTime(),
            UploadEndTime = assignmentDto.UploadEndTime?.ToUniversalTime(),
            ProjectSelectionDeadline = assignmentDto.ProjectSelectionDeadline?.ToUniversalTime(),
            Instructions = assignmentDto.Instructions,
            PointsOverride = assignmentDto.PointsOverride,
            InternalComment = assignmentDto.InternalComment,
            TeacherId = teacherId,
        };

        _dbContext.Assignments.Add(assignment);
        await _dbContext.SaveChangesAsync();
        await ReplaceGroupSettingsAsync(assignment, assignmentDto.GroupSettings);

        return assignment;
    }

    public async Task<List<AssignmentModel>> GetByCourseAsync(int courseId)
    {
        return await _dbContext.Assignments
            .Where(a => a.CourseId == courseId)
            .Include(a => a.TaskSetType)
            .Include(a => a.GroupSettings)
            .ToListAsync();
    }

    public async Task<List<AssignmentCourseViewDto>> GetVisibleByCourseForStudentAsync(int courseId, int studentId)
    {
        var participant = await _coursesDbContext.Participants
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.CourseId == courseId && p.UserId == studentId && p.Allowed);

        if (participant == null)
            return new List<AssignmentCourseViewDto>();

        var now = DateTime.UtcNow;
        var assignments = await _dbContext.Assignments
            .AsNoTracking()
            .Where(a => a.CourseId == courseId)
            .Include(a => a.TaskSetType)
            .Include(a => a.GroupSettings)
            .ToListAsync();

        return assignments
            .Where(a => !IsProjectAssignment(a))
            .Select(a =>
            {
                var activeSettings = a.GroupSettings.Where(s => s.Active).ToList();
                if (activeSettings.Count == 0)
                {
                    if (!a.Published || (a.PublishStartTime.HasValue && a.PublishStartTime.Value > now))
                        return null;

                    return MapCourseView(a, null, a.PublishStartTime, a.UploadEndTime);
                }

                if (!participant.GroupId.HasValue)
                    return null;

                var setting = activeSettings.FirstOrDefault(s => s.GroupId == participant.GroupId.Value);
                if (setting == null)
                    return null;

                var publishStart = setting.PublishStartTime ?? a.PublishStartTime;
                if (!a.Published || (publishStart.HasValue && publishStart.Value > now))
                    return null;

                return MapCourseView(a, setting.GroupId, publishStart, setting.UploadEndTime ?? a.UploadEndTime);
            })
            .Where(a => a != null)
            .Cast<AssignmentCourseViewDto>()
            .OrderBy(a => a.UploadEndTime ?? DateTime.MaxValue)
            .ToList();
    }

    public async Task<AssignmentModel> CloneAsync(int id)
    {
        var original = await _dbContext.Assignments
            .Include(a => a.GroupSettings)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (original == null)
            throw new KeyNotFoundException($"Assignment {id} not found");

        var clone = new AssignmentModel
        {
            Name = original.Name,
            TaskSetTypeId = original.TaskSetTypeId,
            CourseId = original.CourseId,
            Published = original.Published,
            PublishStartTime = original.PublishStartTime,
            UploadEndTime = original.UploadEndTime,
            ProjectSelectionDeadline = original.ProjectSelectionDeadline,
            Instructions = original.Instructions,
            PointsOverride = original.PointsOverride,
            InternalComment = original.InternalComment,
            TeacherId = original.TeacherId,
            Created = DateTime.UtcNow,
            Updated = DateTime.UtcNow
        };

        _dbContext.Assignments.Add(clone);
        await _dbContext.SaveChangesAsync();

        foreach (var setting in original.GroupSettings)
        {
            _dbContext.AssignmentGroupSettings.Add(new AssignmentGroupSetting
            {
                AssignmentId = clone.Id,
                GroupId = setting.GroupId,
                PublishStartTime = setting.PublishStartTime,
                UploadEndTime = setting.UploadEndTime,
                Active = setting.Active
            });
        }

        var rels = await _dbContext.AssignmentTaskRels
            .Where(r => r.AssignmentId == id)
            .ToListAsync();

        foreach (var r in rels)
        {
            _dbContext.AssignmentTaskRels.Add(new AssignmentTaskRelModel
            {
                AssignmentId = clone.Id,
                TaskId = r.TaskId,
                PointsTotal = r.PointsTotal,
                BonusTask = r.BonusTask,
                ProjectSelectionLimit = r.ProjectSelectionLimit,
                InternalComment = r.InternalComment
            });
        }

        await _dbContext.SaveChangesAsync();
        return clone;
    }

    public async Task<AssignmentModel?> UpdateAsync(int id, CreateAssignmentDto updatedAssignmentDto)
    {
        var existingAssignment = await _dbContext.Assignments.FindAsync(id);
        if (existingAssignment == null)
            return null;

        existingAssignment.Updated = DateTime.UtcNow;
        existingAssignment.Name = updatedAssignmentDto.Name;
        existingAssignment.TaskSetTypeId = updatedAssignmentDto.TaskSetTypeId;
        existingAssignment.CourseId = updatedAssignmentDto.CourseId;
        existingAssignment.Published = updatedAssignmentDto.Published;
        existingAssignment.PublishStartTime = updatedAssignmentDto.PublishStartTime?.ToUniversalTime();
        existingAssignment.UploadEndTime = updatedAssignmentDto.UploadEndTime?.ToUniversalTime();
        existingAssignment.ProjectSelectionDeadline = updatedAssignmentDto.ProjectSelectionDeadline?.ToUniversalTime();
        existingAssignment.Instructions = updatedAssignmentDto.Instructions;
        existingAssignment.PointsOverride = updatedAssignmentDto.PointsOverride;
        existingAssignment.InternalComment = updatedAssignmentDto.InternalComment;

        await _dbContext.SaveChangesAsync();
        await ReplaceGroupSettingsAsync(existingAssignment, updatedAssignmentDto.GroupSettings);

        return existingAssignment;
    }

    public async Task<AssignmentModel?> DeleteAsync(int id)
    {
        var assignment = await _dbContext.Assignments.FindAsync(id);
        if (assignment == null)
            return null;

        _dbContext.Assignments.Remove(assignment);
        await _dbContext.SaveChangesAsync();

        return assignment;
    }

    public async Task<bool> CanUploadSolutionAsync(int assignmentId, int studentId)
    {
        var assignment = await _dbContext.Assignments
            .AsNoTracking()
            .Where(a => a.Id == assignmentId)
            .Include(a => a.CourseTaskSetRel)
            .Include(a => a.GroupSettings)
            .FirstOrDefaultAsync();

        if (assignment == null)
            return false;

        var participant = await _coursesDbContext.Participants
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.CourseId == assignment.CourseId && p.UserId == studentId && p.Allowed);

        if (participant == null)
            return false;

        var now = DateTime.UtcNow;
        var activeSettings = assignment.GroupSettings.Where(s => s.Active).ToList();
        DateTime? publishStart = assignment.PublishStartTime;
        DateTime? uploadEnd = assignment.UploadEndTime;

        if (activeSettings.Count > 0)
        {
            if (!participant.GroupId.HasValue)
                return false;

            var setting = activeSettings.FirstOrDefault(s => s.GroupId == participant.GroupId.Value);
            if (setting == null)
                return false;

            publishStart = setting.PublishStartTime ?? assignment.PublishStartTime;
            uploadEnd = setting.UploadEndTime ?? assignment.UploadEndTime;
        }

        return assignment.CourseTaskSetRel.UploadSolution &&
            assignment.Published &&
            (!publishStart.HasValue || publishStart.Value <= now) &&
            (!uploadEnd.HasValue || uploadEnd.Value > now);
    }

    public async Task<double?> CalculateMaxPoints(int assignmentId)
    {
        var assignment = await _dbContext.Assignments
            .AsNoTracking()
            .Where(a => a.Id == assignmentId)
            .Select(a => new
            {
                a.PointsOverride
            })
            .FirstOrDefaultAsync();

        if (assignment == null)
            return null;

        if (assignment.PointsOverride.HasValue)
            return assignment.PointsOverride.Value;

        return await _dbContext.AssignmentTaskRels
            .AsNoTracking()
            .Where(r => r.AssignmentId == assignmentId && !r.BonusTask)
            .Select(r => (double?)r.PointsTotal)
            .SumAsync();
    }

    private async Task ReplaceGroupSettingsAsync(AssignmentModel assignment, List<AssignmentGroupSettingDto> settings)
    {
        var existing = await _dbContext.AssignmentGroupSettings
            .Where(s => s.AssignmentId == assignment.Id)
            .ToListAsync();

        _dbContext.AssignmentGroupSettings.RemoveRange(existing);

        var validSettings = new List<AssignmentGroupSetting>();
        foreach (var setting in settings.Where(s => s.GroupId > 0))
        {
            var groupBelongsToCourse = await _coursesDbContext.Groups
                .AnyAsync(g => g.Id == setting.GroupId && g.CourseId == assignment.CourseId);

            if (!groupBelongsToCourse)
                throw new InvalidOperationException("Skupina nepatri do kurzu zadania.");

            if (validSettings.Any(s => s.GroupId == setting.GroupId))
                continue;

            validSettings.Add(new AssignmentGroupSetting
            {
                AssignmentId = assignment.Id,
                GroupId = setting.GroupId,
                PublishStartTime = setting.PublishStartTime?.ToUniversalTime(),
                UploadEndTime = setting.UploadEndTime?.ToUniversalTime(),
                Active = setting.Active
            });
        }

        _dbContext.AssignmentGroupSettings.AddRange(validSettings);
        await _dbContext.SaveChangesAsync();
    }

    private static AssignmentCourseViewDto MapCourseView(
        AssignmentModel assignment,
        int? groupId,
        DateTime? publishStartTime,
        DateTime? uploadEndTime)
    {
        return new AssignmentCourseViewDto
        {
            Id = assignment.Id,
            Name = assignment.Name,
            TaskSetTypeId = assignment.TaskSetTypeId,
            TaskSetTypeName = assignment.TaskSetType.Name,
            TaskSetTypeIdentifier = assignment.TaskSetType.Identifier,
            PublishStartTime = publishStartTime,
            UploadEndTime = uploadEndTime,
            PointsOverride = assignment.PointsOverride,
            Published = assignment.Published,
            GroupId = groupId
        };
    }

    private static bool IsProjectAssignment(AssignmentModel assignment)
    {
        var identifier = assignment.TaskSetType.Identifier?.ToLowerInvariant() ?? string.Empty;
        var name = assignment.TaskSetType.Name.ToLowerInvariant();

        return identifier.Contains("project") ||
            identifier.Contains("projekt") ||
            name.Contains("project") ||
            name.Contains("projekt");
    }
}
