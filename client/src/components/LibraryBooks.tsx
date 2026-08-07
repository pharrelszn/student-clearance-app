import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle2, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface LibraryBooksProps {
  clearanceId: number;
  onBooksUpdate?: () => void;
}

export default function LibraryBooks({ clearanceId, onBooksUpdate }: LibraryBooksProps) {
  const { data: books, isLoading, refetch } = trpc.libraryBook.getBooksForClearance.useQuery(
    { clearanceId },
    { enabled: clearanceId > 0 }
  );

  const approveBookMutation = trpc.libraryBook.approveBook.useMutation({
    onSuccess: () => {
      toast.success("Book approved successfully");
      refetch();
      onBooksUpdate?.();
    },
    onError: (error) => {
      toast.error(`Failed to approve book: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (!books || books.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="pt-6 text-center py-8">
          <p className="text-muted-foreground">No library books recorded for this student</p>
        </CardContent>
      </Card>
    );
  }

  const allResolved = books.every((b) => b.status === "resolved");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Lost/Damaged Books</h3>
        <div className="flex items-center gap-2">
          {allResolved ? (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">All Books Approved</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-amber-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">{books.filter((b) => b.status !== "resolved").length} Pending</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {books.map((book) => (
          <Card key={book.id} className="border-border">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">{book.title}</p>
                    <p className="text-sm text-muted-foreground">Book #: {book.bookNumber}</p>
                    {book.isbn && <p className="text-sm text-muted-foreground">ISBN: {book.isbn}</p>}
                    {book.author && <p className="text-sm text-muted-foreground">Author: {book.author}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {book.status === "resolved" ? (
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-medium">Approved</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-medium">Pending</span>
                      </div>
                    )}
                  </div>
                </div>

                {book.fine && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Fine/Replacement:</span>
                      <span className="font-semibold ml-2">KES {book.fine}</span>
                    </p>
                  </div>
                )}

                {book.notes && (
                  <div className="pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">{book.notes}</p>
                  </div>
                )}

                {book.status !== "resolved" && (
                  <div className="pt-3 border-t border-border flex gap-2">
                    <Button
                      onClick={() => {
                        approveBookMutation.mutate({
                          bookId: book.id,
                          clearanceId,
                        });
                      }}
                      disabled={approveBookMutation.isPending}
                      className="flex-1"
                    >
                      {approveBookMutation.isPending ? "Approving..." : "Approve Book"}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
