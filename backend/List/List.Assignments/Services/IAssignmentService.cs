namespace List.Assignments.Services;

using List.Assignments.Models;
using List.Assignments.DTOs;
using List.Common.Models;


public interface IAssignmentService
{
    Task<List<AssignmentModel>> GetAllAsync();
    Task<PagedResult<AssignmentModel>> GetFilteredAsync(AssignmentFilterDto filter);
    Task<AssignmentModel?> GetByIdAsync(int id);

    Task<AssignmentNameDto?> GetAssignmentNameAsync(int assignmentId);
    Task<List<AssignmentModel>> GetByCourseAsync(int courseId);
    Task<List<AssignmentCourseViewDto>> GetVisibleByCourseForStudentAsync(int courseId, int studentId);
    Task<AssignmentModel> CreateAsync(CreateAssignmentDto assignmentDto, int teacherId);
    Task<AssignmentModel> CloneAsync(int id);
    Task<AssignmentModel?> UpdateAsync(int id, CreateAssignmentDto updatedAssignmentDto);
    Task<AssignmentModel?> DeleteAsync(int id);
    Task<bool> CanUploadSolutionAsync(int assignmentId, int studentId);
    Task<double?> CalculateMaxPoints(int assignmentId);

}
