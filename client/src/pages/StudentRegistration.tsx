import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

export default function StudentRegistration() {
  const [, setLocation] = useLocation();

  // Basic student info
  const [basicInfo, setBasicInfo] = useState({
    studentId: "",
    name: "",
    email: "",
    phone: "",
    program: "",
    yearOfStudy: "",
    graduationYear: new Date().getFullYear(),
    admissionNumber: "",
  });

  // Finance (mandatory)
  const [finance, setFinance] = useState({
    outstandingBalance: "",
    description: "",
  });

  // Optional departments
  const [enabledDepts, setEnabledDepts] = useState({
    lab: false,
    sports: false,
    classroom: false,
    dorm: false,
    library: false,
  });

  // Department data
  const [lab, setLab] = useState({
    equipmentName: "",
    damageAmount: "",
    description: "",
  });

  const [sports, setSports] = useState({
    equipmentName: "",
    description: "",
  });

  const [classroom, setClassroom] = useState({
    itemName: "",
    damageAmount: "",
  });

  const [dorm, setDorm] = useState({
    itemName: "",
    damageAmount: "",
  });

  const [library, setLibrary] = useState({
    books: [] as Array<{ title: string; bookNumber: string; isbn?: string; author?: string; fine?: string }>,
  });

  const [newBook, setNewBook] = useState({
    title: "",
    bookNumber: "",
    isbn: "",
    author: "",
    fine: "",
  });

  const registerMutation = trpc.student.registerWithDepartments.useMutation({
    onSuccess: (data) => {
      toast.success("Student registered successfully!");
      setTimeout(() => setLocation("/"), 1500);
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!basicInfo.studentId || !basicInfo.name || !basicInfo.program || !basicInfo.graduationYear) {
      toast.error("Fill all required student information");
      return;
    }

    if (!finance.outstandingBalance) {
      toast.error("Finance outstanding balance is required");
      return;
    }

    if (enabledDepts.lab && (!lab.equipmentName || !lab.damageAmount)) {
      toast.error("Complete all Lab department fields");
      return;
    }

    if (enabledDepts.sports && !sports.equipmentName) {
      toast.error("Complete all Sports department fields");
      return;
    }

    if (enabledDepts.classroom && (!classroom.itemName || !classroom.damageAmount)) {
      toast.error("Complete all Classroom department fields");
      return;
    }

    if (enabledDepts.dorm && (!dorm.itemName || !dorm.damageAmount)) {
      toast.error("Complete all Dorm department fields");
      return;
    }

    if (enabledDepts.library && library.books.length === 0) {
      toast.error("Add at least one book for Library department");
      return;
    }

    // Build departments object
    const departments: any = {};
    if (enabledDepts.lab) departments.lab = lab;
    if (enabledDepts.sports) departments.sports = sports;
    if (enabledDepts.classroom) departments.classroom = classroom;
    if (enabledDepts.dorm) departments.dorm = dorm;
    if (enabledDepts.library) departments.library = library;

    registerMutation.mutate({
      studentId: basicInfo.studentId,
      name: basicInfo.name,
      email: basicInfo.email || undefined,
      phone: basicInfo.phone || undefined,
      program: basicInfo.program,
      yearOfStudy: basicInfo.yearOfStudy ? parseInt(basicInfo.yearOfStudy) : undefined,
      graduationYear: basicInfo.graduationYear,
      admissionNumber: basicInfo.admissionNumber || undefined,
      finance,
      departments: Object.keys(departments).length > 0 ? departments : undefined,
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
          <h1 className="text-editorial-heading mb-2">Student Registration</h1>
          <p className="text-editorial-subheading text-muted-foreground">
            Register a new student for the clearance process
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
          {/* BASIC STUDENT INFORMATION */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Student ID *</label>
                  <Input
                    placeholder="e.g., STU001"
                    value={basicInfo.studentId}
                    onChange={(e) => setBasicInfo({ ...basicInfo, studentId: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Full Name *</label>
                  <Input
                    placeholder="e.g., John Doe"
                    value={basicInfo.name}
                    onChange={(e) => setBasicInfo({ ...basicInfo, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Email</label>
                  <Input
                    type="email"
                    placeholder="student@example.com"
                    value={basicInfo.email}
                    onChange={(e) => setBasicInfo({ ...basicInfo, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <Input
                    placeholder="+254712345678"
                    value={basicInfo.phone}
                    onChange={(e) => setBasicInfo({ ...basicInfo, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Form *</label>
                  <Input
                    placeholder="e.g., Form 4"
                    value={basicInfo.program}
                    onChange={(e) => setBasicInfo({ ...basicInfo, program: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Year of Study</label>
                  <Input
                    type="number"
                    placeholder="e.g., 4"
                    value={basicInfo.yearOfStudy}
                    onChange={(e) => setBasicInfo({ ...basicInfo, yearOfStudy: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Graduation Year *</label>
                  <Input
                    type="number"
                    value={basicInfo.graduationYear}
                    onChange={(e) => setBasicInfo({ ...basicInfo, graduationYear: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Admission Number</label>
                  <Input
                    placeholder="e.g., ADM2024001"
                    value={basicInfo.admissionNumber}
                    onChange={(e) => setBasicInfo({ ...basicInfo, admissionNumber: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FINANCE - MANDATORY */}
          <Card className="border-border border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-lg text-blue-900">Finance Information (Required)</CardTitle>
              <p className="text-sm text-blue-800 mt-2">This section must be completed for all students</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Outstanding Balance *</label>
                <Input
                  placeholder="e.g., 50000"
                  value={finance.outstandingBalance}
                  onChange={(e) => setFinance({ ...finance, outstandingBalance: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Input
                  placeholder="e.g., Tuition fees, lab fees"
                  value={finance.description}
                  onChange={(e) => setFinance({ ...finance, description: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* OPTIONAL DEPARTMENTS */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="text-lg">Optional Departments</CardTitle>
              <p className="text-sm text-muted-foreground mt-2">Select which departments to include in this student's clearance</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Lab */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Checkbox
                    checked={enabledDepts.lab}
                    onCheckedChange={(checked) =>
                      setEnabledDepts({ ...enabledDepts, lab: checked as boolean })
                    }
                    id="lab-dept"
                  />
                  <label htmlFor="lab-dept" className="font-medium cursor-pointer">
                    Lab Department
                  </label>
                </div>

                {enabledDepts.lab && (
                  <div className="space-y-3 ml-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Equipment Name *</label>
                      <Input
                        placeholder="e.g., Microscope"
                        value={lab.equipmentName}
                        onChange={(e) => setLab({ ...lab, equipmentName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Damage Amount *</label>
                      <Input
                        placeholder="e.g., 15000"
                        value={lab.damageAmount}
                        onChange={(e) => setLab({ ...lab, damageAmount: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <Input
                        placeholder="e.g., Broken lens"
                        value={lab.description}
                        onChange={(e) => setLab({ ...lab, description: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sports */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Checkbox
                    checked={enabledDepts.sports}
                    onCheckedChange={(checked) =>
                      setEnabledDepts({ ...enabledDepts, sports: checked as boolean })
                    }
                    id="sports-dept"
                  />
                  <label htmlFor="sports-dept" className="font-medium cursor-pointer">
                    Sports Department
                  </label>
                </div>

                {enabledDepts.sports && (
                  <div className="space-y-3 ml-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Equipment Name *</label>
                      <Input
                        placeholder="e.g., Football"
                        value={sports.equipmentName}
                        onChange={(e) => setSports({ ...sports, equipmentName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <Input
                        placeholder="e.g., Not returned"
                        value={sports.description}
                        onChange={(e) => setSports({ ...sports, description: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Classroom */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Checkbox
                    checked={enabledDepts.classroom}
                    onCheckedChange={(checked) =>
                      setEnabledDepts({ ...enabledDepts, classroom: checked as boolean })
                    }
                    id="classroom-dept"
                  />
                  <label htmlFor="classroom-dept" className="font-medium cursor-pointer">
                    Classroom Department
                  </label>
                </div>

                {enabledDepts.classroom && (
                  <div className="space-y-3 ml-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Item Name *</label>
                      <Input
                        placeholder="e.g., Desk"
                        value={classroom.itemName}
                        onChange={(e) => setClassroom({ ...classroom, itemName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Damage Amount *</label>
                      <Input
                        placeholder="e.g., 5000"
                        value={classroom.damageAmount}
                        onChange={(e) => setClassroom({ ...classroom, damageAmount: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Dorm */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Checkbox
                    checked={enabledDepts.dorm}
                    onCheckedChange={(checked) =>
                      setEnabledDepts({ ...enabledDepts, dorm: checked as boolean })
                    }
                    id="dorm-dept"
                  />
                  <label htmlFor="dorm-dept" className="font-medium cursor-pointer">
                    Dorm/Hostel Department
                  </label>
                </div>

                {enabledDepts.dorm && (
                  <div className="space-y-3 ml-6">
                    <div>
                      <label className="block text-sm font-medium mb-2">Item Name *</label>
                      <Input
                        placeholder="e.g., Bed"
                        value={dorm.itemName}
                        onChange={(e) => setDorm({ ...dorm, itemName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Damage Amount *</label>
                      <Input
                        placeholder="e.g., 8000"
                        value={dorm.damageAmount}
                        onChange={(e) => setDorm({ ...dorm, damageAmount: e.target.value })}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Library */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Checkbox
                    checked={enabledDepts.library}
                    onCheckedChange={(checked) =>
                      setEnabledDepts({ ...enabledDepts, library: checked as boolean })
                    }
                    id="library-dept"
                  />
                  <label htmlFor="library-dept" className="font-medium cursor-pointer">
                    Library Department (Lost/Damaged Books)
                  </label>
                </div>

                {enabledDepts.library && (
                  <div className="space-y-4 ml-6">
                    {/* Add Book Form */}
                    <div className="bg-muted p-3 rounded-lg">
                      <h4 className="font-semibold mb-3">Add Lost/Damaged Book</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium mb-2">Book Title *</label>
                          <Input
                            placeholder="e.g., Advanced Mathematics"
                            value={newBook.title}
                            onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Book Number *</label>
                          <Input
                            placeholder="e.g., LIB-2024-001"
                            value={newBook.bookNumber}
                            onChange={(e) => setNewBook({ ...newBook, bookNumber: e.target.value })}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-2">ISBN</label>
                            <Input
                              placeholder="e.g., 978-0-123456"
                              value={newBook.isbn}
                              onChange={(e) => setNewBook({ ...newBook, isbn: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-2">Author</label>
                            <Input
                              placeholder="e.g., John Doe"
                              value={newBook.author}
                              onChange={(e) => setNewBook({ ...newBook, author: e.target.value })}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Fine/Replacement Cost</label>
                          <Input
                            placeholder="e.g., 5000"
                            value={newBook.fine}
                            onChange={(e) => setNewBook({ ...newBook, fine: e.target.value })}
                          />
                        </div>
                        <Button
                          type="button"
                          onClick={() => {
                            if (!newBook.title || !newBook.bookNumber) {
                              toast.error("Book title and number are required");
                              return;
                            }
                            setLibrary({
                              books: [
                                ...library.books,
                                {
                                  title: newBook.title,
                                  bookNumber: newBook.bookNumber,
                                  isbn: newBook.isbn || undefined,
                                  author: newBook.author || undefined,
                                  fine: newBook.fine || undefined,
                                },
                              ],
                            });
                            setNewBook({ title: "", bookNumber: "", isbn: "", author: "", fine: "" });
                            toast.success("Book added");
                          }}
                          className="w-full"
                          variant="outline"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Book
                        </Button>
                      </div>
                    </div>

                    {/* Books List */}
                    {library.books.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold">Books ({library.books.length})</h4>
                        {library.books.map((book, idx) => (
                          <div key={idx} className="bg-muted p-3 rounded-lg flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium">{book.title}</p>
                              <p className="text-sm text-muted-foreground">#{book.bookNumber}</p>
                              {book.author && <p className="text-sm text-muted-foreground">By: {book.author}</p>}
                              {book.fine && <p className="text-sm text-muted-foreground">Fine: KES {book.fine}</p>}
                            </div>
                            <Button
                              type="button"
                              onClick={() => {
                                setLibrary({
                                  books: library.books.filter((_, i) => i !== idx),
                                });
                                toast.success("Book removed");
                              }}
                              variant="ghost"
                              size="sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SUBMIT BUTTON */}
          <Button
            type="submit"
            className="w-full bg-black hover:bg-gray-800 text-white py-6 text-lg"
            disabled={registerMutation.isPending}
          >
            {registerMutation.isPending ? "Registering..." : "Register Student"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            * Required fields. The student will be immediately ready for the clearance process after registration.
          </p>
        </form>
      </div>
    </div>
  );
}
