using List.Assignments.Data;
using List.TaskSets.Data;
using List.Courses.Data;
using List.Assignments.Models;
using List.Assignments.DTOs;
using List.Common.Models;
using List.Logs.Services;
using System;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using List.TaskSets.Formula;
using List.TaskSets.Formula.Nodes;

namespace List.Assignments.Services;

public class GradeMatrixService : IGradeMatrixService
{
    private readonly TaskSetsDbContext _taskSetsDb;
    private readonly CoursesDbContext _coursesDb;
    private readonly AssignmentsDbContext _assignDb;

    public GradeMatrixService(
        TaskSetsDbContext taskSetsDb,
        CoursesDbContext coursesDb,
        AssignmentsDbContext assignDb)
    {
        _taskSetsDb = taskSetsDb;
        _coursesDb = coursesDb;
        _assignDb = assignDb;
    }

    public async Task<GradeMatrixDto> GetGradeMatrixAsync(int courseId)
    {
        // 1) Meta-údaje: kurz + obdobie
        var course = await _coursesDb.Courses
            .Include(c => c.Period)
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == courseId)
            ?? throw new KeyNotFoundException($"Course {courseId} not found.");

        // 2) Definície sekcií (relácie + typy)
        var rels = await _taskSetsDb.CourseTaskSetRels
            .Where(r => r.CourseId == courseId)
            .Include(r => r.TaskSetType)
            .AsNoTracking()
            .ToListAsync();

        // 3) Všetky zadania pre kurz
        var assignments = await _assignDb.Assignments
            .Where(a => a.CourseId == courseId)
            .AsNoTracking()
            .Select(a => new
            {
                a.Id,
                a.Name,
                a.TaskSetTypeId
            })
            .ToListAsync();

        // 4) Študenti kurzu
        var participants = await _coursesDb.Participants
            .Where(p => p.CourseId == courseId && p.Allowed)
            .Include(p => p.User)
            .Include(p => p.Group)
            .AsNoTracking()
            .ToListAsync();

        // 5) Riešenia (len body)
        var assignmentIds = assignments.Select(a => a.Id).ToList();
        var solutions = await _assignDb.Solutions
            .Where(s => assignmentIds.Contains(s.AssignmentId))
            .AsNoTracking()
            .Select(s => new
            {
                s.AssignmentId,
                s.StudentId,
                s.Points
            })
            .ToListAsync();

        // Predpripravíme si dve mapy, aby sme VarResolver napísali pekne:
        //  a) z assignmentId → taskSetTypeId
        var assignmentTypeMap = assignments
            .ToDictionary(a => a.Id, a => a.TaskSetTypeId);

        var assignmentMaxPoints = new Dictionary<int, double>();
        foreach (var a in assignments)
        {
            assignmentMaxPoints[a.Id] =
                await GetMaxPointsForAssignmentAsync(a.Id);
        }

        //  b) z identifier (napr. "KV") → taskSetTypeId
        var relMap = rels
            .Where(r => !string.IsNullOrWhiteSpace(r.TaskSetType.Identifier))
            .ToDictionary(r => r.TaskSetType.Identifier!, r => r.TaskSetTypeId);

        // 6) Skladáme DTO
        var dto = new GradeMatrixDto
        {
            CourseId = course.Id,
            CourseName = course.Name,
            PeriodName = course.Period?.Name ?? string.Empty
        };

        // 6a) Sekcie (Types + jejich assignments)
        foreach (var rel in rels)
        {
            var section = new GradeMatrixTypeDto
            {
                RelId = rel.Id,
                TaskSetTypeId = rel.TaskSetTypeId,
                TaskSetTypeName = rel.TaskSetType.Name,
                Virtual = rel.Virtual,
                MinPoints = rel.MinPoints,
                MinPointsInPercentage = rel.MinPointsInPercentage,
                IncludeInTotal = rel.IncludeInTotal,
                Assignments = assignments
                    .Where(a => a.TaskSetTypeId == rel.TaskSetTypeId)
                    .Select(a => new AssignmentInfoDto
                    {
                        AssignmentId = a.Id,
                        AssignmentName = a.Name
                    })
                    .ToList()
            };
            section.MaxPoints = section.Assignments
                .Sum(ai => assignmentMaxPoints.TryGetValue(ai.AssignmentId, out var m) ? m : 0);

            dto.Types.Add(section);
        }

