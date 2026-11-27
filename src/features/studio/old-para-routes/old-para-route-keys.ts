export const oldParaRouteKeys = {
  all: ['studio-old-para-routes'] as const,
  index: () => [...oldParaRouteKeys.all, 'index'] as const,
  route: (paraId: string) => [...oldParaRouteKeys.all, 'route', paraId] as const,
};
