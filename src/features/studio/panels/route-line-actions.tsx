import { Button } from '@/design-system/primitives/button';

import { MenuButton } from './menu-button';
import { EditIcon, ExportIcon, MoreIcon } from './route-line-icons';
import type { useRouteExport } from './use-route-export';
import { EXPORT_FORMATS, type ExportFormat } from '../data/route-export';

interface RouteLineActionsProps {
  /** The route's export, both ways (useRouteExport): its menu, what is on its way, a failure. */
  exporter: ReturnType<typeof useRouteExport>;
  /** Edit Route; absent where the route can only be looked at. */
  onEdit?: () => void;
  /** Extend, a new route from part of this line; absent on a loop and where read-only. */
  onExtend?: () => void;
  /** Delete, the ⋮ menu's one choice; absent where read-only. */
  onDelete?: () => void;
}

const DELETE = 'delete';

const isExportFormat = (id: string): id is ExportFormat =>
  EXPORT_FORMATS.some(({ format }) => format === id);

/**
 * The route line detail's actions (4905:28656): Edit Route and Extend, Secondary at Small, at the
 * left; Export's menu and the ⋮ menu at the right. Read-only, Export alone. While a file is made
 * it says so; a failed one says what happened, a placeholder until the owner draws it.
 */
export function RouteLineActions({ exporter, onEdit, onExtend, onDelete }: RouteLineActionsProps) {
  const { busyFormat, problem, exportAs } = exporter;
  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {onEdit && (
            <Button
              variant="secondary"
              size="small"
              label="Edit Route"
              firstIcon={<EditIcon />}
              onClick={onEdit}
            />
          )}
          {onExtend && (
            <Button
              variant="secondary"
              size="small"
              label="Extend"
              title="Start a new route from part of this line"
              onClick={onExtend}
            />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <MenuButton
            label="Export"
            icon={<ExportIcon />}
            variant="special"
            disabled={busyFormat !== null}
            choices={EXPORT_FORMATS.map(({ format, label }) => ({ id: format, label }))}
            onChoose={(id) => {
              if (isExportFormat(id)) void exportAs(id);
            }}
          />
          {onDelete && (
            <MenuButton
              label="More"
              icon={<MoreIcon />}
              variant="plain"
              choices={[{ id: DELETE, label: 'Delete', isDestructive: true }]}
              onChoose={onDelete}
            />
          )}
        </div>
      </div>
      <p role="status" className="text-sm/5 text-content-tertiary empty:hidden">
        {busyFormat && 'Exporting both ways…'}
      </p>
      {problem && (
        <p role="alert" className="text-sm/5 text-content-error">
          {problem}
        </p>
      )}
    </div>
  );
}
