using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using List.Users.Data;
using List.Users.Models;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Configuration;
using List.Common.Utils;
using List.Logs.Services;

namespace List.Users.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UsersDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly ILogService _logService;


        public AuthController(UsersDbContext context, IConfiguration configuration, ILogService logService)
        {
            _context = context;
            _configuration = configuration;
            _logService = logService;
        }

        [HttpPost("register")]
        [Authorize(Roles = "Teacher")]
        public async Task<IActionResult> Register(RegisterRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);


            if (await _context.Users.AnyAsync(u => u.Email == request.Email))
                return BadRequest("Email already in use.");

            var hashedPassword = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var user = new User
            {
                Fullname = request.Fullname,
                Email = request.Email,
                Password = hashedPassword,
                Role = request.Role ?? UserRole.Student
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "User registered", user.Id });
        }

        public class RegisterRequest
        {
            [Required]
            public string Fullname { get; set; }

            [Required, EmailAddress]
            public string Email { get; set; }

            [Required, MinLength(6)]
            public string Password { get; set; }

            [JsonConverter(typeof(System.Text.Json.Serialization.JsonStringEnumConverter))]
            public UserRole? Role { get; set; }
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login(LoginRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);
            
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null || request.Password != user.Password)   // if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
                return Unauthorized(new { message = "Invalid email or password." });
            
            if (user.Inactive)
                return Unauthorized(new { message = "User is inactive." });

            var expireHours = request.RememberMe ? 336 : 24; // 14 days if remember me was ticked
            var token = GenerateJwtToken(user, expireHours);

            var roleText = user.Role switch
            {
                UserRole.Teacher => "Učiteľ",
                UserRole.Assistant => "Asistent",
                _ => "Študent"
            };

            var ip = HttpContext.GetClientIpAddress();
            await _logService.LogAsync(user.Fullname, "LOGIN", "auth", user.Id, user.Fullname, ip, $"{roleText} {user.Fullname} sa prihlásil do systému");

            return Ok(new
            {
                message = "Login successful",
                token,
                user
            });
        }

        private string GenerateJwtToken(User user, int expireHours)
        {
            var jwtSettings = _configuration.GetSection("Jwt");
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]));

            var claims = new[]
            {
        new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
        new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
        new Claim(ClaimTypes.Email, user.Email),
        new Claim(ClaimTypes.Name, user.Fullname),
        new Claim(ClaimTypes.Role, user.Role.ToString())
    };

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var token = new JwtSecurityToken(
                issuer: jwtSettings["Issuer"],
                audience: jwtSettings["Audience"],
                claims: claims,
                expires: DateTime.UtcNow.AddHours(expireHours),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        public class LoginRequest
        {
            [Required, EmailAddress]
            public string Email { get; set; }

            [Required]
            public string Password { get; set; }

            public bool RememberMe { get; set; } = false;
        }


    }
}
