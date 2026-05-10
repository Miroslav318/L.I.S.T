using System.Security.Claims;
using List.Courses.Data;
using List.Courses.DTOs;
using List.Courses.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace List.Courses.Controllers;

[ApiController]
[Route("api/groups")]
[Authorize]
public class CourseGroupsController : ControllerBase
{
    private readonly CoursesDbContext _context;

    public CourseGroupsController(CoursesDbContext context)
    {
        _context = context;
    }

    [HttpGet("course/{courseId}")]
    public async Task<IActionResult> GetByCourse(int courseId)
    {
        var courseExists = await _context.Courses.AnyAsync(c => c.Id == courseId);
        if (!courseExists)
            return NotFound("Kurz neexistuje.");

        var groups = await _context.Groups
            .Where(g => g.CourseId == courseId)
            .Include(g => g.Rooms)
            .Include(g => g.Participants)
            .OrderBy(g => g.Name)
            .ToListAsync();

        return Ok(groups.Select(MapGroup));
    }

    [HttpGet("course/{courseId}/selection")]
    public async Task<IActionResult> GetMySelection(int courseId)
    {
        var userId = GetCurrentUserId();

        var course = await _context.Courses.FindAsync(courseId);
        if (course == null)
            return NotFound("Kurz neexistuje.");

        var participant = await _context.Participants
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.CourseId == courseId && p.UserId == userId);

        var beforeDeadline = !course.GroupChangeDeadline.HasValue ||
            DateTime.UtcNow <= course.GroupChangeDeadline.Value;

