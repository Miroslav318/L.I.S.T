using List.Assignments.Data;
using List.Assignments.Models;
using List.Assignments.DTOs;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace List.Assignments.Services;

public class AssignmentTaskRelService : IAssignmentTaskRelService
{


    private readonly AssignmentsDbContext _dbContext;

    public AssignmentTaskRelService(AssignmentsDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<AssignmentTaskRelModel> CreateAsync(CreateAssignmentTaskRelDto dto)
    {
        var rel = new AssignmentTaskRelModel
        {
            AssignmentId = dto.AssignmentId,
            TaskId = dto.TaskId,
            PointsTotal = dto.PointsTotal,
            BonusTask = dto.BonusTask,
            ProjectSelectionLimit = NormalizeProjectSelectionLimit(dto.ProjectSelectionLimit),
            InternalComment = dto.InternalComment
        };

        _dbContext.AssignmentTaskRels.Add(rel);

        await _dbContext.SaveChangesAsync();


        return rel;
    }

    public async Task<AssignmentTaskRelModel?> UpdateAsync(CreateAssignmentTaskRelDto dto)
        {
            // Hľadáme podľa composite PK: (taskId, assignmentId)
            var rel = await _dbContext.AssignmentTaskRels
                .FindAsync(dto.TaskId, dto.AssignmentId);

            if (rel == null)
                return null;

            rel.PointsTotal = dto.PointsTotal;
            rel.BonusTask = dto.BonusTask;
            rel.ProjectSelectionLimit = NormalizeProjectSelectionLimit(dto.ProjectSelectionLimit);
            rel.InternalComment = dto.InternalComment;

            await _dbContext.SaveChangesAsync();
            return rel;
        }

    public async Task<bool> DeleteAsync(int taskId, int assignmentId)
    {
        var rel = await _dbContext.AssignmentTaskRels
            .FirstOrDefaultAsync(r => r.TaskId == taskId && r.AssignmentId == assignmentId);

        if (rel == null)
        {
            return false;
        }

        _dbContext.AssignmentTaskRels.Remove(rel);
        await _dbContext.SaveChangesAsync();
        return true;
    }

    public async Task<List<AssignmentTaskRelModel>> GetAllAsync()
    {
        return await _dbContext.AssignmentTaskRels
            .Include(r => r.Task)
            .Include(r => r.Assignment)
            .ToListAsync();
    }

    public async Task<List<AssignmentTaskRelDto>> GetByAssignmentIdAsync(int assignmentId)
    {
        return await _dbContext.AssignmentTaskRels
            .Where(r => r.AssignmentId == assignmentId)
            .Select(r => new AssignmentTaskRelDto
            {
                TaskId = r.TaskId,
                AssignmentId = r.AssignmentId,
                PointsTotal = r.PointsTotal,
                BonusTask = r.BonusTask,
                ProjectSelectionLimit = r.ProjectSelectionLimit,
                InternalComment = r.InternalComment,
                Task = new TaskDto
                {
                    Id = r.Task.Id,
                    Name = r.Task.Name!,
                    Text = r.Task.Text,
                    InternalComment = r.Task.InternalComment,
                    AuthorId = r.Task.AuthorId,
                    Fullname = r.Task.Author.Fullname
                }
            })
            .ToListAsync();
    }

    public async Task<List<AssignmentTaskRelSlimDto>> GetSlimByAssignmentIdAsync(int assignmentId)
{
    return await _dbContext.AssignmentTaskRels
        .Where(r => r.AssignmentId == assignmentId)
        .Select(r => new AssignmentTaskRelSlimDto
        {
            TaskId = r.TaskId,
            AssignmentId = r.AssignmentId,
           PointsTotal = r.PointsTotal,
           BonusTask = r.BonusTask,
           ProjectSelectionLimit = r.ProjectSelectionLimit,
           InternalComment = r.InternalComment,
            Task = new AssignmentTaskRelSlimDto.TaskSlim
            {
                Id = r.Task.Id,
                Name = r.Task.Name,
                Text = r.Task.Text,
                InternalComment = r.Task.InternalComment ?? "",
                AuthorName = r.Task.Author.Fullname ?? r.Task.Author.Email
            }
        })
        .ToListAsync();
}

    public async Task<List<AssignmentTaskRelModel>> GetByTaskIdAsync(int taskId)
    {
        return await _dbContext.AssignmentTaskRels
            .Where(r => r.TaskId == taskId)
            .Include(r => r.Task)
            .Include(r => r.Assignment)
            .ToListAsync();
    }

    private static int? NormalizeProjectSelectionLimit(int? value)
    {
        return value.HasValue && value.Value > 0 ? value.Value : null;
    }
}
