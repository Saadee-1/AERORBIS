"use client";

import { useState, useEffect } from "react";
import { Material } from "./types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface AddMaterialDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (material: Material) => void;
  existingMaterials: Material[];
}

const CATEGORIES = [
  "Metal",
  "Superalloy",
  "Composite",
  "Polymer",
  "Foam",
  "Ceramic",
  "Fluid",
  "Wood",
  "Coating",
  "Other",
];

const AddMaterialDialog = ({
  isOpen,
  onClose,
  onAdd,
  existingMaterials,
}: AddMaterialDialogProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    density: "",
    description: "",
  });
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when dialog closes
      setFormData({ name: "", category: "", density: "", description: "" });
      setErrors([]);
    }
  }, [isOpen]);

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.name.trim()) {
      newErrors.push("Material name is required");
    }

    if (!formData.category) {
      newErrors.push("Category is required");
    }

    const density = parseFloat(formData.density);
    if (!formData.density || isNaN(density) || density <= 0) {
      newErrors.push("Density must be a positive number (in kg/m³)");
    }

    // Check for duplicate names
    const isDuplicate = existingMaterials.some(
      (m) => m.name.toLowerCase() === formData.name.trim().toLowerCase()
    );
    if (isDuplicate) {
      newErrors.push("A material with this name already exists");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    const material: Material = {
      name: formData.name.trim(),
      category: formData.category,
      density: parseFloat(formData.density),
      description: formData.description.trim() || "Custom user-added material",
    };

    onAdd(material);
    toast({
      title: "Material Added",
      description: `${material.name} has been added to the database`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-cyan-400/20 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white flex items-center gap-2">
            <Plus className="w-6 h-6 text-cyan-400" />
            Add Custom Material
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Add your own material to the database. Density must be in kg/m³.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {errors.length > 0 && (
            <Alert variant="destructive" className="bg-red-400/10 border-red-400/30">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-400">
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-300">
              Material Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-slate-900/50 border-cyan-400/30 text-white"
              placeholder="e.g., Custom Alloy X"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category" className="text-gray-300">
              Category *
            </Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger className="bg-slate-900/50 border-cyan-400/30 text-white">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="density" className="text-gray-300">
              Density (kg/m³) *
            </Label>
            <Input
              id="density"
              type="number"
              step="0.01"
              value={formData.density}
              onChange={(e) => setFormData({ ...formData, density: e.target.value })}
              className="bg-slate-900/50 border-cyan-400/30 text-white"
              placeholder="e.g., 2700"
            />
            <p className="text-xs text-gray-500">
              Enter density in SI units (kg/m³). Imperial conversion will be automatic.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-300">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-slate-900/50 border-cyan-400/30 text-white"
              placeholder="Optional description of the material..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            className="border-cyan-400/40 text-cyan-400 hover:bg-cyan-400/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-900 font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Material
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddMaterialDialog;

