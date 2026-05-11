import { Routes, Route, Navigate } from "react-router-dom";
import Courses from "../../Courses/Pages/Courses";
import TaskSets from "../../TaskSets/Pages/TaskSets";
import TaskSetTypes from "../../TaskSets/Pages/TaskSetTypes";
import Users from "../../Users/pages/Users";
import Periods from "../../Periods/Pages/Periods";
import Categories from "../../Categories/pages/Categories";
import Dashboard from "../pages/Dashboard";
import RequireAuth from "../../Authentication/components/RequireAuth";
import SignIn from "../../Authentication/pages/SignIn";
import StudentCourses from "../../Courses/Pages/StudentCourses";
import CourseDetail from "../../Courses/Pages/CourseDetail";
import CourseDescription from "../../Courses/Pages/Course/CourseDescription.tsx";
import Assignments from "../../Courses/Pages/Course/Assignments";
import Overview from "../../Courses/Pages/Course/Overview/Overview.tsx";
import Projects from "../../Courses/Pages/Course/Projects";
import ProjectDetail from "../../Courses/Pages/Course/ProjectDetail.tsx";
import RootRedirect from "./RootRedirect";
import Tasks from "../../Tasks/Pages/Tasks.tsx";
import TaskEditor from "../../Tasks/Pages/TaskEditor.tsx";
import LogsPage from "../../Logs/Pages/LogsPage.tsx";
import AssignmentsPage from "../../Assignments/pages/AssignmentsPage.tsx";
import CreateAssignmentPage from "../../Assignments/pages/CreateAssignmentPage.tsx";
import EditAssignmentPage from "../../Assignments/pages/EditAssignmentPage.tsx";
import SelectTasksForAssignmentPage from "../../Assignments/pages/SelectTasksForAssignmentPage.tsx";
import Participants from "../../Courses/Pages/Participants.tsx";
import TeacherCourses from "../../Grading/pages/TeacherCourses.tsx";
import GradeAssignments from "../../Grading/pages/GradeAssignments.tsx";
import BulkGrade from "../../Grading/pages/BulkGrade.tsx";
import GradeSolutions from "../../Grading/pages/GradeSolutions.tsx";
import SolutionDetail from "../../Grading/pages/SolutionDetail.tsx";
import GradeTable from "../../Grading/pages/GradeTable.tsx";
import CourseDescriptionEditor from "../../Courses/Pages/CourseDescriptionEditor.tsx";
import AssignmentTasksViewer from "../../Assignments/pages/AssignmentTasksViewer.tsx";
import Tests from "../../Tests/Pages/Tests.tsx";
import CourseGroups from "../../Courses/Pages/CourseGroups.tsx";
import Groups from "../../Courses/Pages/Course/Groups.tsx";

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/signin" element={<SignIn />} />
        <Route path="/student" element={<RequireAuth><Dashboard /></RequireAuth>}>
            <Route index element={<StudentCourses />} />
            <Route path="courses/:id" element={<CourseDetail />}>
                <Route index element={<CourseDescription />} />
                <Route path="description" element={<CourseDescription />} />
                <Route path="assignments" element={<Assignments />} />
                <Route path="assignments/:assignmentId/tasks" element={<AssignmentTasksViewer />} />
                <Route path="overview" element={<Overview />} />
                <Route path="projects" element={<Projects />} />
                <Route path="projects/:assignmentId" element={<ProjectDetail />} />
                <Route path="groups" element={<Groups />} />
        </Route>
      </Route>
      <Route
        path="/dash"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      >
        {/* podstránky do Dashboardu */}
        <Route index element={<Navigate to="courses" replace />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:id/tasksets" element={<TaskSets />} />
        <Route path="courses/:id/groups" element={<CourseGroups />} />
        <Route path="courses/:id/participants" element={<Participants />} />
          <Route path="courses/:id/participants" element={<Participants />} />
          <Route path="courses/:id/description" element={<CourseDescriptionEditor />} />
        <Route path="task set types" element={<TaskSetTypes />} />
        <Route path="periods" element={<Periods />} />
        <Route path="categories" element={<Categories />} />
        <Route path="users" element={<Users />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="tasks/new" element={<TaskEditor />} />
        <Route path="tasks/:id/edit" element={<TaskEditor />} />
        <Route path="logs" element={<LogsPage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="assignments/create" element={<CreateAssignmentPage />} />
        <Route path="assignments/edit/:id" element={<EditAssignmentPage />} />
        <Route path="assignments/:id/tasks" element={<SelectTasksForAssignmentPage />}/>
        <Route path="grade" element={<TeacherCourses />} />
          <Route path="grade/course/:courseId" element={<GradeAssignments />} />
          <Route path="grade/course/:courseId/matrix" element={<GradeTable />}/>
            <Route path="grade/course/:courseId/assignments/:assignmentId/bulk-grade" element={<BulkGrade />}/>
            <Route path="grade/course/:courseId/assignments/:assignmentId/grade-solutions" element={<GradeSolutions />}/>
            <Route path="grade/course/:courseId/assignments/:assignmentId/solutions/:solutionId/evaluate" element={<SolutionDetail />}/>
        <Route path="tests" element={<Tests />}/> 
      </Route>

      {/* fallback na root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
