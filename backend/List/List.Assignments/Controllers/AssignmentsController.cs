using System.Security.Claims;
using List.Assignments.DTOs;
using List.Assignments.Models;
using List.Assignments.Services;
using List.Common.Files;
using List.Common.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace List.Assignments.Controllers;

[ApiController]
[Route("api/assignments")]
public class AssignmentsController : ControllerBase
{
    private readonly IAssignmentService _assignmentService;

    public AssignmentsController(IAssignmentService assignmentService)
    {
        _assignmentService = assignmentService;
    }

    [HttpGet]
    public async Task<ActionResult<List<AssignmentModel>>> GetAll()
    {
        var assignments = await _assignmentService.GetAllAsync();
        return Ok(assignments);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AssignmentModel>> GetById(int id)
    {
        var assignment = await _assignmentService.GetByIdAsync(id);
        if (assignment == null)
            return NotFound();
        return Ok(assignment);
    }

    [HttpGet("filter")]
    public async Task<ActionResult<PagedResult<AssignmentModel>>> GetFiltered([FromQuery] AssignmentFilterDto filter)
    {
        var result = await _assignmentService.GetFilteredAsync(filter);
        return Ok(result);
    }

    [HttpGet("course/{courseId}")]
    public async Task<IActionResult> GetByCourse(int courseId)
    {
        var claim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (claim == null)
            return BadRequest("Chyba identifikator pouzivatela.");

        var studentId = int.Parse(claim.Value);
        return Ok(await _assignmentService.GetVisibleByCourseForStudentAsync(courseId, studentId));
    }

    [HttpPost]
    public async Task<ActionResult<AssignmentModel>> Create(CreateAssignmentDto dto)
    {
        var claim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (claim == null)
            return BadRequest("Chyba identifikator ucitela.");

        var teacherId = int.Parse(claim.Value);

        try
        {
            var createdAssignment = await _assignmentService.CreateAsync(dto, teacherId);
            return Ok(new { id = createdAssignment.Id, name = createdAssignment.Name });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("{id}/clone")]
    public async Task<ActionResult> Clone(int id)
    {
        try
        {
            var cloned = await _assignmentService.CloneAsync(id);
            return Ok(new { id = cloned.Id, name = cloned.Name });
        }
        catch (KeyNotFoundException)
        {
            return NotFound($"Zadanie s ID {id} neexistuje.");
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AssignmentModel>> Update(int id, CreateAssignmentDto dto)
    {
        try
        {
            var assignment = await _assignmentService.UpdateAsync(id, dto);
            return assignment != null
                ? Ok(new { id = assignment.Id, name = assignment.Name })
                : BadRequest("Nepodarilo sa upravit zadanie.");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(int id)
    {
        var deleted = await _assignmentService.DeleteAsync(id);
        return deleted != null
            ? Ok(new { id = deleted.Id, name = deleted.Name })
            : BadRequest("Nepodarilo sa vymazat zadanie.");
    }

    [HttpGet("{assignmentId}/assignmentName")]
    public async Task<IActionResult> GetAssignmentName(int assignmentId)
    {
        var dto = await _assignmentService.GetAssignmentNameAsync(assignmentId);
        if (dto == null) return NotFound();
        return Ok(dto);
    }

    [HttpGet("{id}/canUpload")]
    public async Task<IActionResult> CanUpload(int id)
    {
        var assignment = await _assignmentService.GetByIdAsync(id);
        if (assignment == null)
            return NotFound($"Zadanie s ID {id} neexistuje.");

        var claim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier);
        if (claim == null)
            return BadRequest("Chyba identifikator pouzivatela.");

        var canUpload = await _assignmentService.CanUploadSolutionAsync(id, int.Parse(claim.Value));
        return Ok(new { canUpload });
    }

    [HttpGet("{id}/maxpoints")]
    public async Task<IActionResult> CountMaxPoints(int id)
    {
        var assignment = await _assignmentService.GetByIdAsync(id);
        if (assignment == null)
            return NotFound($"Zadanie s ID {id} neexistuje.");

        var maxPoints = await _assignmentService.CalculateMaxPoints(id);
        return Ok(maxPoints);
    }

    [HttpPost("upload-image")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> UploadImage([FromForm] IFormFile file, [FromServices] IFileStorageService fileStorageService)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No file uploaded.");

        var relativePath = await fileStorageService.SaveFileAsync(file, "assignments");
        var baseUrl = $"{Request.Scheme}://{Request.Host}";
        var url = $"{baseUrl}/{relativePath.Replace("\\", "/")}";

        return Ok(new { location = url });
    }
}
