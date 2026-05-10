using System;
using List.Assignments.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace List.Assignments.Migrations
{
    [DbContext(typeof(AssignmentsDbContext))]
    [Migration("20260508123000_AddAssignmentGroupSettings")]
    public partial class AddAssignmentGroupSettings : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "assignment_group_settings",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    assignment_id = table.Column<int>(type: "integer", nullable: false),
                    group_id = table.Column<int>(type: "integer", nullable: false),
                    publish_start_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    upload_end_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_assignment_group_settings", x => x.id);
                    table.ForeignKey(
                        name: "FK_assignment_group_settings_assignments_assignment_id",
                        column: x => x.assignment_id,
                        principalTable: "assignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_assignment_group_settings_groups_group_id",
                        column: x => x.group_id,
                        principalTable: "groups",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_assignment_group_settings_assignment_id_group_id",
                table: "assignment_group_settings",
                columns: new[] { "assignment_id", "group_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_assignment_group_settings_group_id",
                table: "assignment_group_settings",
                column: "group_id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "assignment_group_settings");
        }
    }
}
