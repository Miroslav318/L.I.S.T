using Microsoft.AspNetCore.Mvc;
using List.Courses.Data;
using List.Courses.DTOs;
using List.Courses.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using List.Common.Files;
using List.Logs.Services;
using Microsoft.AspNetCore.Http;
using List.Users.Models;

namespace List.Courses.Controllers
{
    [ApiController]
    [Route("api/participants")]
    public class ParticipantController : ControllerBase
    {
        private readonly CoursesDbContext _context;

        public ParticipantController(CoursesDbContext context)
        {
            _context = context;
        }

        [HttpGet("mine")]
        public async Task<IActionResult> GetMyCourses()
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var myCourses = await _context.Participants
                .Where(p => p.UserId == userId)
                .Select(p => new {
                    CourseId = p.CourseId,
                    Allowed = p.Allowed,
                    GroupId = p.GroupId
                })
                .ToListAsync();

            return Ok(myCourses);
        }

        [HttpPost]
        public async Task<IActionResult> JoinCourse([FromBody] ParticipantCreateDto dto)
        {
            var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

            var course = await _context.Courses
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Id == dto.CourseId);

            if (course == null)
                return NotFound("Kurz neexistuje.");

            if (course.EnrollmentLimit.HasValue && DateTime.UtcNow > course.EnrollmentLimit.Value)
                return BadRequest("Zápis do kurzu bol ukončený.");

            var enrolledCount = course.Participants.Count(p => p.Allowed);
            if (enrolledCount >= course.Capacity)
                return BadRequest("Kurz je plný.");

            var alreadyParticipant = await _context.Participants
                .AnyAsync(p => p.CourseId == dto.CourseId && p.UserId == userId);

            if (alreadyParticipant)
                return BadRequest("Už si prihlásený v tomto kurze.");

            var participant = new Participant
            {
                CourseId = dto.CourseId,
                UserId = userId,
                Allowed = course.AutoAcceptStudents
            };

