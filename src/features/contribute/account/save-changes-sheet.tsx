import { Button } from '@/design-system/primitives/button';

interface SaveChangesSheetProps {
  /** The form Save changes sends. */
  formId: string;
  isBusy: boolean;
  /** Why the last save did not go through, or null. */
  error: string | null;
  /** Whether Save changes can go out yet: a bot check still on its way holds it. */
  canSave?: boolean;
  onCancel: () => void;
}

/**
 * The sheet that rises once something on the screen is changed (Figma 4540:4385): Save changes,
 * which sends the form, and Cancel. It stands at the foot of the screen, over what scrolls.
 */
export function SaveChangesSheet({
  formId,
  isBusy,
  error,
  canSave = true,
  onCancel,
}: SaveChangesSheetProps) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-4xl bg-surface px-5 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-bottom-sheet-top-shadow">
      {error && (
        <p role="alert" className="text-center text-sm/5 text-content-error">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-1 *:w-full">
        <Button
          type="submit"
          form={formId}
          variant="primary"
          label={isBusy ? 'Saving…' : 'Save changes'}
          disabled={isBusy || !canSave}
        />
        <Button variant="plain" label="Cancel" disabled={isBusy} onClick={onCancel} />
      </div>
    </div>
  );
}
