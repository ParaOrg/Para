import { PublicViewContent } from './public-view-content';
import { STUDIO_DRAFTS } from '../data/flags';
import { MapPlaceholder } from '../maps/map-placeholder';

/** The actual published map, read-only. */
export function StudioPublicView({
  hasLine,
  onOpenPlayground,
}: {
  hasLine: boolean;
  onOpenPlayground: () => void;
}) {
  if (!STUDIO_DRAFTS)
    return <MapPlaceholder map="public" hasLine={hasLine} onOpenPlayground={onOpenPlayground} />;
  return <PublicViewContent />;
}
