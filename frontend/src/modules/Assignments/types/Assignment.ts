import { TaskSetType } from "../../TaskSets/Types/TaskSetType";
import { Course } from "../../Courses/Types/Course";
import { CourseTaskSetRel } from "../../TaskSets/Types/CourseTaskSetRel";
import { User } from "../../Users/types/User";

export type Assignment = {
  id: number,
  name: string;
  created: string;
  updated: string;
  taskSetTypeId: number;
  taskSetType: TaskSetType;
  courseId: number;
  course: Course;
  teacherId: number;
  teacher: User;
  published: boolean;
  publishStartTime: string | null;
  uploadEndTime: string | null;
  projectSelectionDeadline: string | null;
  instructions: string | null;
  pointsOverride: number | null;
  internalComment: string | null;
  groupSettings: AssignmentGroupSetting[];
  courseTaskSetRel: CourseTaskSetRel;
};

export type AssignmentGroupSetting = {
  id: number;
  assignmentId: number;
  groupId: number;
  publishStartTime: string | null;
  uploadEndTime: string | null;
  active: boolean;
};
