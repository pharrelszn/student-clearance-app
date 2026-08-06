import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Settings } from "lucide-react";

type AdminStep = "config" | "add-students" | "manage-checks";

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<AdminStep>("config");
  const [configSaved, setConfigSaved] = useState(false);

  // Configuration state
  const [config, setConfig] = useState({
    enableSports: false,
    enableDorm: false,
    enableLab: false,
    enableClassroom: false,
    enableFinance: false,
  });

  // Student form state
  const [studentForm, setStudentForm] = useState({
    studentId: "",
    name: "",
    program: "",
    graduationYear: new Date().getFullYear(),
  });

  // Department checks state
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
    description: "",
  });

  const [classroomForm, setClassroomForm] = useState({
    clearanceId: "",
    itemName: "",
    damageAmount: "",
  });

  const [dormForm, setDormForm] = useState({
    clearanceId: "",
    itemName: "",
    damageAmount: "",
  });

  const [deleteStudentId, setDeleteStudentId] = useState("");

  // Fetch current config
  const { data: currentConfig } = trpc.adminConfig.get.useQuery();

  useEffect(() => {
    if (currentConfig) {
      setConfig(currentConfig);
      // If config is already set, allow adding students
      if (currentConfig.enableSports || currentConfig.enableDorm || currentConfig.enableLab || currentConfig.enableClassroom || currentConfig.enableFinance) {
        setConfigSaved(true);
      }
    }
  }, [currentConfig]);

  // Mutations
  const updateConfigMutation = trpc.adminConfig.update.useMutation({
    onSuccess: (data) => {
      setConfig(data);
      setConfigSaved(true);
      toast.success("Configuration saved! You can now add students.");
      setStep("add-students");
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const createStudentMutation = trpc.student.create.useMutation({
    onSuccess: () => {
      toast.success("Student created successfully!");
      setStudentForm({ studentId: "", name: "", program: "", graduationYear: new Date().getFullYear() });
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const deleteStudentMutation = trpc.student.delete.useMutation({
    onSuccess: () => {
      toast.success("Student deleted!");
      setDeleteStudentId("");
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const createFinanceCheckMutation = trpc.financeCheck.add.useMutation({
    onSuccess: () => {
      toast.success("Finance check added!");
      setFinanceForm({ clearanceId: "", outstandingBalance: "", description: "" });
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const createLabCheckMutation = trpc.labCheck.add.useMutation({
    onSuccess: () => {
      toast.success("Lab check added!");
      setLabForm({ clearanceId: "", equipmentName: "", damageAmount: "", description: "" });
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const createSportsCheckMutation = trpc.sportsCheck.add.useMutation({
    onSuccess: () => {
      toast.success("Sports check added!");
      setSportsForm({ clearanceId: "", equipmentName: "", description: "" });
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const createClassroomCheckMutation = trpc.classroomCheck.add.useMutation({
    onSuccess: () => {
      toast.success("Classroom check added!");
      setClassroomForm({ clearanceId: "", itemName: "", damageAmount: "" });
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const createDormCheckMutation = trpc.dormCheck.add.useMutation({
    onSuccess: () => {
      toast.success("Dorm check added!");
      setDormForm({ clearanceId: "", itemName: "", damageAmount: "" });
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  // Handlers
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const hasAtLeastOne = config.enableSports || config.enableDorm || config.enableLab || config.enableClassroom || config.enableFinance;
    if (!hasAtLeastOne) {
      toast.error("Select at least one category");
      return;
    }
    updateConfigMutation.mutate(config);
  };

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.studentId || !studentForm.name || !studentForm.program) {
      toast.error("Fill all required fields");
      return;
    }
    createStudentMutation.mutate(studentForm);
  };

  const handleDeleteStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteStudentId) {
      toast.error("Enter student ID");
      return;
    }
    deleteStudentMutation.mutate({ studentId: parseInt(deleteStudentId) });
  };

  const handleAddFinanceCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!financeForm.clearanceId || !financeForm.outstandingBalance) {
      toast.error("Fill required fields");
      return;
    }
    createFinanceCheckMutation.mutate({
      clearanceId: parseInt(financeForm.clearanceId),
      outstandingBalance: financeForm.outstandingBalance,
      description: financeForm.description,
    });
  };

  const handleAddLabCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!labForm.clearanceId || !labForm.equipmentName || !labForm.damageAmount) {
      toast.error("Fill required fields");
      return;
    }
    createLabCheckMutation.mutate({
      clearanceId: parseInt(labForm.clearanceId),
      equipmentName: labForm.equipmentName,
      damageAmount: labForm.damageAmount,
      description: labForm.description,
    });
  };

  const handleAddSportsCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sportsForm.clearanceId || !sportsForm.equipmentName) {
      toast.error("Fill required fields");
      return;
    }
    createSportsCheckMutation.mutate({
      clearanceId: parseInt(sportsForm.clearanceId),
      equipmentName: sportsForm.equipmentName,
      description: sportsForm.description,
    });
  };

  const handleAddClassroomCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classroomForm.clearanceId || !classroomForm.itemName || !classroomForm.damageAmount) {
      toast.error("Fill required fields");
      return;
    }
    createClassroomCheckMutation.mutate({
      clearanceId: parseInt(classroomForm.clearanceId),
      itemName: classroomForm.itemName,
      damageAmount: classroomForm.damageAmount,
    });
  };

  const handleAddDormCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dormForm.clearanceId || !dormForm.itemName || !dormForm.damageAmount) {
      toast.error("Fill required fields");
      return;
    }
    createDormCheckMutation.mutate({
      clearanceId: parseInt(dormForm.clearanceId),
      itemName: dormForm.itemName,
      damageAmount: dormForm.damageAmount,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-12 md:py-16">
        <button
          onClick={() => setLocation("/")}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="mb-12">
          <h1 className="text-editorial-heading mb-2">Admin Panel</h1>
          <p className="text-editorial-subheading text-muted-foreground">
            {step === "config" && "Step 1: Configure which information categories to include"}
            {step === "add-students" && "Step 2: Add Students"}
            {step === "manage-checks" && "Step 3: Manage Department Checks"}
          </p>
        </div>

        {/* STEP 1: Configuration */}
        {step === "config" && (
          <Card className="border-border max-w-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configure Information Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveConfig} className="space-y-6">
                <p className="text-sm text-muted-foreground mb-4">
                  Select which information categories you want to include in the student clearance process. You can change this later.
                </p>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer">
                    <Checkbox
                      checked={config.enableFinance}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, enableFinance: checked as boolean })
                      }
                      id="finance"
                    />
                    <label htmlFor="finance" className="cursor-pointer flex-1">
                      <div className="font-medium">Finance Department</div>
                      <div className="text-xs text-muted-foreground">Track outstanding fee balances</div>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer">
                    <Checkbox
                      checked={config.enableLab}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, enableLab: checked as boolean })
                      }
                      id="lab"
                    />
                    <label htmlFor="lab" className="cursor-pointer flex-1">
                      <div className="font-medium">Lab Department</div>
                      <div className="text-xs text-muted-foreground">Track equipment breakages and damage</div>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer">
                    <Checkbox
                      checked={config.enableSports}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, enableSports: checked as boolean })
                      }
                      id="sports"
                    />
                    <label htmlFor="sports" className="cursor-pointer flex-1">
                      <div className="font-medium">Sports Department</div>
                      <div className="text-xs text-muted-foreground">Monitor unreturned sports equipment</div>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer">
                    <Checkbox
                      checked={config.enableClassroom}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, enableClassroom: checked as boolean })
                      }
                      id="classroom"
                    />
                    <label htmlFor="classroom" className="cursor-pointer flex-1">
                      <div className="font-medium">Classroom Department</div>
                      <div className="text-xs text-muted-foreground">Track classroom damage charges</div>
                    </label>
                  </div>

                  <div className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-accent/50 cursor-pointer">
                    <Checkbox
                      checked={config.enableDorm}
                      onCheckedChange={(checked) =>
                        setConfig({ ...config, enableDorm: checked as boolean })
                      }
                      id="dorm"
                    />
                    <label htmlFor="dorm" className="cursor-pointer flex-1">
                      <div className="font-medium">Dorm/Hostel Department</div>
                      <div className="text-xs text-muted-foreground">Track dormitory damage charges</div>
                    </label>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-black hover:bg-gray-800 text-white"
                  disabled={updateConfigMutation.isPending}
                >
                  {updateConfigMutation.isPending ? "Saving..." : "Save Configuration & Continue"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* STEP 2: Add Students */}
        {step === "add-students" && configSaved && (
          <div className="space-y-6 max-w-2xl">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Add Student
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateStudent} className="space-y-4">
                  <Input
                    placeholder="Student ID"
                    value={studentForm.studentId}
                    onChange={(e) => setStudentForm({ ...studentForm, studentId: e.target.value })}
                  />
                  <Input
                    placeholder="Name"
                    value={studentForm.name}
                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  />
                  <Input
                    placeholder="Form"
                    value={studentForm.program}
                    onChange={(e) => setStudentForm({ ...studentForm, program: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Graduation Year"
                    value={studentForm.graduationYear}
                    onChange={(e) => setStudentForm({ ...studentForm, graduationYear: parseInt(e.target.value) })}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-black hover:bg-gray-800 text-white"
                    disabled={createStudentMutation.isPending}
                  >
                    {createStudentMutation.isPending ? "Adding..." : "Add Student"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-border border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <Trash2 className="w-5 h-5" />
                  Delete Student
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 bg-red-100 border border-red-300 rounded mb-4">
                  <p className="text-xs text-red-900">
                    <strong>Warning:</strong> Permanent deletion. Cannot be undone.
                  </p>
                </div>
                <form onSubmit={handleDeleteStudent} className="space-y-4">
                  <Input
                    type="number"
                    placeholder="Student ID"
                    value={deleteStudentId}
                    onChange={(e) => setDeleteStudentId(e.target.value)}
                  />
                  <Button
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    disabled={deleteStudentMutation.isPending}
                  >
                    {deleteStudentMutation.isPending ? "Deleting..." : "Delete Student"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Button
              onClick={() => setStep("manage-checks")}
              variant="outline"
              className="w-full"
            >
              Next: Manage Department Checks
            </Button>
          </div>
        )}

        {/* STEP 3: Manage Department Checks */}
        {step === "manage-checks" && configSaved && (
          <div className="space-y-6 max-w-2xl">
            {config.enableFinance && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Finance Check</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddFinanceCheck} className="space-y-4">
                    <Input
                      type="number"
                      placeholder="Clearance ID"
                      value={financeForm.clearanceId}
                      onChange={(e) => setFinanceForm({ ...financeForm, clearanceId: e.target.value })}
                    />
                    <Input
                      placeholder="Outstanding Balance"
                      value={financeForm.outstandingBalance}
                      onChange={(e) => setFinanceForm({ ...financeForm, outstandingBalance: e.target.value })}
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={financeForm.description}
                      onChange={(e) => setFinanceForm({ ...financeForm, description: e.target.value })}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-black hover:bg-gray-800 text-white"
                      disabled={createFinanceCheckMutation.isPending}
                    >
                      {createFinanceCheckMutation.isPending ? "Adding..." : "Add Check"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {config.enableLab && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Lab Check</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddLabCheck} className="space-y-4">
                    <Input
                      type="number"
                      placeholder="Clearance ID"
                      value={labForm.clearanceId}
                      onChange={(e) => setLabForm({ ...labForm, clearanceId: e.target.value })}
                    />
                    <Input
                      placeholder="Equipment Name"
                      value={labForm.equipmentName}
                      onChange={(e) => setLabForm({ ...labForm, equipmentName: e.target.value })}
                    />
                    <Input
                      placeholder="Damage Amount"
                      value={labForm.damageAmount}
                      onChange={(e) => setLabForm({ ...labForm, damageAmount: e.target.value })}
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={labForm.description}
                      onChange={(e) => setLabForm({ ...labForm, description: e.target.value })}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-black hover:bg-gray-800 text-white"
                      disabled={createLabCheckMutation.isPending}
                    >
                      {createLabCheckMutation.isPending ? "Adding..." : "Add Check"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {config.enableSports && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Sports Check</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddSportsCheck} className="space-y-4">
                    <Input
                      type="number"
                      placeholder="Clearance ID"
                      value={sportsForm.clearanceId}
                      onChange={(e) => setSportsForm({ ...sportsForm, clearanceId: e.target.value })}
                    />
                    <Input
                      placeholder="Equipment Name"
                      value={sportsForm.equipmentName}
                      onChange={(e) => setSportsForm({ ...sportsForm, equipmentName: e.target.value })}
                    />
                    <Input
                      placeholder="Description (optional)"
                      value={sportsForm.description}
                      onChange={(e) => setSportsForm({ ...sportsForm, description: e.target.value })}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-black hover:bg-gray-800 text-white"
                      disabled={createSportsCheckMutation.isPending}
                    >
                      {createSportsCheckMutation.isPending ? "Adding..." : "Add Check"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {config.enableClassroom && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Classroom Check</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddClassroomCheck} className="space-y-4">
                    <Input
                      type="number"
                      placeholder="Clearance ID"
                      value={classroomForm.clearanceId}
                      onChange={(e) => setClassroomForm({ ...classroomForm, clearanceId: e.target.value })}
                    />
                    <Input
                      placeholder="Item Name"
                      value={classroomForm.itemName}
                      onChange={(e) => setClassroomForm({ ...classroomForm, itemName: e.target.value })}
                    />
                    <Input
                      placeholder="Damage Amount"
                      value={classroomForm.damageAmount}
                      onChange={(e) => setClassroomForm({ ...classroomForm, damageAmount: e.target.value })}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-black hover:bg-gray-800 text-white"
                      disabled={createClassroomCheckMutation.isPending}
                    >
                      {createClassroomCheckMutation.isPending ? "Adding..." : "Add Check"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {config.enableDorm && (
              <Card className="border-border">
                <CardHeader>
                  <CardTitle>Dorm Check</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddDormCheck} className="space-y-4">
                    <Input
                      type="number"
                      placeholder="Clearance ID"
                      value={dormForm.clearanceId}
                      onChange={(e) => setDormForm({ ...dormForm, clearanceId: e.target.value })}
                    />
                    <Input
                      placeholder="Item Name"
                      value={dormForm.itemName}
                      onChange={(e) => setDormForm({ ...dormForm, itemName: e.target.value })}
                    />
                    <Input
                      placeholder="Damage Amount"
                      value={dormForm.damageAmount}
                      onChange={(e) => setDormForm({ ...dormForm, damageAmount: e.target.value })}
                    />
                    <Button
                      type="submit"
                      className="w-full bg-black hover:bg-gray-800 text-white"
                      disabled={createDormCheckMutation.isPending}
                    >
                      {createDormCheckMutation.isPending ? "Adding..." : "Add Check"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <Button
              onClick={() => setStep("add-students")}
              variant="outline"
              className="w-full"
            >
              Back: Add Students
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
