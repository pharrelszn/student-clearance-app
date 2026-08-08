import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

interface EditStudentModalProps {
  student: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditStudentModal({
  student,
  isOpen,
  onClose,
  onSuccess,
}: EditStudentModalProps) {
  const [formData, setFormData] = useState(() => {
    if (student) {
      return {
        ...student,
        yearOfStudy: student.yearOfStudy || "",
        email: student.email || "",
        phone: student.phone || "",
        admissionNumber: student.admissionNumber || "",
      };
    }
    return {
      name: "",
      studentId: "",
      email: "",
      phone: "",
      program: "",
      yearOfStudy: "",
      graduationYear: "",
      admissionNumber: "",
    };
  });

  const updateMutation = trpc.student.update.useMutation({
    onSuccess: () => {
      toast.success("Student information updated successfully");
      onClose();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error(`Failed to update student: ${error.message}`);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.studentId || !formData.program || !formData.graduationYear) {
      toast.error("Please fill in all required fields");
      return;
    }

    updateMutation.mutate({
      id: student.id,
      name: formData.name,
      studentId: formData.studentId,
      email: formData.email || null,
      phone: formData.phone || null,
      program: formData.program,
      yearOfStudy: formData.yearOfStudy ? parseInt(formData.yearOfStudy) : null,
      graduationYear: parseInt(formData.graduationYear),
      admissionNumber: formData.admissionNumber || null,
    });
  };

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md border-border">
        <DialogHeader>
          <DialogTitle>Edit Student Information</DialogTitle>
          <DialogDescription>
            Update the student's details below
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name" className="text-foreground">
              Name *
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Student name"
              className="border-border mt-1"
              required
            />
          </div>

          {/* Student ID */}
          <div>
            <Label htmlFor="studentId" className="text-foreground">
              Student ID *
            </Label>
            <Input
              id="studentId"
              name="studentId"
              value={formData.studentId}
              onChange={handleChange}
              placeholder="Student ID"
              className="border-border mt-1"
              required
            />
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-foreground">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email || ""}
              onChange={handleChange}
              placeholder="Email address"
              className="border-border mt-1"
            />
          </div>

          {/* Phone */}
          <div>
            <Label htmlFor="phone" className="text-foreground">
              Phone
            </Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone || ""}
              onChange={handleChange}
              placeholder="Phone number"
              className="border-border mt-1"
            />
          </div>

          {/* Program */}
          <div>
            <Label htmlFor="program" className="text-foreground">
              Programme *
            </Label>
            <Input
              id="program"
              name="program"
              value={formData.program}
              onChange={handleChange}
              placeholder="Programme/Form"
              className="border-border mt-1"
              required
            />
          </div>

          {/* Year of Study */}
          <div>
            <Label htmlFor="yearOfStudy" className="text-foreground">
              Year of Study
            </Label>
            <Input
              id="yearOfStudy"
              name="yearOfStudy"
              type="number"
              value={formData.yearOfStudy || ""}
              onChange={handleChange}
              placeholder="Year of study"
              className="border-border mt-1"
            />
          </div>

          {/* Graduation Year */}
          <div>
            <Label htmlFor="graduationYear" className="text-foreground">
              Graduation Year *
            </Label>
            <Input
              id="graduationYear"
              name="graduationYear"
              type="number"
              value={formData.graduationYear}
              onChange={handleChange}
              placeholder="Graduation year"
              className="border-border mt-1"
              required
            />
          </div>

          {/* Admission Number */}
          <div>
            <Label htmlFor="admissionNumber" className="text-foreground">
              Admission Number
            </Label>
            <Input
              id="admissionNumber"
              name="admissionNumber"
              value={formData.admissionNumber || ""}
              onChange={handleChange}
              placeholder="Admission number"
              className="border-border mt-1"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-border"
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-foreground text-background hover:bg-accent"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Spinner className="w-4 h-4 mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
