using List.Assignments.Models;
using List.Assignments.Services;
using List.Assignments.DTOs;
using List.Common.Models;
using List.Common.Utils;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.StaticFiles;
using List.Logs.Services;


namespace List.Assignments.Controllers;

[ApiController]
[Route("api/assignments/{assignmentId}/solutions")]
public class EvaluationController : ControllerBase
{
    private readonly IEvaluationService _svc;
    private readonly ILogService _log;

    public EvaluationController(IEvaluationService svc, ILogService log)
    {
        _svc = svc;
        _log = log;
    }

    [HttpPost("versions")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> UploadVersion(
        int assignmentId,
        [FromForm] IFormFile file, [FromForm] string? comment  // tu očakávame zipsovaný IFormFile
    )
    {

        // môžeš kontrolovať, či assignmentId zodpovedá solution.AssignmentId
        var claim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (claim == null)
            return BadRequest("Chýba identifikátor študenta.");
        var studentId = int.Parse(claim.Value);
        var remoteIp = HttpContext.GetClientIpAddress();

        SolutionVersionDto version;
        try
        {
            version = await _svc.AddVersionAsync(
                assignmentId,
                studentId,
                file,
                remoteIp,
                comment
            );
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        var userName = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value ?? "neznámy";
        await _log.LogAsync(
    userName,
    "POST",
    "solution",
    version.Id,
    version.AssignmentName,
    remoteIp,
    $"Študent {version.StudentName} odovzdal riešenie k zadaniu \"{version.AssignmentName}\""
);
        return Ok(version);
    }

    [HttpPost("~/api/solutions/{solutionId}/versions")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> UploadVersionForSolution(
            int solutionId,
            [FromForm] IFormFile file
        )
    {

        var dto = await _svc.AddVersionToSolutionAsync(
            solutionId,
            file
        );
        var teacherName = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Name)?.Value ?? "neznámy";
        var ip = HttpContext.GetClientIpAddress();
        await _log.LogAsync(
    teacherName,
    "POST",
    "solution",
    dto.Id,
    dto.AssignmentName,
    ip,
    $"Učiteľ {teacherName} nahral riešenie za študenta {dto.StudentName} k zadaniu \"{dto.AssignmentName}\""
);
        return Ok(dto);
    }

    [HttpGet]
    public async Task<IActionResult> GetSummaries(int assignmentId)
    {
        var list = await _svc.GetSolutionSummariesAsync(assignmentId);
        return Ok(list);
    }

    // GET  /api/assignments/{assignmentId}/solutions/{solutionId}/versions
    [HttpGet("~/api/solutions/{solutionId}/versions")]
    public async Task<IActionResult> GetVersionsBySolutionId(
        int solutionId)
    {
        // voliteľne overenie: riešenie patrí pod assignment
        var versions = await _svc.GetVersionsBySolutionIdAsync(solutionId);
        return Ok(versions);
    }

    [HttpGet("download-all")]
    public async Task<IActionResult> DownloadAll(int assignmentId)
    {
        var zipStream = await _svc.DownloadAllSolutionsAsync(assignmentId);
        var fileName = $"assignment_{assignmentId}_all_solutions.zip";
        return File(zipStream, "application/zip", fileName);
    }

    [HttpGet("~/api/solutions/{solutionId}/download-all-versions")]
    public async Task<IActionResult> DownloadAllVersions(int solutionId)
    {
        var ms = await _svc.DownloadAllVersionsAsync(solutionId);
        return File(
            ms,
            "application/zip",
            $"solution_{solutionId}_all_versions.zip"
        );
    }

    [HttpGet("bulk")]
    public async Task<IActionResult> GetBulkGrades(int assignmentId)
    {
        // vrátí seznam { studentId, fullName, email, points }
        var items = await _svc.GetBulkGradeItemsAsync(assignmentId);
        return Ok(items);
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> SaveBulkGrades(
        int assignmentId,
        [FromBody] List<BulkGradeSaveDto> items)
    {
        // uloží nebo aktualizuje points pro každý item
        await _svc.SaveBulkGradesAsync(assignmentId, items);
        return Ok();
    }

    [HttpPost("manual")]
    public async Task<IActionResult> CreateManual(
            int assignmentId,
            [FromBody] ManualSolutionRequest req)
    {
        var summary = await _svc.CreateManualSolutionAsync(
            assignmentId,
            req.StudentId
        );

        return Ok(summary);
    }


    [HttpGet("grade")]
    public async Task<IActionResult> GetSolutionsForGrading(int assignmentId)
    {
        var list = await _svc.GetEvaluationOverviewsAsync(assignmentId);
        return Ok(list);
    }


    [HttpGet("{solutionId}/header")]
    public async Task<IActionResult> GetInfo(int assignmentId, int solutionId)
    {
        var header = await _svc.GetEvaluationHeaderAsync(assignmentId, solutionId);
        return Ok(header);
    }

    // GET /api/assignments/{assignmentId}/solutions/{solutionId}/evaluate
    [HttpGet("{solutionId}/evaluate")]
    public async Task<IActionResult> GetEvaluate(int assignmentId, int solutionId)
    {
        var info = await _svc.GetSolutionInfoAsync(assignmentId, solutionId);
        return Ok(info);
    }

    [HttpPost("{solutionId}/evaluate")]
    public async Task<IActionResult> UpdateEvaluate(
            int assignmentId,
            int solutionId,
            [FromBody] SolutionInfoDto dto)
    {
        await _svc.UpdateSolutionInfoAsync(assignmentId, solutionId, dto);
        return Ok();
    }

    [HttpGet("~/api/solutions/{solutionId}/versions/{version}/files")]
    public async Task<IActionResult> ListFiles(int solutionId, int version)
    {
        var names = await _svc.GetFilesListAsync(solutionId, version);
        if (names == null) return NotFound();
        return Ok(names);
    }

    [HttpGet("~/api/solutions/{solutionId}/versions/{version}/files/{*filePath}")]
    public async Task<IActionResult> GetFile(
        int assignmentId, int solutionId, int version, string filePath)
    {
        var content = await _svc.GetFileContentAsync(solutionId, version, filePath);
        if (content == null) return NotFound();
        var provider = new FileExtensionContentTypeProvider();
        if (!provider.TryGetContentType(filePath, out var contentType))
        {
            contentType = "application/octet-stream";
        }

        // Teraz pošleme stream spolu s určeným contentType
        return File(content, contentType);
    }

    [HttpGet("~/api/solutions/courses/{courseId}/student-points")]
    public async Task<IActionResult> GetStudentPointsForCourse(int courseId)
    {
        // 1) Overenie identity študenta cez ClaimTypes.NameIdentifier
        var claim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (claim == null)
            return BadRequest("Chýba identifikátor študenta.");
        var studentId = int.Parse(claim.Value);

        // 2) Zavoláme službu
        List<StudentPointsDto> list = await _svc.GetStudentPointsForCourseAsync(studentId, courseId);

        // 3) Vrátime výsledok (môže byť aj prázdny zoznam, ak nemá riešenie)
        return Ok(list);
    }
}
