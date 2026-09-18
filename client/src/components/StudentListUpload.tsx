import { useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { FileUp, UploadCloud } from "lucide-react";

interface StudentRow {
  studentId: string;
  name: string;
  email?: string;
  phone?: string;
  program?: string;
  yearOfStudy?: number;
  graduationYear?: number;
  admissionNumber?: string;
}

interface PreviewRow extends StudentRow {
  rowNumber: number;
  errors: string[];
}

const aliases: Record<keyof StudentRow, string[]> = {
  studentId: ["studentid", "studentnumber", "studentno", "id", "admissionid", "registrationnumber", "regno"],
  name: ["name", "fullname", "studentname", "fullstudentname"],
  email: ["email", "emailaddress", "mail"],
  phone: ["phone", "phonenumber", "mobile", "telephone", "contact"],
  program: ["program", "course", "form", "class", "department", "stream"],
  yearOfStudy: ["yearofstudy", "year", "studyyear", "level", "formyear"],
  graduationYear: ["graduationyear", "gradyear", "yearofgraduation", "completionyear"],
  admissionNumber: ["admissionnumber", "admissionno", "admno", "admission", "indexnumber", "indexno"],
};

const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const parseCsvLine = (line: string, delimiter: string) => {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === delimiter && !quoted) {
      values.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }
  values.push(value.trim());
  return values;
};

const toNumber = (value: string | undefined) => {
  if (!value?.trim()) return undefined;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseFile = (text: string): PreviewRow[] => {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];
  const delimiter = (lines[0].match(/\t/g)?.length ?? 0) > (lines[0].match(/,/g)?.length ?? 0) ? "\t" : ",";
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader);
  const columnIndex = (field: keyof StudentRow) => headers.findIndex((header) => aliases[field].includes(header));
  const get = (values: string[], field: keyof StudentRow) => {
    const index = columnIndex(field);
    return index >= 0 ? values[index]?.trim() : undefined;
  };

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line, delimiter);
    const graduationYear = toNumber(get(values, "graduationYear"));
    const yearOfStudy = toNumber(get(values, "yearOfStudy"));
    const row: PreviewRow = {
      rowNumber: index + 2,
      studentId: get(values, "studentId") || "",
      name: get(values, "name") || "",
      email: get(values, "email") || undefined,
      phone: get(values, "phone") || undefined,
      program: get(values, "program") || undefined,
      yearOfStudy,
      graduationYear,
      admissionNumber: get(values, "admissionNumber") || undefined,
      errors: [],
    };
    if (!row.studentId) row.errors.push("Missing student ID");
    if (!row.name) row.errors.push("Missing student name");
    if (get(values, "graduationYear") && graduationYear === undefined) row.errors.push("Invalid graduation year");
    if (get(values, "yearOfStudy") && yearOfStudy === undefined) row.errors.push("Invalid year of study");
    return row;
  });
};

export default function StudentListUpload({ onImported }: { onImported?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [isReading, setIsReading] = useState(false);
  const importMutation = trpc.student.bulkCreate.useMutation({
    onSuccess: (result) => {
      toast.success(`Imported ${result.imported} student${result.imported === 1 ? "" : "s"}. ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"} skipped.`);
      setRows([]);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      onImported?.();
    },
    onError: (error) => toast.error(error.message || "Student list import failed"),
  });

  const validRows = useMemo(() => rows.filter((row) => row.errors.length === 0), [rows]);
  const invalidRows = rows.length - validRows.length;

  const handleFile = async (file: File) => {
    setIsReading(true);
    try {
      const text = await file.text();
      const parsed = parseFile(text);
      setFileName(file.name);
      setRows(parsed);
      if (parsed.length === 0) toast.error("No data rows found. Use a CSV or tab-separated file with a header row.");
    } finally {
      setIsReading(false);
    }
  };

  const importRows = () => {
    importMutation.mutate({
      rows: validRows.map(({ errors: _errors, rowNumber: _rowNumber, ...row }) => row),
    });
  };

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg"><UploadCloud className="h-5 w-5" />Upload student list</CardTitle>
        <p className="text-sm text-muted-foreground">Upload a CSV or tab-separated list. Column names are detected automatically, so use whatever student information your list provides.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <input ref={inputRef} type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }} />
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()} disabled={isReading || importMutation.isPending}>
          <FileUp className="mr-2 h-4 w-4" />{isReading ? "Reading list…" : "Choose student list"}
        </Button>
        {fileName && <p className="text-sm text-muted-foreground">File: {fileName}</p>}
        {rows.length > 0 && (
          <>
            <div className="rounded-lg border border-border bg-background p-3 text-sm">
              <strong>{rows.length}</strong> rows found · <strong className="text-emerald-700">{validRows.length}</strong> ready to import · <strong className="text-red-700">{invalidRows}</strong> need attention
            </div>
            <div className="max-h-64 overflow-auto rounded-lg border border-border bg-background">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-muted"><tr><th className="p-2">Row</th><th className="p-2">Student ID</th><th className="p-2">Name</th><th className="p-2">Details</th></tr></thead>
                <tbody>{rows.slice(0, 100).map((row) => <tr key={row.rowNumber} className="border-t border-border"><td className="p-2">{row.rowNumber}</td><td className="p-2">{row.studentId || "—"}</td><td className="p-2">{row.name || "—"}</td><td className={`p-2 ${row.errors.length ? "text-red-700" : "text-emerald-700"}`}>{row.errors.join(", ") || "Ready"}</td></tr>)}</tbody>
              </table>
            </div>
            <Button type="button" onClick={importRows} disabled={validRows.length === 0 || importMutation.isPending}>
              {importMutation.isPending ? "Importing…" : `Import ${validRows.length} student${validRows.length === 1 ? "" : "s"}`}
            </Button>
          </>
        )}
        <p className="text-xs text-muted-foreground">Required: a student ID and name column. Other fields are imported when present. Duplicate student IDs are skipped safely.</p>
      </CardContent>
    </Card>
  );
}

export type { StudentRow };
