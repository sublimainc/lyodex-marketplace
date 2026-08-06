import { useListRequests } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { FileText, Calendar, ArrowRight, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/lib/i18n";

export default function Requests() {
  const { data: requests, isLoading } = useListRequests();
  const { t } = useLanguage();
  const r = t.requests;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1">{r.title}</h1>
          <p className="text-muted-foreground">{r.subtitle}</p>
        </div>
        <Link href="/request">
          <Button className="shrink-0 font-medium">
            <Plus className="w-4 h-4 mr-2" /> {r.newRequest}
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {requests?.map((req) => (
            <Card key={req.id} className="hover:border-primary/40 transition-colors" data-testid={`request-row-${req.id}`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-6 gap-6">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className="font-bold text-lg">{req.material_type}</h3>
                    <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'active' ? 'default' : 'outline'} className="uppercase text-[10px] tracking-wider">
                      {req.status}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" /> {req.quantity_kg} kg</span>
                    <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {r.due} {format(new Date(req.deadline), "MMM d, yyyy")}</span>
                    {req.budget_per_kg && <span className="font-medium text-foreground">{r.estBudget} ${req.budget_per_kg}/kg</span>}
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="text-center px-4 border-r md:border-x">
                    <div className="text-2xl font-bold text-primary">{req.bid_count || 0}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{r.activeBids}</div>
                  </div>
                  <Link href={`/requests/${req.id}`}>
                    <Button variant="outline" className="ml-auto md:ml-0" data-testid={`btn-view-req-${req.id}`}>
                      {r.viewDetails} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
          {requests?.length === 0 && (
            <div className="text-center py-16 border rounded-lg bg-muted/10">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-1">{r.noRequestsTitle}</h3>
              <p className="text-muted-foreground mb-4">{r.noRequestsDesc}</p>
              <Link href="/request"><Button>{r.postFirst}</Button></Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
