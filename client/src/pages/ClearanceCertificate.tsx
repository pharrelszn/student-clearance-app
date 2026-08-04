import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Download, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useRef, useState } from "react";
import { toast } from "sonner";

export default function ClearanceCertificate() {
  const params = useParams();
  const clearanceId = parseInt(params?.id || "0");
  const [, setLocation] = useLocation();
  const [isGenerating, setIsGenerating] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);

  const { data: clearance, isLoading } = trpc.clearance.getDetails.useQuery(
    { clearanceId },
    { enabled: clearanceId > 0 }
  );

  const handleDownloadPDF = async () => {
    if (!certificateRef.current) return;

    setIsGenerating(true);
    try {
      const html2canvas = await import("html2canvas");
      const jspdf = await import("jspdf");

      const canvas = await html2canvas.default(certificateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const pdf = new jspdf.jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", 0, 0, 297, 210);
      pdf.save(`clearance-certificate-${clearanceId}.pdf`);
      toast.success("Certificate downloaded successfully");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!clearance || clearance.status !== "completed") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-12">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Card className="border-border">
            <CardContent className="pt-6 text-center py-8">
              <p className="text-muted-foreground">
                Certificate is only available for completed clearances
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const allApproved = clearance.departmentSignOffs?.every(
    (s) => s.status === "approved"
  );

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-editorial-heading">Clearance Certificate</h1>
          <Button
            onClick={handleDownloadPDF}
            disabled={isGenerating || !allApproved}
            className="bg-foreground text-background hover:bg-accent gap-2"
          >
            <Download className="w-4 h-4" />
            {isGenerating ? "Generating..." : "Download PDF"}
          </Button>
        </div>

        <div
          ref={certificateRef}
          className="bg-white p-16 max-w-4xl mx-auto shadow-lg"
          style={{ aspectRatio: "297/210" }}
        >
          <div className="h-full flex flex-col justify-between text-center">
            <div>
              <p className="text-sm tracking-widest text-gray-600 mb-4">
                ACADEMIC INSTITUTION
              </p>
              <h1 className="text-5xl font-black text-gray-900 mb-2">
                CLEARANCE CERTIFICATE
              </h1>
              <div className="w-24 h-1 bg-gray-900 mx-auto mt-4"></div>
            </div>

            <div className="space-y-6">
              <p className="text-lg text-gray-700">
                This is to certify that
              </p>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  Student ID: {clearanceId}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  has successfully completed all clearance requirements
                </p>
              </div>
              <p className="text-lg text-gray-700">
                All departments have approved this student for graduation.
              </p>
              <div className="grid grid-cols-5 gap-4 pt-8 text-xs">
                {clearance.departmentSignOffs?.map((signOff) => (
                  <div key={signOff.id} className="text-center">
                    <p className="text-gray-600 mb-4 font-semibold">
                      {signOff.department.charAt(0).toUpperCase() +
                        signOff.department.slice(1)}
                    </p>
                    <div className="border-t-2 border-gray-900 pt-2">
                      <p className="text-gray-600">
                        {signOff.status === "approved" ? "✓" : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Issued on {new Date().toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
