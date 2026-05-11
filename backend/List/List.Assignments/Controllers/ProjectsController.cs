using System.Security.Claims;
using List.Assignments.Data;
using List.Assignments.DTOs;
using List.Assignments.Models;
using List.Courses.Data;
using List.Courses.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace List.Assignments.Controllers;

[ApiController]
[Route("api/projects")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly AssignmentsDbContext _db;
    private readonly CoursesDbContext _coursesDb;

    public ProjectsController(AssignmentsDbContext db, CoursesDbContext coursesDb)
    {
        _db = db;
        _coursesDb = coursesDb;
    }

    [HttpGet("course/{courseId}")]
    public async Task<IActionResult> GetStudentProjectsByCourse(int courseId)
    {
        var studentId = GetCurrentUserId();
        var participant = await _coursesDb.Participants
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.CourseId == courseId && p.UserId == studentId && p.Allowed);

        if (participant == null)
            return Ok(new List<StudentProjectListItemDto>());

        var now = DateTime.UtcNow;
        var assignments = await _db.Assignments
            .AsNoTracking()
            .Where(a => a.CourseId == courseId)
            .Include(a => a.TaskSetType)
            .Include(a => a.CourseTaskSetRel)
            .Include(a => a.GroupSettings)
            .ToListAsync();

        var visibleProjects = assignments
            .Where(IsProjectAssignment)
            .Select(a => new { Assignment = a, Window = ResolveWindow(a, participant.GroupId) })
            .Where(x => IsPublishedForStudent(x.Assignment, x.Window, now))
            .ToList();

        var assignmentIds = visibleProjects.Select(x => x.Assignment.Id).ToList();
        var selections = await _db.ProjectSelections
            .AsNoTracking()
            .Where(s => assignmentIds.Contains(s.AssignmentId) && s.StudentId == studentId)
            .Include(s => s.Task)
            .ToListAsync();

        var solutions = await _db.Solutions
            .AsNoTracking()
            .Where(s => assignmentIds.Contains(s.AssignmentId) && s.StudentId == studentId)
            .Include(s => s.Versions)
            .ToListAsync();

        var selectedTaskIds = selections.Select(s => s.TaskId).ToHashSet();
        var selectedTaskRels = await _db.AssignmentTaskRels
            .AsNoTracking()
            .Where(r => assignmentIds.Contains(r.AssignmentId) && selectedTaskIds.Contains(r.TaskId))
            .ToListAsync();

        var result = visibleProjects
            .Select(x =>
            {
                var assignment = x.Assignment;
                var selection = selections.FirstOrDefault(s => s.AssignmentId == assignment.Id);
                var solution = solutions.FirstOrDefault(s => s.AssignmentId == assignment.Id);
                var selectedRel = selection == null
                    ? null
                    : selectedTaskRels.FirstOrDefault(r =>
                        r.AssignmentId == assignment.Id && r.TaskId == selection.TaskId);

                return new StudentProjectListItemDto
                {
                    AssignmentId = assignment.Id,
                    AssignmentName = assignment.Name,
                    TaskSetTypeName = assignment.TaskSetType.Name,
                    TaskSetTypeIdentifier = assignment.TaskSetType.Identifier,
                    SelectedTaskId = selection?.TaskId,
                    SelectedTaskName = selection?.Task.Name,
                    SolutionCount = solution?.Versions.Count ?? 0,
                    UploadEndTime = x.Window.UploadEndTime,
                    ProjectSelectionDeadline = assignment.ProjectSelectionDeadline ?? x.Window.UploadEndTime,
                    Points = solution?.Points,
                    MaxPoints = selectedRel?.PointsTotal ?? assignment.PointsOverride,
                    CanUpload = CanUploadProject(assignment, x.Window, now) && selection != null
                };
            })
            .OrderBy(p => p.UploadEndTime ?? DateTime.MaxValue)
            .ToList();

        return Ok(result);
    }

    [HttpGet("{assignmentId}")]
    public async Task<IActionResult> GetStudentProjectDetail(int assignmentId)
    {
        var studentId = GetCurrentUserId();
        var assignment = await LoadProjectAssignmentAsync(assignmentId);
        if (assignment == null)
            return NotFound("Projekt neexistuje.");

        var participant = await _coursesDb.Participants
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.CourseId == assignment.CourseId && p.UserId == studentId && p.Allowed);

        if (participant == null)
            return Forbid();

        var now = DateTime.UtcNow;
        var window = ResolveWindow(assignment, participant.GroupId);
        if (!IsPublishedForStudent(assignment, window, now))
            return NotFound("Projekt nie je dostupny.");

        var rels = await LoadProjectTaskRelsAsync(assignmentId);
        var selections = await LoadSelectionsAsync(assignmentId);
        var solution = await _db.Solutions
            .AsNoTracking()
            .Include(s => s.Versions)
            .FirstOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == studentId);

        var selected = selections.FirstOrDefault(s => s.StudentId == studentId);
        var hasSubmittedSolution = solution?.BestVersion > 0 || solution?.Versions.Count > 0;
        var selectionDeadline = assignment.ProjectSelectionDeadline ?? window.UploadEndTime;
        var canSelect = !hasSubmittedSolution &&
            (!selectionDeadline.HasValue || selectionDeadline.Value >= now);

        return Ok(new ProjectDetailDto
        {
            AssignmentId = assignment.Id,
            AssignmentName = assignment.Name,
            TaskSetTypeName = assignment.TaskSetType.Name,
            Instructions = assignment.Instructions,
            UploadEndTime = window.UploadEndTime,
            ProjectSelectionDeadline = selectionDeadline,
            SelectedTaskId = selected?.TaskId,
            SelectedTaskName = selected?.Task.Name,
            HasSubmittedSolution = hasSubmittedSolution,
            CanSelect = canSelect,
            CanUpload = CanUploadProject(assignment, window, now) && selected != null,
            Topics = BuildTopicDtos(rels, selections, solutionStudentIds: null)
        });
    }

    [HttpPatch("{assignmentId}/selection")]
    public async Task<IActionResult> SelectProject(int assignmentId, [FromBody] ProjectSelectionUpdateDto dto)
    {
        var studentId = GetCurrentUserId();
        var assignment = await LoadProjectAssignmentAsync(assignmentId);
        if (assignment == null)
            return NotFound("Projekt neexistuje.");

        var participant = await _coursesDb.Participants
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.CourseId == assignment.CourseId && p.UserId == studentId && p.Allowed);

        if (participant == null)
            return BadRequest("Nie si prihlaseny v tomto kurze.");

        var now = DateTime.UtcNow;
        var window = ResolveWindow(assignment, participant.GroupId);
        if (!IsPublishedForStudent(assignment, window, now))
            return BadRequest("Projekt nie je dostupny.");

        var hasSubmittedSolution = await HasSubmittedSolutionAsync(assignmentId, studentId);
        if (hasSubmittedSolution)
            return BadRequest("Projekt uz ma odovzdane riesenie, vyber sa uz neda menit.");

        var selectionDeadline = assignment.ProjectSelectionDeadline ?? window.UploadEndTime;
        if (selectionDeadline.HasValue && selectionDeadline.Value < now)
            return BadRequest("Termin vyberu projektu uz uplynul.");

        var existing = await _db.ProjectSelections
            .FirstOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == studentId);

        if (!dto.TaskId.HasValue)
        {
            if (existing != null)
            {
                _db.ProjectSelections.Remove(existing);
                await _db.SaveChangesAsync();
            }

            return Ok(new { selectedTaskId = (int?)null });
        }

        var rel = await _db.AssignmentTaskRels
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.AssignmentId == assignmentId && r.TaskId == dto.TaskId.Value);

        if (rel == null)
            return BadRequest("Tato tema nepatri do projektu.");

        if (await IsTopicFullAsync(assignmentId, rel, studentId))
            return BadRequest("Tema projektu je uz plna.");

        if (existing == null)
        {
            _db.ProjectSelections.Add(new ProjectSelection
            {
                AssignmentId = assignmentId,
                TaskId = rel.TaskId,
                StudentId = studentId,
                Created = now,
                Updated = now
            });
        }
        else
        {
            existing.TaskId = rel.TaskId;
            existing.Updated = now;
        }

        await _db.SaveChangesAsync();
        return Ok(new { selectedTaskId = rel.TaskId });
    }

    [HttpGet("assignments/{assignmentId}/selections")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> GetTeacherSelections(int assignmentId)
    {
        var assignment = await LoadProjectAssignmentAsync(assignmentId);
        if (assignment == null)
            return NotFound("Projekt neexistuje.");

        var rels = await LoadProjectTaskRelsAsync(assignmentId);
        var selections = await LoadSelectionsAsync(assignmentId);
        var submittedStudentIds = await LoadSubmittedStudentIdsAsync(assignmentId);

        var participants = await _coursesDb.Participants
            .AsNoTracking()
            .Where(p => p.CourseId == assignment.CourseId && p.Allowed)
            .Include(p => p.User)
            .OrderBy(p => p.User.Fullname)
            .ToListAsync();

        var selectedStudentIds = selections.Select(s => s.StudentId).ToHashSet();
        var unassignedStudents = participants
            .Where(p => !selectedStudentIds.Contains(p.UserId))
            .Select(p => new ProjectSelectedStudentDto
            {
                StudentId = p.UserId,
                FullName = p.User.Fullname,
                Email = p.User.Email,
                HasSolution = submittedStudentIds.Contains(p.UserId)
            })
            .ToList();

        return Ok(new TeacherProjectSelectionsDto
        {
            AssignmentId = assignment.Id,
            AssignmentName = assignment.Name,
            Topics = BuildTopicDtos(rels, selections, submittedStudentIds),
            UnassignedStudents = unassignedStudents
        });
    }

    [HttpPatch("assignments/{assignmentId}/students/{studentId}")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> AssignStudentProject(int assignmentId, int studentId, [FromBody] ProjectSelectionUpdateDto dto)
    {
        var assignment = await LoadProjectAssignmentAsync(assignmentId);
        if (assignment == null)
            return NotFound("Projekt neexistuje.");

        var participantExists = await _coursesDb.Participants
            .AsNoTracking()
            .AnyAsync(p => p.CourseId == assignment.CourseId && p.UserId == studentId && p.Allowed);

        if (!participantExists)
            return BadRequest("Student nie je schvaleny v kurze.");

        if (await HasSubmittedSolutionAsync(assignmentId, studentId))
            return BadRequest("Student uz odovzdal riesenie, vyber projektu sa neda menit.");

        var existing = await _db.ProjectSelections
            .FirstOrDefaultAsync(s => s.AssignmentId == assignmentId && s.StudentId == studentId);

        if (!dto.TaskId.HasValue)
        {
            if (existing != null)
            {
                _db.ProjectSelections.Remove(existing);
                await _db.SaveChangesAsync();
            }

            return Ok(new { selectedTaskId = (int?)null });
        }

        var rel = await _db.AssignmentTaskRels
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.AssignmentId == assignmentId && r.TaskId == dto.TaskId.Value);

        if (rel == null)
            return BadRequest("Tato tema nepatri do projektu.");

        if (await IsTopicFullAsync(assignmentId, rel, studentId))
            return BadRequest("Tema projektu je uz plna.");

        var now = DateTime.UtcNow;
        if (existing == null)
        {
            _db.ProjectSelections.Add(new ProjectSelection
            {
                AssignmentId = assignmentId,
                TaskId = rel.TaskId,
                StudentId = studentId,
                Created = now,
                Updated = now
            });
        }
        else
        {
            existing.TaskId = rel.TaskId;
            existing.Updated = now;
        }

        await _db.SaveChangesAsync();
        return Ok(new { selectedTaskId = rel.TaskId });
    }

    private int GetCurrentUserId()
    {
        return int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    }

    private async Task<AssignmentModel?> LoadProjectAssignmentAsync(int assignmentId)
    {
        var assignment = await _db.Assignments
            .Include(a => a.TaskSetType)
            .Include(a => a.CourseTaskSetRel)
            .Include(a => a.GroupSettings)
            .FirstOrDefaultAsync(a => a.Id == assignmentId);

        return assignment != null && IsProjectAssignment(assignment)
            ? assignment
            : null;
    }

    private async Task<List<AssignmentTaskRelModel>> LoadProjectTaskRelsAsync(int assignmentId)
    {
        return await _db.AssignmentTaskRels
            .AsNoTracking()
            .Where(r => r.AssignmentId == assignmentId)
            .Include(r => r.Task)
            .ThenInclude(t => t.Author)
            .OrderBy(r => r.Task.Name)
            .ToListAsync();
    }

    private async Task<List<ProjectSelection>> LoadSelectionsAsync(int assignmentId)
    {
        return await _db.ProjectSelections
            .AsNoTracking()
            .Where(s => s.AssignmentId == assignmentId)
            .Include(s => s.Student)
            .Include(s => s.Task)
            .OrderBy(s => s.Student.Fullname)
            .ToListAsync();
    }

    private async Task<HashSet<int>> LoadSubmittedStudentIdsAsync(int assignmentId)
    {
        return (await _db.Solutions
                .AsNoTracking()
                .Where(s => s.AssignmentId == assignmentId && s.BestVersion > 0)
                .Select(s => s.StudentId)
                .ToListAsync())
            .ToHashSet();
    }

    private async Task<bool> HasSubmittedSolutionAsync(int assignmentId, int studentId)
    {
        return await _db.Solutions
            .AsNoTracking()
            .AnyAsync(s => s.AssignmentId == assignmentId && s.StudentId == studentId && s.BestVersion > 0);
    }

    private async Task<bool> IsTopicFullAsync(int assignmentId, AssignmentTaskRelModel rel, int ignoredStudentId)
    {
        if (!rel.ProjectSelectionLimit.HasValue || rel.ProjectSelectionLimit.Value <= 0)
            return false;

        var count = await _db.ProjectSelections
            .AsNoTracking()
            .CountAsync(s =>
                s.AssignmentId == assignmentId &&
                s.TaskId == rel.TaskId &&
                s.StudentId != ignoredStudentId);

        return count >= rel.ProjectSelectionLimit.Value;
    }

    private static List<ProjectTopicDto> BuildTopicDtos(
        List<AssignmentTaskRelModel> rels,
        List<ProjectSelection> selections,
        HashSet<int>? solutionStudentIds)
    {
        return rels.Select(rel =>
        {
            var topicSelections = selections
                .Where(s => s.TaskId == rel.TaskId)
                .OrderBy(s => s.Student.Fullname)
                .ToList();

            var limit = rel.ProjectSelectionLimit;
            var selectedCount = topicSelections.Count;

            return new ProjectTopicDto
            {
                TaskId = rel.TaskId,
                Name = rel.Task.Name ?? string.Empty,
                Text = rel.Task.Text,
                AuthorName = rel.Task.Author.Fullname,
                PointsTotal = rel.PointsTotal,
                SelectionLimit = limit,
                SelectedCount = selectedCount,
                FreeSlots = limit.HasValue ? Math.Max(0, limit.Value - selectedCount) : null,
                IsFull = limit.HasValue && selectedCount >= limit.Value,
                Students = topicSelections.Select(s => new ProjectSelectedStudentDto
                {
                    StudentId = s.StudentId,
                    FullName = s.Student.Fullname,
                    Email = s.Student.Email,
                    HasSolution = solutionStudentIds?.Contains(s.StudentId) ?? false
                }).ToList()
            };
        }).ToList();
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

    private static ProjectWindow ResolveWindow(AssignmentModel assignment, int? participantGroupId)
    {
        var activeSettings = assignment.GroupSettings.Where(s => s.Active).ToList();
        if (activeSettings.Count == 0)
        {
            return new ProjectWindow(true, assignment.PublishStartTime, assignment.UploadEndTime);
        }

        if (!participantGroupId.HasValue)
        {
            return new ProjectWindow(false, null, null);
        }

        var setting = activeSettings.FirstOrDefault(s => s.GroupId == participantGroupId.Value);
        if (setting == null)
        {
            return new ProjectWindow(false, null, null);
        }

        return new ProjectWindow(
            true,
            setting.PublishStartTime ?? assignment.PublishStartTime,
            setting.UploadEndTime ?? assignment.UploadEndTime);
    }

    private static bool IsPublishedForStudent(AssignmentModel assignment, ProjectWindow window, DateTime now)
    {
        return window.HasAccess &&
            assignment.Published &&
            (!window.PublishStartTime.HasValue || window.PublishStartTime.Value <= now);
    }

    private static bool CanUploadProject(AssignmentModel assignment, ProjectWindow window, DateTime now)
    {
        return IsPublishedForStudent(assignment, window, now) &&
            assignment.CourseTaskSetRel.UploadSolution &&
            (!window.UploadEndTime.HasValue || window.UploadEndTime.Value > now);
    }

    private readonly record struct ProjectWindow(
        bool HasAccess,
        DateTime? PublishStartTime,
        DateTime? UploadEndTime);
}
