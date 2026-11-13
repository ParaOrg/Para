import { lazyPlugin } from '../native-bridge/native-app';
import { PLUGIN_NAMES } from '../native-bridge/native-contract';

interface ShareImagePlugin {
  share(options: { base64: string; fileName: string; title: string }): Promise<void>;
}

const plugin = lazyPlugin<ShareImagePlugin>(PLUGIN_NAMES.shareImage);

/** The picture's bytes as base64, without the `data:image/png;base64,` in front. */
export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let text = '';
  // In pieces: one String.fromCharCode call with every byte overflows the stack on a big picture.
  for (let at = 0; at < bytes.length; at += 0x8000) {
    text += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  }
  return btoa(text);
}

/** Opens Android's share sheet on a PNG (ShareImagePlugin.java). Rejects if it could not. */
export async function shareNativeImage(blob: Blob, fileName: string, title: string): Promise<void> {
  await plugin().share({ base64: await blobToBase64(blob), fileName, title });
}
