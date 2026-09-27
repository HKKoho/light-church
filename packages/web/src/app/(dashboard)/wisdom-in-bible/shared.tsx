'use client';

import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useWisdomT } from './messages';

export { ErrorBanner, Field, errorMessage } from '../church-website/shared';

export function DeleteButton({
  name,
  body,
  label,
  onConfirm,
}: {
  name: string;
  body: string;
  /** Show a text button instead of an icon. */
  label?: string;
  onConfirm: () => void;
}) {
  const t = useWisdomT();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {label ? (
          <Button variant="outline" className="text-destructive">
            <Trash2 className="size-4" />
            {label}
          </Button>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="text-muted-foreground hover:text-destructive"
            aria-label={`${t.delete} ${name}`}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.deleteConfirm(name)}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{t.delete}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