        // 6b) Študenti + ich body za každé zadanie
        foreach (var p in participants)
        {
            var studentDto = new StudentGradeDto
            {
                StudentId = p.UserId,
                FullName = p.User.Fullname,
                Group = p.Group?.Name,
            };

            // 1) Vyplníme body po jednotlivých assignments
            foreach (var a in assignments)
            {
                var sol = solutions.FirstOrDefault(x =>
                    x.AssignmentId == a.Id &&
                    x.StudentId == p.UserId);

                studentDto.Points[a.Id] = sol?.Points;
            }

            // 2) *** VarResolver ***  
            // Funkcia, ktorá sa bude volať pri evaluácii stromu pre "VariableNode"
            double VarResolver(string variableName)
            {
                // 2a) Z identifieru (~KV) zistíme taskSetTypeId
                if (!relMap.TryGetValue(variableName, out var tsTypeId))
                    throw new KeyNotFoundException(
                      $"Neznámy identifikátor v formule: {variableName}");

                // 2b) Spočítame všetky body tohto študenta pre assignments tohto typu
                return solutions
                    .Where(s =>
                        s.StudentId == p.UserId &&
                        assignmentTypeMap[s.AssignmentId] == tsTypeId)
                    .Sum(s => s.Points ?? 0);
            }

            double MaxVarResolver(string variableName)
            {
                if (!relMap.TryGetValue(variableName, out var tsTypeId))
                    throw new KeyNotFoundException(
                        $"Neznámy identifikátor v formule: {variableName}");

                // spočítame sumu max bodov pre assignments daného typu
                return assignmentMaxPoints
                    .Where(kv => assignmentTypeMap[kv.Key] == tsTypeId)
                    .Sum(kv => kv.Value);
            }

            foreach (var relNV in rels.Where(r => !r.Virtual))
            {
                var tsTypeId = relNV.TaskSetTypeId;
                var studentSum = solutions
                    .Where(s =>
                        s.StudentId == p.UserId &&
                        assignmentTypeMap[s.AssignmentId] == tsTypeId)
                    .Sum(s => s.Points ?? 0);
                studentDto.SectionTotals[relNV.Id] = studentSum;
            }

            foreach (var relV in rels.Where(r => r.Virtual && !string.IsNullOrEmpty(r.FormulaObject)))
            {
                GradeMatrixTypeDto section = dto.Types.First(t => t.RelId == relV.Id);
                try
                {
                    var options = new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                        PropertyNameCaseInsensitive = true
                    };
                    options.Converters.Add(new FormulaNodeJsonConverter());
                    var root = JsonSerializer.Deserialize<FormulaNode>(
                        relV.FormulaObject!, options)
                        ?? throw new Exception("Deserializácia vrátila null");


                    var result = FormulaEvaluator.Evaluate(
                        root, VarResolver, MaxVarResolver);

                    studentDto.SectionTotals[relV.Id] = result;
                }
                catch (Exception ex)
                {
                    Console.WriteLine(
                    $"[GradeMatrix] Chyba pri evaluácii virtualnej sekcie. " +
                    $"CourseId={courseId}, RelId={relV.Id}, StudentId={p.UserId}");
                    Console.WriteLine($"FormulaObject: {relV.FormulaObject}");
                    Console.WriteLine($"Error: {ex.GetType().Name} – {ex.Message}");
                    Console.WriteLine(ex.StackTrace);
                    throw;
                }
            }


            dto.Students.Add(studentDto);
        }

        return dto;
    }

    private async Task<double> GetMaxPointsForAssignmentAsync(int assignmentId)
    {
        // 1) Načítame assignment, ktorý obsahuje možný override
        var assignment = await _assignDb.Assignments
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == assignmentId)
            ?? throw new KeyNotFoundException($"Assignment {assignmentId} not found.");

        // 2) Ak učiteľ nastavil override, použijeme ho
        if (assignment.PointsOverride.HasValue)
            return assignment.PointsOverride.Value;

        // 3) Inak spočítame sumu všetkých PointsTotal pre ne-bonus úlohy
        var total = await _assignDb.AssignmentTaskRels
            .AsNoTracking()
            .Where(r => r.AssignmentId == assignmentId && !r.BonusTask)
            .SumAsync(r => r.PointsTotal);

        return total;
    }


}
