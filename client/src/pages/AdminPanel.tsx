import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const [studentForm, setStudentForm] = useState({
    studentId: "",
    name: "",
    email: "",
    program: "",
    graduationYear: new Date().getFullYear(),
  });

  const [financeForm, setFinanceForm] = useState({
    clearanceId: "",
    outstandingBalance: "",
    description: "",
  });

  const [labForm, setLabForm] = useState({
    clearanceId: "",
    equipmentName: "",
    damageAmount: "",
    description: "",
  });

  const [sportsForm, setSportsForm] = useState({
    clearanceId: "",
    equipmentName: "",
    quantity: "",
    description: "",
  });

  const [classroomForm, setClassroomForm] = useState({
    clearanceId: "",
    itemName: "",
    damageAmount: "",
    description: "",
  });

  const [dormForm, setDormForm] = useState({
    clearanceId: "",
    itemName: "",
    damageAmount: "",
    description: "",
  });

  const utils = trpc.useUtils();

  // Note: These mutations would need to be added to the backend routers
  // For now, we'll show the form structure

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    toast.info("Student management coming soon - use Database UI for now");
  };

  const handleAddFinanceCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!financeForm.clearanceId || !financeForm.outstandingBalance) {
      toast.error("Please fill in all required fields");
      return;
    }
    toast.info("Finance check management coming soon - use Database UI for now");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 md:py-16">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-editorial-heading mb-2">Admin Panel</h1>
          <p className="text-editorial-subheading text-muted-foreground">
            Manage students and clearance data
          </p>
        </div>

        <Tabs defaultValue="students" className="w-full">
          <TabsList className="grid w-full grid-cols-6 border-b border-border">
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="finance">Finance</TabsTrigger>
            <TabsTrigger value="lab">Lab</TabsTrigger>
            <TabsTrigger value="sports">Sports</TabsTrigger>
            <TabsTrigger value="classroom">Classroom</TabsTrigger>
            <TabsTrigger value="dorm">Dorm</TabsTrigger>
          </TabsList>

          <TabsContent value="students" className="mt-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Add New Student</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddStudent} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Student ID *</label>
                      <Input
                        value={studentForm.studentId}
                        onChange={(e) =>
                          setStudentForm({
                            ...studentForm,
                            studentId: e.target.value,
                          })
                        }
                        placeholder="STU001"
                        className="mt-1 border-border"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Name *</label>
                      <Input
                        value={studentForm.name}
                        onChange={(e) =>
                          setStudentForm({ ...studentForm, name: e.target.value })
                        }
                        placeholder="John Doe"
                        className="mt-1 border-border"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        type="email"
                        value={studentForm.email}
                        onChange={(e) =>
                          setStudentForm({ ...studentForm, email: e.target.value })
                        }
                        placeholder="john@university.edu"
                        className="mt-1 border-border"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Program *</label>
                      <Input
                        value={studentForm.program}
                        onChange={(e) =>
                          setStudentForm({
                            ...studentForm,
                            program: e.target.value,
                          })
                        }
                        placeholder="Computer Science"
                        className="mt-1 border-border"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Graduation Year *</label>
                      <Input
                        type="number"
                        value={studentForm.graduationYear}
                        onChange={(e) =>
                          setStudentForm({
                            ...studentForm,
                            graduationYear: parseInt(e.target.value),
                          })
                        }
                        className="mt-1 border-border"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="bg-foreground text-background">
                    Add Student
                  </Button>
                </form>
                <div className="mt-6 p-4 bg-muted rounded">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> For now, use the Database UI in the Management Panel to add students. 
                    This form will be fully functional in the next update.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="finance" className="mt-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Add Finance Check</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddFinanceCheck} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Clearance ID *</label>
                    <Input
                      type="number"
                      value={financeForm.clearanceId}
                      onChange={(e) =>
                        setFinanceForm({
                          ...financeForm,
                          clearanceId: e.target.value,
                        })
                      }
                      placeholder="1"
                      className="mt-1 border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Outstanding Balance *</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={financeForm.outstandingBalance}
                      onChange={(e) =>
                        setFinanceForm({
                          ...financeForm,
                          outstandingBalance: e.target.value,
                        })
                      }
                      placeholder="15000.00"
                      className="mt-1 border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={financeForm.description}
                      onChange={(e) =>
                        setFinanceForm({
                          ...financeForm,
                          description: e.target.value,
                        })
                      }
                      placeholder="Tuition fees for final semester"
                      className="mt-1 border-border"
                      rows={3}
                    />
                  </div>
                  <Button type="submit" className="bg-foreground text-background">
                    Add Finance Check
                  </Button>
                </form>
                <div className="mt-6 p-4 bg-muted rounded">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> Use the Database UI to add checks for now.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lab" className="mt-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Add Lab Check</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Clearance ID *</label>
                    <Input
                      type="number"
                      placeholder="1"
                      className="mt-1 border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Equipment Name *</label>
                    <Input
                      placeholder="Microscope Lens"
                      className="mt-1 border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Damage Amount *</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="5000.00"
                      className="mt-1 border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Cracked during experiment"
                      className="mt-1 border-border"
                      rows={3}
                    />
                  </div>
                  <Button disabled className="bg-foreground text-background">
                    Add Lab Check (Coming Soon)
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sports" className="mt-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Add Sports Check</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Clearance ID *</label>
                    <Input
                      type="number"
                      placeholder="1"
                      className="mt-1 border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Equipment Name *</label>
                    <Input
                      placeholder="Basketball"
                      className="mt-1 border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantity *</label>
                    <Input
                      type="number"
                      placeholder="1"
                      className="mt-1 border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Not returned"
                      className="mt-1 border-border"
                      rows={3}
                    />
                  </div>
                  <Button disabled className="bg-foreground text-background">
                    Add Sports Check (Coming Soon)
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classroom" className="mt-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Add Classroom Check</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Clearance ID *</label>
                    <Input
                      type="number"
                      placeholder="1"
                      className="mt-1 border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Item Name *</label>
                    <Input
                      placeholder="Desk"
                      className="mt-1 border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Damage Amount *</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="2000.00"
                      className="mt-1 border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Broken leg on desk"
                      className="mt-1 border-border"
                      rows={3}
                    />
                  </div>
                  <Button disabled className="bg-foreground text-background">
                    Add Classroom Check (Coming Soon)
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="dorm" className="mt-6">
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Add Dorm Check</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Clearance ID *</label>
                    <Input
                      type="number"
                      placeholder="1"
                      className="mt-1 border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Item Name *</label>
                    <Input
                      placeholder="Window Blind"
                      className="mt-1 border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Damage Amount *</label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="3000.00"
                      className="mt-1 border-border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Damaged blind"
                      className="mt-1 border-border"
                      rows={3}
                    />
                  </div>
                  <Button disabled className="bg-foreground text-background">
                    Add Dorm Check (Coming Soon)
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