            _context.Participants.Add(participant);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                courseId = course.Id,
                allowed = participant.Allowed
            });
        }

        [HttpPost("manual")]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> AddParticipantManually([FromBody] ParticipantManualCreateDto dto)
        {
            var email = dto.Email.Trim().ToLower();
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest("Email studenta nemoze byt prazdny.");

            var course = await _context.Courses
                .Include(c => c.Participants)
                .FirstOrDefaultAsync(c => c.Id == dto.CourseId);

            if (course == null)
                return NotFound("Kurz neexistuje.");

            var user = await _context.Set<User>()
                .FirstOrDefaultAsync(u => u.Email.ToLower() == email);

            if (user == null)
                return NotFound("Pouzivatel s tymto emailom neexistuje.");

            var alreadyParticipant = await _context.Participants
                .AnyAsync(p => p.CourseId == dto.CourseId && p.UserId == user.Id);

            if (alreadyParticipant)
                return BadRequest("Student uz je v tomto kurze.");

            if (dto.Allowed)
            {
                var enrolledCount = course.Participants.Count(p => p.Allowed);
                if (enrolledCount >= course.Capacity)
                    return BadRequest("Kurz je plny.");
            }

            CourseGroup? group = null;
            if (dto.GroupId.HasValue)
            {
                group = await _context.Groups
                    .Include(g => g.Rooms)
                    .Include(g => g.Participants)
                    .FirstOrDefaultAsync(g => g.Id == dto.GroupId.Value);

                if (group == null || group.CourseId != dto.CourseId)
                    return BadRequest("Skupina nepatri do tohto kurzu.");

                var groupCapacity = group.Rooms.Sum(r => r.Capacity);
                if (dto.Allowed && groupCapacity > 0)
                {
                    var groupCount = group.Participants.Count(p => p.Allowed);
                    if (groupCount >= groupCapacity)
                        return BadRequest("Skupina je plna.");
                }
            }

            var participant = new Participant
            {
                CourseId = dto.CourseId,
                UserId = user.Id,
                Allowed = dto.Allowed,
                GroupId = group?.Id
            };

            _context.Participants.Add(participant);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                userId = user.Id,
                userName = user.Fullname,
                email = user.Email,
                allowed = participant.Allowed,
                groupId = participant.GroupId,
                groupName = group?.Name
            });
        }
        [HttpGet("course/{courseId}")]
        public async Task<IActionResult> GetParticipantsByCourse(int courseId)
        {
            var courseExists = await _context.Courses.AnyAsync(c => c.Id == courseId);
            if (!courseExists)
                return NotFound("Kurz neexistuje.");

            var participants = await _context.Participants
                .Where(p => p.CourseId == courseId)
                .Include(p => p.User)
                .Include(p => p.Group)
                .Select(p => new
                {
                    UserId = p.UserId,
                    UserName = p.User.Fullname,
                    Email = p.User.Email,
                    Allowed = p.Allowed,
                    GroupId = p.GroupId,
                    GroupName = p.Group != null ? p.Group.Name : null
                })
                .ToListAsync();

            return Ok(participants);
        }
        [HttpPatch("approve")]
        public async Task<IActionResult> ApproveParticipant([FromBody] ParticipantUpdateDto dto)
        {
            var participant = await _context.Participants
                .Include(p => p.Course)
                .Where(p => p.CourseId == dto.CourseId && p.UserId == dto.UserId)
                .FirstOrDefaultAsync();

            if (participant == null)
                return NotFound("Účastník neexistuje.");

            if (!participant.Allowed)
            {
                var enrolledCount = await _context.Participants
                    .CountAsync(p => p.CourseId == dto.CourseId && p.Allowed);

                if (enrolledCount >= participant.Course.Capacity)
                    return BadRequest("Kapacita kurzu je plna. Nemozes schvalit dalsieho ucastnika.");

                if (participant.GroupId.HasValue)
                {
                    var groupCapacity = await _context.Rooms
                        .Where(r => r.GroupId == participant.GroupId.Value)
                        .SumAsync(r => r.Capacity);

                    if (groupCapacity > 0)
                    {
                        var groupCount = await _context.Participants
                            .CountAsync(p => p.GroupId == participant.GroupId.Value && p.Allowed);

                        if (groupCount >= groupCapacity)
                            return BadRequest("Skupina ucastnika je plna.");
                    }
                }
            }

            participant.Allowed = true;
            await _context.SaveChangesAsync();

            return Ok();
        }

        [HttpPatch("group")]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> AssignGroup([FromBody] ParticipantGroupUpdateDto dto)
        {
            var participant = await _context.Participants
                .Include(p => p.Group)
                .FirstOrDefaultAsync(p => p.CourseId == dto.CourseId && p.UserId == dto.UserId);

            if (participant == null)
                return NotFound("Účastník neexistuje.");

            if (!dto.GroupId.HasValue)
            {
                participant.GroupId = null;
                await _context.SaveChangesAsync();
                return Ok(new { groupId = participant.GroupId, groupName = (string?)null });
            }

            var group = await _context.Groups
                .Include(g => g.Rooms)
                .FirstOrDefaultAsync(g => g.Id == dto.GroupId.Value);

            if (group == null || group.CourseId != dto.CourseId)
                return BadRequest("Skupina nepatri do tohto kurzu.");

            if (participant.Allowed)
            {
                var groupCapacity = group.Rooms.Sum(r => r.Capacity);
                if (groupCapacity > 0)
                {
                    var groupCount = await _context.Participants
                        .CountAsync(p => p.GroupId == group.Id && p.Allowed && p.UserId != participant.UserId);

                    if (groupCount >= groupCapacity)
                        return BadRequest("Skupina je plna.");
                }
            }

            participant.GroupId = group.Id;
            await _context.SaveChangesAsync();

            return Ok(new { groupId = group.Id, groupName = group.Name });
        }


        [HttpDelete("remove")]
        public async Task<IActionResult> RemoveParticipant([FromQuery] int courseId, [FromQuery] int userId)
        {
            var participant = await _context.Participants
                .FirstOrDefaultAsync(p => p.CourseId == courseId && p.UserId == userId);

            if (participant == null)
                return NotFound("Účastník neexistuje.");

            _context.Participants.Remove(participant);
            await _context.SaveChangesAsync();

            return Ok();
        }

    }


}
