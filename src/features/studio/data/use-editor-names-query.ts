import { useQuery } from '@tanstack/react-query';

import { editorKeys } from './editor-keys';
import { fetchEditorNames } from './editor-names';

export function useEditorNamesQuery(isEnabled = true) {
  return useQuery({ queryKey: editorKeys.names(), queryFn: fetchEditorNames, enabled: isEnabled });
}
