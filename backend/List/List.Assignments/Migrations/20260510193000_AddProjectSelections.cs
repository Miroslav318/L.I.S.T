using System;
using List.Assignments.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace List.Assignments.Migrations
{
    [DbContext(typeof(AssignmentsDbContext))]
    [Migration("20260510193000_AddProjectSelections")]
    public partial class AddProjectSelections : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "project_selection_deadline",
                table: "assignments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "project_selection_limit",
                table: "assignment_task_rel",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "project_selections",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    created = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    assignment_id = table.Column<int>(type: "integer", nullable: false),
                    task_id = table.Column<int>(type: "integer", nullable: false),
                    student_id = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_project_selections", x => x.id);
                    table.ForeignKey(
                        name: "FK_project_selections_Users_student_id",
                        column: x => x.student_id,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_project_selections_assignments_assignment_id",
                        column: x => x.assignment_id,
                        principalTable: "assignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_project_selections_tasks_task_id",
                        column: x => x.task_id,
                        principalTable: "tasks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_project_selections_assignment_id_student_id",
                table: "project_selections",
                columns: new[] { "assignment_id", "student_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_project_selections_assignment_id_task_id",
                table: "project_selections",
                columns: new[] { "assignment_id", "task_id" });

            migrationBuilder.CreateIndex(
                name: "IX_project_selections_student_id",
                table: "project_selections",
                column: "student_id");

            migrationBuilder.CreateIndex(
                name: "IX_project_selections_task_id",
                table: "project_selections",
                column: "task_id");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "project_selections");

            migrationBuilder.DropColumn(
                name: "project_selection_deadline",
                table: "assignments");

            migrationBuilder.DropColumn(
                name: "project_selection_limit",
                table: "assignment_task_rel");
        }
    }
}