        return Ok(new
        {
            selectedGroupId = participant?.GroupId,
            groupChangeDeadline = course.GroupChangeDeadline,
            allowed = participant?.Allowed ?? false,
            canChange = participant?.Allowed == true && beforeDeadline
        });
    }

    [HttpPost]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> Create([FromBody] CourseGroupCreateDto dto)
    {
        var name = dto.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest("Nazov skupiny nemoze byt prazdny.");

        var courseExists = await _context.Courses.AnyAsync(c => c.Id == dto.CourseId);
        if (!courseExists)
            return NotFound("Kurz neexistuje.");

        var duplicate = await _context.Groups
            .AnyAsync(g => g.CourseId == dto.CourseId && g.Name == name);
        if (duplicate)
            return BadRequest("Skupina s tymto nazvom uz v kurze existuje.");

        var now = DateTime.UtcNow;
        var group = new CourseGroup
        {
            CourseId = dto.CourseId,
            Name = name,
            Created = now,
            Updated = now
        };

        _context.Groups.Add(group);
        await _context.SaveChangesAsync();

        return Ok(MapGroup(group));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> Update(int id, [FromBody] CourseGroupUpdateDto dto)
    {
        var name = dto.Name.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return BadRequest("Nazov skupiny nemoze byt prazdny.");

        var group = await _context.Groups
            .Include(g => g.Rooms)
            .Include(g => g.Participants)
            .FirstOrDefaultAsync(g => g.Id == id);

        if (group == null)
            return NotFound("Skupina neexistuje.");

        var duplicate = await _context.Groups
            .AnyAsync(g => g.CourseId == group.CourseId && g.Id != id && g.Name == name);
        if (duplicate)
            return BadRequest("Skupina s tymto nazvom uz v kurze existuje.");

        group.Name = name;
        group.Updated = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(MapGroup(group));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> Delete(int id)
    {
        var group = await _context.Groups.FindAsync(id);
        if (group == null)
            return NotFound("Skupina neexistuje.");

        _context.Groups.Remove(group);
        await _context.SaveChangesAsync();

        return Ok();
    }

    [HttpPatch("course/{courseId}/selection")]
    public async Task<IActionResult> SelectGroup(int courseId, [FromBody] CourseGroupSelectionDto dto)
    {
        var userId = GetCurrentUserId();

        var participant = await _context.Participants
            .Include(p => p.Course)
            .FirstOrDefaultAsync(p => p.CourseId == courseId && p.UserId == userId);

        if (participant == null)
            return NotFound("Nie si prihlaseny v tomto kurze.");

        if (!participant.Allowed)
            return BadRequest("Skupinu si mozes vybrat az po schvaleni v kurze.");

        if (participant.Course.GroupChangeDeadline.HasValue &&
            DateTime.UtcNow > participant.Course.GroupChangeDeadline.Value)
            return BadRequest("Termin na zmenu skupiny uz uplynul.");

        if (!dto.GroupId.HasValue)
        {
            participant.GroupId = null;
            await _context.SaveChangesAsync();
            return Ok(new { selectedGroupId = participant.GroupId });
        }

        var group = await _context.Groups
            .Include(g => g.Rooms)
            .Include(g => g.Participants)
            .FirstOrDefaultAsync(g => g.Id == dto.GroupId.Value);

        if (group == null || group.CourseId != courseId)
            return BadRequest("Skupina nepatri do tohto kurzu.");

        if (IsGroupFull(group, participant.UserId))
            return BadRequest("Skupina je plna.");

        participant.GroupId = group.Id;
        await _context.SaveChangesAsync();

        return Ok(new { selectedGroupId = participant.GroupId });
    }

    [HttpPost("{groupId}/rooms")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> CreateRoom(int groupId, [FromBody] GroupRoomCreateDto dto)
    {
        var group = await _context.Groups
            .Include(g => g.Rooms)
            .Include(g => g.Participants)
            .FirstOrDefaultAsync(g => g.Id == groupId);

        if (group == null)
            return NotFound("Skupina neexistuje.");

        var validation = ValidateRoom(dto.Name, dto.TimeBegin, dto.TimeEnd, dto.TimeDay, dto.Capacity);
        if (validation != null)
            return BadRequest(validation);

        var now = DateTime.UtcNow;
        var room = new GroupRoom
        {
            GroupId = groupId,
            Name = dto.Name.Trim(),
            TimeBegin = dto.TimeBegin,
            TimeEnd = dto.TimeEnd,
            TimeDay = dto.TimeDay,
            Capacity = dto.Capacity,
            TeachersPlan = dto.TeachersPlan,
            Created = now,
            Updated = now
        };

        _context.Rooms.Add(room);
        await _context.SaveChangesAsync();

        return Ok(MapRoom(room));
    }

    [HttpPut("rooms/{roomId}")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> UpdateRoom(int roomId, [FromBody] GroupRoomUpdateDto dto)
    {
        var room = await _context.Rooms.FindAsync(roomId);
        if (room == null)
            return NotFound("Miestnost neexistuje.");

        var validation = ValidateRoom(dto.Name, dto.TimeBegin, dto.TimeEnd, dto.TimeDay, dto.Capacity);
        if (validation != null)
            return BadRequest(validation);

        room.Name = dto.Name.Trim();
        room.TimeBegin = dto.TimeBegin;
        room.TimeEnd = dto.TimeEnd;
        room.TimeDay = dto.TimeDay;
        room.Capacity = dto.Capacity;
        room.TeachersPlan = dto.TeachersPlan;
        room.Updated = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return Ok(MapRoom(room));
    }

    [HttpDelete("rooms/{roomId}")]
    [Authorize(Roles = "Teacher")]
    public async Task<IActionResult> DeleteRoom(int roomId)
    {
        var room = await _context.Rooms.FindAsync(roomId);
        if (room == null)
            return NotFound("Miestnost neexistuje.");

        _context.Rooms.Remove(room);
        await _context.SaveChangesAsync();

        return Ok();
    }

    private int GetCurrentUserId()
    {
        return int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
    }

    private static bool IsGroupFull(CourseGroup group, int? ignoredUserId = null)
    {
        var capacity = group.Rooms.Sum(r => r.Capacity);
        if (capacity <= 0)
            return false;

        var participantCount = group.Participants
            .Count(p => p.Allowed && (!ignoredUserId.HasValue || p.UserId != ignoredUserId.Value));

        return participantCount >= capacity;
    }

    private static string? ValidateRoom(string name, int timeBegin, int timeEnd, int timeDay, int capacity)
    {
        if (string.IsNullOrWhiteSpace(name))
            return "Nazov miestnosti nemoze byt prazdny.";

        if (timeDay < 1 || timeDay > 7)
            return "Den vyucby musi byt v rozsahu 1 az 7.";

        if (timeBegin < 0 || timeBegin > 24 * 60 || timeEnd < 0 || timeEnd > 24 * 60 || timeBegin >= timeEnd)
            return "Cas vyucby nie je platny.";

        if (capacity <= 0)
            return "Kapacita miestnosti musi byt vacsia ako 0.";

        return null;
    }

    private static CourseGroupDto MapGroup(CourseGroup group)
    {
        return new CourseGroupDto
        {
            Id = group.Id,
            CourseId = group.CourseId,
            Name = group.Name,
            ParticipantCount = group.Participants.Count(p => p.Allowed),
            Capacity = group.Rooms.Sum(r => r.Capacity),
            Rooms = group.Rooms
                .OrderBy(r => r.TimeDay)
                .ThenBy(r => r.TimeBegin)
                .Select(MapRoom)
                .ToList()
        };
    }

    private static GroupRoomDto MapRoom(GroupRoom room)
    {
        return new GroupRoomDto
        {
            Id = room.Id,
            GroupId = room.GroupId,
            Name = room.Name,
            TimeBegin = room.TimeBegin,
            TimeEnd = room.TimeEnd,
            TimeDay = room.TimeDay,
            Capacity = room.Capacity,
            TeachersPlan = room.TeachersPlan
        };
    }
}
