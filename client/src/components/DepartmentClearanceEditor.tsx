import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

type Department = "finance" | "lab" | "sports" | "classroom" | "dorm" | "library" | "ict" | "medical" | "registrar";

interface DepartmentClearanceEditorProps {
  clearanceId: number;
  department: Department;
  record: any;
  onSaved: () => void;
}

const labels: Record<Department, string> = {
  finance: "Finance", lab: "Lab/ICT", sports: "Sports", classroom: "Classroom", dorm: "Dormitory",
  library: "Library", ict: "ICT", medical: "Medical", registrar: "Registrar",
};

export default function DepartmentClearanceEditor({ clearanceId, department, record, onSaved }: DepartmentClearanceEditorProps) {
  const [form, setForm] = useState<any>({});
  const mutation = trpc.departmentData.upsert.useMutation({
    onSuccess: () => {
      toast.success(`${labels[department]} information saved`);
      onSaved();
    },
    onError: (error) => toast.error(error.message || "Failed to save department information"),
  });

  useEffect(() => {
    setForm(record ? { ...record } : {});
  }, [record]);

  const set = (field: string, value: string | number) => setForm((current: any) => ({ ...current, [field]: value }));
  const input = (field: string, label: string, type = "text", required = false) => (
    <div>
      <Label htmlFor={`department-${field}`}>{label}{required ? " *" : ""}</Label>
      <Input id={`department-${field}`} type={type} value={form[field] ?? ""} required={required} onChange={(event) => set(field, type === "number" ? Number(event.target.value) : event.target.value)} className="mt-1" />
    </div>
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate({ clearanceId, department, id: form.id, ...form });
  };

  const hasFields = ["finance", "lab", "sports", "classroom", "dorm", "library", "ict", "medical", "registrar"].includes(department);

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader><CardTitle className="text-lg">{record ? "Edit" : "Add"} {labels[department]} information</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {department === "finance" && <>{input("outstandingBalance", "Outstanding balance", "text", true)}{input("description", "Description")}</>}
          {(department === "lab" || department === "sports" || department === "ict") && <>{input("equipmentName", "Equipment name", "text", department !== "ict")}{department === "ict" && input("equipmentType", "Equipment type", "text", true)}{department === "ict" && input("equipmentDescription", "Equipment description")}{department === "sports" && input("quantity", "Quantity", "number")}{department !== "ict" && input("damageAmount", "Damage amount", "text", true)}{input("description", "Description")}{department === "ict" && input("damageAmount", "Damage amount")}{department === "ict" && input("notes", "Notes")}</>}
          {(department === "classroom" || department === "dorm") && <>{input("itemName", "Item name", "text", true)}{input("damageAmount", "Damage amount", "text", true)}{input("description", "Description")}</>}
          {department === "library" && <>{input("title", "Book title", "text", true)}{input("bookNumber", "Book number", "text", true)}{input("isbn", "ISBN")}{input("author", "Author")}{input("fine", "Fine")}{input("notes", "Notes")}</>}
          {(department === "medical" || department === "registrar") && <><div><Label htmlFor="department-status">Status</Label><select id="department-status" value={form.status ?? "pending"} onChange={(event) => set("status", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="pending">Pending</option><option value="cleared">Cleared</option><option value="flagged">Flagged</option></select></div><div><Label htmlFor="department-notes">Notes</Label><Textarea id="department-notes" value={form.notes ?? ""} onChange={(event) => set("notes", event.target.value)} className="mt-1" /></div></>}
          {!hasFields && <p className="text-sm text-red-700">This department is not configured for clearance information. Please sign out and sign in again.</p>}
          <Button type="submit" disabled={mutation.isPending || !hasFields}>{mutation.isPending ? <><Spinner className="mr-2 h-4 w-4" />Saving…</> : record ? "Save changes" : "Add information"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
