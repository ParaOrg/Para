// PROBE (draft, never merged): Playwright's own protocol log (DEBUG=pw:protocol), cut to the
// commands that change input or emulation, each with the time it was sent. Imported first, so the
// variable is set before Playwright loads.
process.env.DEBUG = [process.env.DEBUG, 'pw:protocol'].filter(Boolean).join(',');
const KEEP =
  /"method":"(Emulation\.[^"]*|Input\.[^"]*|Page\.(setTouchEmulationEnabled|setDeviceMetricsOverride|bringToFront|setLifecycleEventsEnabled)|Target\.[^"]*|Browser\.[^"]*|Overlay\.[^"]*)"/;
const write = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk, ...rest) => {
  const text = String(chunk);
  if (!text.includes('pw:protocol')) return write(chunk, ...rest);
  for (const line of text.split('\n')) {
    if (!line.includes('SEND') || !KEEP.test(line)) continue;
    const method = /"method":"([^"]+)"/.exec(line)?.[1];
    const params = /"params":(\{.*\})/.exec(line)?.[1]?.slice(0, 220) ?? '';
    write(`PROTO ${Date.now()} ${method} ${params}\n`);
  }
  return true;
};
