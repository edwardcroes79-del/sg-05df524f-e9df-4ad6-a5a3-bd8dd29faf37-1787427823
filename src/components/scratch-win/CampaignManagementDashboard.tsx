import { ChangeEvent, useMemo, useState } from "react";
import { Archive, Copy, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CampaignManagementEditor } from "@/components/scratch-win/CampaignManagementEditor";
import { CampaignManagementPreview } from "@/components/scratch-win/CampaignManagementPreview";
import {
  createBlankManagedCampaign,
  duplicateManagedCampaign,
  initialManagedScratchCampaigns
} from "@/components/scratch-win/campaign-management-data";
import type {
  ManagedCampaignFilter,
  ManagedScratchCampaign,
  ManagedCampaignStatus
} from "@/components/scratch-win/campaign-management-types";

type DashboardMode = "list" | "edit" | "preview";

const statusFilters: ManagedCampaignFilter[] = ["All", "Draft", "Demo Active", "Archived"];

export function CampaignManagementDashboard() {
  const [campaigns, setCampaigns] = useState<ManagedScratchCampaign[]>(initialManagedScratchCampaigns);
  const [mode, setMode] = useState<DashboardMode>("list");
  const [editingCampaign, setEditingCampaign] = useState<ManagedScratchCampaign | null>(null);
  const [previewCampaign, setPreviewCampaign] = useState<ManagedScratchCampaign | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ManagedCampaignFilter>("All");
  const [notice, setNotice] = useState("Demo campaign drafts are stored only in local React state for this session.");

  const summary = useMemo(() => ({
    totalDrafts: campaigns.length,
    activeDemoDrafts: campaigns.filter((campaign) => campaign.status === "Demo Active").length,
    archivedDemoDrafts: campaigns.filter((campaign) => campaign.status === "Archived").length
  }), [campaigns]);

  const filteredCampaigns = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return campaigns.filter((campaign) => {
      const matchesStatus = statusFilter === "All" || campaign.status === statusFilter;
      const matchesSearch = !normalizedSearch || [
        campaign.campaignName,
        campaign.customerTitle,
        campaign.description,
        campaign.visualTone
      ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesStatus && matchesSearch;
    });
  }, [campaigns, search, statusFilter]);

  function createCampaign() {
    const nextCampaign = createBlankManagedCampaign(`campaign-local-${campaigns.length + 1}`);
    setEditingCampaign(nextCampaign);
    setPreviewCampaign(null);
    setMode("edit");
    setNotice("Started a new local demo campaign draft. It is not saved outside this page session.");
  }

  function editCampaign(campaign: ManagedScratchCampaign) {
    setEditingCampaign(campaign);
    setPreviewCampaign(null);
    setMode("edit");
    setNotice(`Editing local draft: ${campaign.campaignName}.`);
  }

  function previewSelectedCampaign(campaign: ManagedScratchCampaign) {
    setPreviewCampaign(campaign);
    setEditingCampaign(null);
    setMode("preview");
    setNotice("Preview uses the existing realistic scratch-card interaction with this local campaign draft.");
  }

  function saveCampaign(campaign: ManagedScratchCampaign) {
    setCampaigns((current) => {
      const exists = current.some((item) => item.id === campaign.id);

      if (exists) {
        return current.map((item) => item.id === campaign.id ? campaign : item);
      }

      return [campaign, ...current];
    });
    setEditingCampaign(null);
    setMode("list");
    setNotice(`Saved "${campaign.campaignName}" as an in-memory demo draft only.`);
  }

  function duplicateCampaign(campaign: ManagedScratchCampaign) {
    const duplicate = duplicateManagedCampaign(campaign, `campaign-copy-${campaigns.length + 1}`);
    setCampaigns((current) => [duplicate, ...current]);
    setNotice(`Duplicated "${campaign.campaignName}" as a separate local draft.`);
  }

  function archiveCampaign(campaign: ManagedScratchCampaign) {
    if (!window.confirm(`Archive "${campaign.campaignName}" as a demo-only local status?`)) {
      return;
    }

    setCampaigns((current) => current.map((item) => item.id === campaign.id ? { ...item, status: "Archived", updatedAt: "2026-10-26T13:34:31Z" } : item));
    setNotice(`Archived "${campaign.campaignName}" locally. No real campaign status changed.`);
  }

  function deleteCampaign(campaign: ManagedScratchCampaign) {
    if (!window.confirm(`Delete "${campaign.campaignName}" from this in-memory demo session? This cannot be undone.`)) {
      return;
    }

    setCampaigns((current) => current.filter((item) => item.id !== campaign.id));
    setNotice(`Deleted "${campaign.campaignName}" from the local demo state.`);
  }

  function changeStatus(campaign: ManagedScratchCampaign, status: ManagedCampaignStatus) {
    setCampaigns((current) => current.map((item) => item.id === campaign.id ? { ...item, status, updatedAt: "2026-10-26T13:34:31Z" } : item));
    setNotice(`Changed "${campaign.campaignName}" to ${status}. This is a demo-only local status.`);
  }

  if (mode === "edit" && editingCampaign) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <Header notice={notice} onCreate={createCampaign} />
          <CampaignManagementEditor
            initialCampaign={editingCampaign}
            onSave={saveCampaign}
            onCancel={() => {
              setEditingCampaign(null);
              setMode("list");
              setNotice("Cancelled the edit flow. No new local changes were saved.");
            }}
          />
        </div>
      </main>
    );
  }

  if (mode === "preview" && previewCampaign) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <Header notice={notice} onCreate={createCampaign} />
          <CampaignManagementPreview
            campaign={previewCampaign}
            onBackToManage={() => {
              setPreviewCampaign(null);
              setMode("list");
              setNotice("Returned to local campaign management.");
            }}
            onEdit={() => editCampaign(previewCampaign)}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <Header notice={notice} onCreate={createCampaign} />

        <section className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Total local drafts" value={summary.totalDrafts} />
          <SummaryCard label="Active demo drafts" value={summary.activeDemoDrafts} />
          <SummaryCard label="Archived demo drafts" value={summary.archivedDemoDrafts} />
        </section>

        <Card className="border-primary/10">
          <CardContent className="grid gap-4 p-5 lg:grid-cols-[1fr_220px]">
            <div>
              <Label htmlFor="campaign-search">Search campaigns</Label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="campaign-search"
                  value={search}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
                  placeholder="Search by name, title, description, or visual tone"
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="campaign-status-filter">Status filter</Label>
              <select
                id="campaign-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ManagedCampaignFilter)}
                className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {statusFilters.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </CardContent>
        </Card>

        {filteredCampaigns.length > 0 ? (
          <section className="grid gap-4 lg:grid-cols-2">
            {filteredCampaigns.map((campaign) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onEdit={() => editCampaign(campaign)}
                onPreview={() => previewSelectedCampaign(campaign)}
                onDuplicate={() => duplicateCampaign(campaign)}
                onArchive={() => archiveCampaign(campaign)}
                onDelete={() => deleteCampaign(campaign)}
                onStatusChange={(status) => changeStatus(campaign, status)}
              />
            ))}
          </section>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
              <div className="rounded-full bg-primary/10 p-4 text-primary">
                <Plus className="h-8 w-8" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-serif text-2xl font-bold">No local demo campaigns found</h2>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  Adjust the search or status filter, or create a new in-memory Scratch & Win campaign draft. Nothing here is published or persisted.
                </p>
              </div>
              <Button type="button" onClick={createCampaign}>Create Campaign</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

function Header({ notice, onCreate }: { notice: string; onCreate: () => void }) {
  return (
    <header className="overflow-hidden rounded-[2rem] border border-primary/20 bg-card shadow-sm">
      <div className="grid gap-6 p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <Badge className="bg-primary text-primary-foreground">DEMO ONLY — NOT LIVE</Badge>
          <h1 className="mt-4 font-serif text-3xl font-bold tracking-tight sm:text-4xl">Scratch & Win Campaigns</h1>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Manage beginner-friendly local campaign drafts for the Royalty Scratch & Win add-on. These demos do not publish campaigns, issue vouchers, or connect to Royalty Stamp production systems.
          </p>
          <p className="mt-3 rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">{notice}</p>
        </div>
        <Button type="button" size="lg" onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Create Campaign
        </Button>
      </div>
    </header>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 font-serif text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function CampaignCard({ campaign, onEdit, onPreview, onDuplicate, onArchive, onDelete, onStatusChange }: {
  campaign: ManagedScratchCampaign;
  onEdit: () => void;
  onPreview: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
  onStatusChange: (status: ManagedCampaignStatus) => void;
}) {
  const totalQuantity = campaign.prizes.reduce((total, prize) => total + Math.max(0, prize.quantity), 0);

  return (
    <Card className="overflow-hidden border-primary/10">
      <div className="h-2" style={{ background: campaign.gradient }} />
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="font-serif text-2xl">{campaign.campaignName}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{campaign.customerTitle}</p>
          </div>
          <Badge variant={campaign.status === "Archived" ? "outline" : "default"}>{campaign.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{campaign.description}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <MiniMetric label="Fictional prizes" value={String(campaign.prizes.length)} />
          <MiniMetric label="Demo quantity" value={String(totalQuantity)} />
          <MiniMetric label="Theme" value={campaign.visualTone} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor={`${campaign.id}-status`}>Local demo status</Label>
            <select
              id={`${campaign.id}-status`}
              value={campaign.status}
              onChange={(event) => onStatusChange(event.target.value as ManagedCampaignStatus)}
              className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="Draft">Draft</option>
              <option value="Demo Active">Demo Active</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
          <div className="rounded-2xl bg-muted/50 p-3 text-sm">
            <p className="text-muted-foreground">Schedule</p>
            <p className="font-medium">{campaign.startDate || "No start"} → {campaign.endDate || "No end"}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={onEdit} variant="outline"><Pencil className="mr-2 h-4 w-4" aria-hidden="true" />Edit</Button>
          <Button type="button" onClick={onPreview}><Eye className="mr-2 h-4 w-4" aria-hidden="true" />Preview</Button>
          <Button type="button" onClick={onDuplicate} variant="outline"><Copy className="mr-2 h-4 w-4" aria-hidden="true" />Duplicate</Button>
          <Button type="button" onClick={onArchive} variant="outline"><Archive className="mr-2 h-4 w-4" aria-hidden="true" />Archive</Button>
          <Button type="button" onClick={onDelete} variant="outline"><Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />Delete</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}