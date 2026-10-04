import React, { type ReactNode } from "react";

type ImportedStudent = {
  id: number;
  name: string;
  admissionNumber: string | null;
  stream: string | null;
  upi: string | null;
  kcpeScore: number | null;
  phone: string | null;
  gender: string | null;
  clearanceStatus: "pending" | "in_progress" | "completed";
  clearanceUpdatedAt: Date | string | null;
};

type ImportedStudentsTableProps = {
  students: ImportedStudent[];
  isLoading?: boolean;
  emptyState?: ReactNode;
};

const formatDate = (value: ImportedStudent["clearanceUpdatedAt"]) => {
  if (!value) return "Not updated";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "Not updated" : date.toLocaleString();
};

const formatStatus = (status: ImportedStudent["clearanceStatus"]) => {
  if (status === "in_progress") return "In progress";
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export default function ImportedStudentsTable({
  students,
  isLoading = false,
  emptyState = "No students have been imported yet.",
}: ImportedStudentsTableProps) {
  return (
    <section className="admin-imported-students" aria-labelledby="admin-imported-students-title">
      <div className="admin-imported-students__heading">
        <div>
          <p className="admin-imported-students__eyebrow">Admin directory</p>
          <h2 id="admin-imported-students-title" className="admin-imported-students__title">
            All Imported Students
          </h2>
        </div>
        <span className="admin-imported-students__count">
          {isLoading ? "Loading…" : `${students.length} ${students.length === 1 ? "student" : "students"}`}
        </span>
      </div>

      <div className="admin-imported-students__glass">
        {isLoading ? (
          <div className="admin-imported-students__state" role="status">
            Loading imported students…
          </div>
        ) : students.length === 0 ? (
          <div className="admin-imported-students__state">{emptyState}</div>
        ) : (
          <div className="admin-imported-students__scroll">
            <table className="admin-imported-students__table">
              <caption className="sr-only">All imported students and clearance statuses</caption>
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Admission No.</th>
                  <th scope="col">Stream</th>
                  <th scope="col">UPI</th>
                  <th scope="col">KCPE</th>
                  <th scope="col">Contacts</th>
                  <th scope="col">Gender</th>
                  <th scope="col">Clearance</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="admin-imported-students__name">{student.name}</td>
                    <td>{student.admissionNumber || "—"}</td>
                    <td>{student.stream || "—"}</td>
                    <td>{student.upi || "—"}</td>
                    <td>{student.kcpeScore ?? "—"}</td>
                    <td>{student.phone || "—"}</td>
                    <td>{student.gender || "—"}</td>
                    <td>
                      <span className={`admin-imported-students__badge admin-imported-students__badge--${student.clearanceStatus}`}>
                        {formatStatus(student.clearanceStatus)}
                      </span>
                      <span className="admin-imported-students__updated">
                        {formatDate(student.clearanceUpdatedAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export type { ImportedStudent };
