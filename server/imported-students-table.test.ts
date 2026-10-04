import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ImportedStudentsTable from "../client/src/components/ImportedStudentsTable";

describe("ImportedStudentsTable", () => {
  it("renders the Admin directory columns and clearance metadata", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ImportedStudentsTable, {
        students: [
          {
            id: 1,
            studentId: "STU-001",
            name: "Amina Test Student",
            admissionNumber: "ADM-001",
            stream: "A",
            upi: "UPI-001",
            kcpeScore: 380,
            phone: "+254700000000",
            gender: "Female",
            clearanceStatus: "in_progress",
            clearanceUpdatedAt: "2026-10-04T07:00:00.000Z",
          },
        ],
      }),
    );

    expect(markup).toContain("All Imported Students");
    expect(markup).toContain("Admission No.");
    expect(markup).toContain("Amina Test Student");
    expect(markup).toContain("ADM-001");
    expect(markup).toContain("In progress");
    expect(markup).toContain("admin-imported-students__badge--in_progress");
    expect(markup).toContain("All imported students and clearance statuses");
  });

  it("renders a safe empty state without table rows", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ImportedStudentsTable, { students: [] }),
    );

    expect(markup).toContain("No students have been imported yet.");
    expect(markup).not.toContain("admin-imported-students__badge--pending");
  });
});
