import React from 'react';
import { Button } from './button';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Input } from './input';
import { Label } from './label';

interface WorkspaceDialogNameProps
  extends React.ComponentProps<typeof DialogContent> {
  name: string;
  onChangeName: (name: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}

export function WorkspaceDialogName({
  name,
  onChangeName,
  onSubmit,
  onBack,
  ...props
}: WorkspaceDialogNameProps) {
  return (
    <DialogContent {...props}>
      <DialogHeader>
        <DialogTitle>Enter Workspace Name</DialogTitle>
        <DialogDescription>
          Please enter a name for your workspace.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="workspaceName" className="text-right">
            Name
          </Label>
          <Input
            id="workspaceName"
            value={name}
            onChange={(e) => onChangeName(e.target.value)}
            className="col-span-3"
          />
        </div>
      </div>
      <DialogFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="submit" onClick={onSubmit}>
          Submit
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
