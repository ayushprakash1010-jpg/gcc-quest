"use client";

import { useEffect, useState } from "react";
import apiClient from "@/lib/api/api-client";
import {
  Plus,
  Search,
  RefreshCw,
  Activity,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// LOW-05: Strict TypeScript interface instead of any
interface Source {
  id: string;
  name: string;
  url: string;
  status: string;
  type: string;
  category: string;
  compositeScore: number;
  totalArticles: number;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); // MED-02: Search state
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newSource, setNewSource] = useState({
    name: "",
    url: "",
    type: "RSS",
    category: "RESEARCH",
  });
  const [sourceToDelete, setSourceToDelete] = useState<string | null>(null);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/sources");
      setSources(res.data.items || res.data);
    } catch (error) {
      console.error("Failed to fetch sources", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSources();
  }, []);

  const handleCrawl = async (id: string) => {
    try {
      await apiClient.post(`/sources/${id}/crawl`);
      toast.success("Crawl triggered successfully!"); // MED-01: Use toast instead of alert
    } catch (error) {
      console.error("Failed to trigger crawl", error);
      toast.error("Failed to trigger crawl."); // MED-01: Use toast instead of alert
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
      await apiClient.put(`/sources/${id}`, { status: newStatus });
      toast.success(`Source marked as ${newStatus}`);
      fetchSources();
    } catch (error) {
      console.error("Failed to update status", error);
      toast.error("Failed to update status.");
    }
  };

  const handleDeleteSource = async () => {
    if (!sourceToDelete) return;
    try {
      await apiClient.delete(`/sources/${sourceToDelete}`);
      toast.success("Source deleted successfully.");
      setSourceToDelete(null);
      fetchSources();
    } catch (error) {
      console.error("Failed to delete source", error);
      toast.error("Failed to delete source.");
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.name || !newSource.url) {
      toast.error("Name and URL are required.");
      return;
    }

    setAddLoading(true);
    try {
      await apiClient.post("/sources", newSource);
      toast.success("Source added successfully!");
      setIsAddDialogOpen(false);
      setNewSource({ name: "", url: "", type: "RSS", category: "RESEARCH" });
      fetchSources();
    } catch (error) {
      console.error("Failed to add source", error);
      toast.error("Failed to add source.");
    } finally {
      setAddLoading(false);
    }
  };

  // MED-02: Filter logic
  const filteredSources = sources.filter(
    (source) =>
      source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.url.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Sources Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your RSS and Web sources for GCC discovery.
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger
            render={<Button className="bg-primary hover:bg-primary/90" />}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Source
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleAddSource}>
              <DialogHeader>
                <DialogTitle>Add New Source</DialogTitle>
                <DialogDescription>
                  Add a new web or RSS source to feed into the content engine.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newSource.name}
                    onChange={(e) =>
                      setNewSource({ ...newSource, name: e.target.value })
                    }
                    className="col-span-3"
                    placeholder="e.g. Google AI Blog"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="url" className="text-right">
                    URL
                  </Label>
                  <Input
                    id="url"
                    value={newSource.url}
                    onChange={(e) =>
                      setNewSource({ ...newSource, url: e.target.value })
                    }
                    className="col-span-3"
                    placeholder="https://..."
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Type</Label>
                  <Select
                    value={newSource.type}
                    onValueChange={(val) =>
                      setNewSource({ ...newSource, type: val as string })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RSS">RSS Feed</SelectItem>
                      <SelectItem value="WEB">Web Page</SelectItem>
                      <SelectItem value="SITEMAP">Sitemap</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Category</Label>
                  <Select
                    value={newSource.category}
                    onValueChange={(val) =>
                      setNewSource({ ...newSource, category: val as string })
                    }
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RESEARCH">Research</SelectItem>
                      <SelectItem value="NEWS">News</SelectItem>
                      <SelectItem value="COMPANY_BLOG">Company Blog</SelectItem>
                      <SelectItem value="GOVERNMENT">Government</SelectItem>
                      <SelectItem value="EVENT">Event</SelectItem>
                      <SelectItem value="SOCIAL">Social</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={addLoading}>
                  {addLoading ? "Adding..." : "Add Source"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search sources..."
            className="pl-8 bg-zinc-900 border-zinc-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="secondary"
          onClick={fetchSources}
          aria-label="Refresh sources"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-white">Loading sources...</p>
        ) : filteredSources.length === 0 ? (
          <p className="text-muted-foreground">No sources found.</p>
        ) : (
          filteredSources.map((source) => (
            <Card key={source.id} className="bg-zinc-900 border-zinc-800">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-white">
                      {source.name}
                    </CardTitle>
                    <CardDescription className="truncate max-w-[200px]">
                      {source.url}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      onClick={() =>
                        handleToggleStatus(source.id, source.status)
                      }
                      variant={
                        source.status === "ACTIVE" ? "default" : "destructive"
                      }
                      className={`cursor-pointer transition-colors ${
                        source.status === "ACTIVE"
                          ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
                          : "hover:bg-destructive/80"
                      }`}
                    >
                      {source.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive h-6 w-6"
                      onClick={() => setSourceToDelete(source.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm text-zinc-400 mb-4">
                  <div className="flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    {source.type}
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    {source.category}
                  </div>
                  <div>
                    Score:{" "}
                    <span className="font-bold text-white">
                      {source.compositeScore}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                  <span className="text-xs text-muted-foreground">
                    Articles: {source.totalArticles}
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCrawl(source.id)}
                  >
                    Crawl Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog
        open={!!sourceToDelete}
        onOpenChange={(open) => !open && setSourceToDelete(null)}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Source</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this source? This action cannot be
              undone and will permanently remove this source and all its related
              analytics data.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="secondary" onClick={() => setSourceToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteSource}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
