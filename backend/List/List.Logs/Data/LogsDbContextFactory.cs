using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace List.Logs.Data;

public class LogsDbContextFactory : IDesignTimeDbContextFactory<LogsDbContext>
{
    public LogsDbContext CreateDbContext(string[] args)
    {
         var configuration = new ConfigurationBuilder()
            .SetBasePath(Path.Combine(Directory.GetCurrentDirectory(), "../List.Server"))
            .AddJsonFile("appsettings.json")
            .AddJsonFile("appsettings.Development.json", optional: true)
            .Build();

        var optionsBuilder = new DbContextOptionsBuilder<LogsDbContext>();
        optionsBuilder.UseNpgsql(configuration.GetConnectionString("DefaultConnection"));

        return new LogsDbContext(optionsBuilder.Options);
    }
}
